<?php

namespace App\Models;

use Chatify\Traits\UUID;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChMessage extends Model
{    use UUID;
    protected $fillable = ['from_id', 'to_id', 'body', 'client_id'];
    protected $dateFormat = 'Y-m-d H:i:s.u';
    protected function casts(): array
    {
        return ['from_id' => 'integer', 'to_id' => 'integer', 'seen' => 'boolean'];
    }
    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'from_id');
    }
    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'to_id');
    }
    public function scopeBetween(Builder $query, int $first, int $second): void
    {
        $query->where(fn (Builder $pair) => $pair
            ->where(fn (Builder $direction) => $direction->where('from_id', $first)->where('to_id', $second))
            ->orWhere(fn (Builder $direction) => $direction->where('from_id', $second)->where('to_id', $first)));
    }
    public function toChatPayload(): array
    {
        return [
            'id' => $this->id,
            'from_id' => $this->from_id,
            'to_id' => $this->to_id,
            'body' => $this->body,
            'created_at' => $this->created_at->toISOString(),
            'sender' => $this->sender->only(['id', 'name', 'avatar_url']),
            'recipient' => $this->recipient->only(['id', 'name', 'avatar_url']),
        ];
    }
}
