<?php

namespace App\Http\Controllers;

use App\Events\MessageSent;
use App\Http\Requests\SendMessageRequest;
use App\Models\ChMessage;
use App\Models\User;
use Illuminate\Broadcasting\BroadcastException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;

class ChatController extends Controller
// o gerenciamento do chat ta aqui
{
    public function index(Request $request): View
    //interface do chat e config do websocket
    {$driver = config('broadcasting.default');
        $connection = config('broadcasting.connections.'.$driver, []);
        return view('chat.index', [
            'chatUser' => $request->user()->only(['id', 'name', 'avatar_url']),
            'websocket' => [
                'broadcaster' => $driver,
                'key' => $connection['key'] ?? '',
                'cluster' => $connection['options']['cluster'] ?? 'us2',
                'host' => $connection['options']['host'] ?? '127.0.0.1',
                'port' => (int) ($connection['options']['port'] ?? 8080),
                'tls' => ($connection['options']['scheme'] ?? 'http') === 'https',
            ],  ]); }
    public function users(Request $request): JsonResponse
    { return response()->json(['users' => User::query()
    ->where('id', '!=', $request->user()->id)
     ->orderBy('name')->get(['id', 'name', 'avatar'])->map->only(['id', 'name', 'avatar_url'])]);
    }
    //lista de users pra conversa, exceto voce mesmo

//retorna o historico da conversa entre dois users, paginado pelo cursor
    public function history(Request $request, User $user): JsonResponse
    {
        abort_if($user->is($request->user()), 403);
        $request->validate(['cursor' => ['nullable', 'string', 'max:1000']]);
        $page = ChMessage::between($request->user()->id, $user->id)
            ->select('ch_messages.*')->selectRaw('created_at as sent_at_cursor')
            ->with(['sender:id,name,avatar', 'recipient:id,name,avatar'])
            ->orderByDesc('sent_at_cursor')->orderByDesc('id')
            ->cursorPaginate(50);
        return response()->json([
            'messages' => $page->getCollection()->map->toChatPayload()->reverse()->values(),
            'next_cursor' => $page->nextCursor()?->encode(),
        ]);  }

//valida e armazena a msg transmitindo o evento de broadcast com tratamento de erro
    public function store(SendMessageRequest $request): JsonResponse
    {
        $data = $request->validated();
        $message = DB::transaction(function () use ($request, $data) {
            //mesmo que a msg seja transmitida, o primeiro registro do db conta como a enviada
            $message = ChMessage::firstOrCreate([
                'from_id' => $request->user()->id,
                'client_id' => $data['client_id'],
            ], [
                'to_id' => $data['to_id'],
                'body' => $data['body'],
            ]);

            abort_if((int) $message->to_id !== (int) $data['to_id'] || $message->body !== $data['body'],
                409, 'Esta tentativa já corresponde a outra mensagem.');

            $message->load(['sender:id,name,avatar', 'recipient:id,name,avatar']);
            $event = new MessageSent($message);
            //verif se a msg eh grande demais pra ser transmitida
            $encoded = json_encode([
                'name' => $event->broadcastAs(),
                'channels' => array_map(fn ($channel) => $channel->name, $event->broadcastOn()),
                'data' => json_encode($event->broadcastWith(), JSON_THROW_ON_ERROR),
            ], JSON_THROW_ON_ERROR);

            if (strlen($encoded) > 9000) {
                throw ValidationException::withMessages(['body' => 'A mensagem excede o tamanho de transmissão. Divida o texto em mensagens menores.']);
            }
            return $message;
        });
        try {
            //o registro já foi confirmado no banco quando transmite o evento
            broadcast(new MessageSent($message))->toOthers();
        } catch (BroadcastException $exception) {
            report($exception);

            return response()->json([
                'message' => $message->toChatPayload(),
                'error' => 'Mensagem salva no histórico, mas a transmissão falhou. Tente enviar novamente; ela não será duplicada.',
            ], 503);
        }

        //retorna a mensagem criada
        return response()->json(['message' => $message->toChatPayload()], $message->wasRecentlyCreated ? 201 : 200);
    }
}
