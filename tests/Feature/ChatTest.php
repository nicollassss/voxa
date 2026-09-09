<?php

namespace Tests\Feature;

use App\Events\MessageSent;
use App\Models\ChMessage;
use App\Models\User;
use Illuminate\Broadcasting\BroadcastException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Tests\TestCase;

class ChatTest extends TestCase
{
    use RefreshDatabase;

    public function test_chat_requires_authentication(): void
    {
        $this->get('/chat')->assertRedirect('/login');
        $this->postJson('/chat/messages', [])->assertUnauthorized();
        $this->getJson('/chat/users')->assertUnauthorized();
    }

    public function test_authenticated_user_can_open_chat_and_list_other_users(): void
    {
        [$alice, $bob] = User::factory()->count(2)->create();
        $this->actingAs($alice)->get('/chat')->assertOk()->assertSee($alice->name)->assertDontSee(config('broadcasting.connections.reverb.secret'));
        $this->getJson('/chat/users')->assertOk()->assertJsonCount(1, 'users')->assertJsonPath('users.0.id', $bob->id)->assertJsonMissingPath('users.0.email');
    }

    public function test_message_is_saved_and_broadcast_only_to_participants(): void
    {
        Event::fake([MessageSent::class]);
        [$alice, $bob, $outsider] = User::factory()->count(3)->create();
        $payload = ['to_id' => $bob->id, 'body' => ' Olá, tudo bem? ', 'client_id' => (string) Str::uuid(), 'from_id' => $outsider->id];

        $response = $this->actingAs($alice)->postJson('/chat/messages', $payload)->assertCreated();
        $response->assertJsonPath('message.from_id', $alice->id)->assertJsonPath('message.body', 'Olá, tudo bem?');
        $this->assertDatabaseHas('ch_messages', ['from_id' => $alice->id, 'to_id' => $bob->id, 'body' => 'Olá, tudo bem?']);

        Event::assertDispatched(MessageSent::class, function ($event) use ($alice, $bob) {
            return array_map(fn ($channel) => $channel->name, $event->broadcastOn()) === [
                'private-chatify.'.$alice->id, 'private-chatify.'.$bob->id,
            ] && $event->broadcastAs() === 'message.sent'
                && $event->broadcastWith()['message']['sender']['id'] === $alice->id;
        });
    }

    public function test_repeated_attempt_does_not_duplicate_message_and_cannot_change_it(): void
    {
        Event::fake([MessageSent::class]);
        [$alice, $bob] = User::factory()->count(2)->create();
        $payload = ['to_id' => $bob->id, 'body' => 'Olá!', 'client_id' => (string) Str::uuid()];
        $id = $this->actingAs($alice)->postJson('/chat/messages', $payload)->assertCreated()->json('message.id');
        $this->postJson('/chat/messages', $payload)->assertOk()->assertJsonPath('message.id', $id);
        $this->postJson('/chat/messages', [...$payload, 'body' => 'Alterada'])->assertConflict();
        $this->assertDatabaseCount('ch_messages', 1);
    }

    public function test_history_contains_only_the_authenticated_users_conversation(): void
    {
        [$alice, $bob, $carol] = User::factory()->count(3)->create();
        ChMessage::create(['from_id' => $alice->id, 'to_id' => $bob->id, 'body' => 'Olá, Bob']);
        ChMessage::create(['from_id' => $bob->id, 'to_id' => $alice->id, 'body' => 'Olá, Alice']);
        ChMessage::create(['from_id' => $bob->id, 'to_id' => $carol->id, 'body' => 'Conversa de Carol']);

        $this->actingAs($alice)->getJson('/chat/'.$bob->id.'/messages')->assertOk()->assertJsonCount(2, 'messages')->assertDontSee('Conversa de Carol');
        $this->actingAs($carol)->getJson('/chat/'.$alice->id.'/messages')->assertOk()->assertJsonCount(0, 'messages');
    }

    public function test_history_has_stable_pagination_without_losing_same_second_messages(): void
    {
        [$alice, $bob] = User::factory()->count(2)->create();
        for ($i = 0; $i < 55; $i++) {
            ChMessage::create(['from_id' => $alice->id, 'to_id' => $bob->id, 'body' => 'Mensagem '.$i]);
        }
        $first = $this->actingAs($bob)->getJson('/chat/'.$alice->id.'/messages')->assertOk()->assertJsonCount(50, 'messages');
        $second = $this->getJson('/chat/'.$alice->id.'/messages?cursor='.urlencode($first->json('next_cursor')))->assertOk()->assertJsonCount(5, 'messages');
        $this->assertCount(55, array_unique([...array_column($first->json('messages'), 'id'), ...array_column($second->json('messages'), 'id')]));
        $second->assertJsonPath('next_cursor', null);
    }

    public function test_invalid_messages_are_rejected_before_persistence(): void
    {
        Event::fake([MessageSent::class]);
        [$alice, $bob] = User::factory()->count(2)->create();
        $payload = ['to_id' => $bob->id, 'body' => 'Olá', 'client_id' => (string) Str::uuid()];
        $this->actingAs($alice);
        foreach (['', '   ', str_repeat('a', 5001), str_repeat('😀', 2000)] as $body) {
            $this->postJson('/chat/messages', [...$payload, 'body' => $body])->assertUnprocessable()->assertJsonValidationErrors('body');
        }
        $this->postJson('/chat/messages', [...$payload, 'to_id' => $alice->id])->assertUnprocessable();
        $this->postJson('/chat/messages', [...$payload, 'to_id' => 9999])->assertUnprocessable();
        $this->assertDatabaseCount('ch_messages', 0);
        Event::assertNotDispatched(MessageSent::class);
    }

    public function test_user_can_authorize_only_their_own_private_channel(): void
    {
        [$alice, $bob] = User::factory()->count(2)->create();
        $this->actingAs($alice)->postJson('/broadcasting/auth', ['socket_id' => '123.456', 'channel_name' => 'private-chatify.'.$alice->id])->assertOk()->assertJsonStructure(['auth']);
        $this->postJson('/broadcasting/auth', ['socket_id' => '123.456', 'channel_name' => 'private-chatify.'.$bob->id])->assertForbidden();
        $this->postJson('/broadcasting/auth', ['socket_id' => '123.456', 'channel_name' => 'private-unknown'])->assertForbidden();
    }

    public function test_broadcast_failure_preserves_message_and_reports_delivery_failure(): void
    {
        [$alice, $bob] = User::factory()->count(2)->create();
        Broadcast::shouldReceive('event')->once()->with(\Mockery::type(MessageSent::class))->andThrow(new BroadcastException('WebSocket indisponível'));
        $this->actingAs($alice)->postJson('/chat/messages', [
            'to_id' => $bob->id, 'body' => 'Mensagem preservada', 'client_id' => (string) Str::uuid(),
        ])->assertStatus(503)->assertJsonPath('message.body', 'Mensagem preservada')->assertJsonStructure(['error']);
        $this->assertDatabaseCount('ch_messages', 1);
    }
}
