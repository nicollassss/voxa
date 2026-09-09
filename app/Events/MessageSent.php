<?php

namespace App\Events;

use App\Models\ChMessage;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;
    public function __construct(public ChMessage $message) {}
    public function broadcastOn(): array
    {  return [
            new PrivateChannel('chatify.'.$this->message->from_id),
            new PrivateChannel('chatify.'.$this->message->to_id),
        ];   }
    public function broadcastAs(): string
    {
        return 'message.sent';
    }
    public function broadcastWith(): array
    {
        return ['message' => $this->message->toChatPayload()];
    }
}
