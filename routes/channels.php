<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;
Broadcast::channel('chatify.{userId}', function (User $user, string $userId) {
    return (string) $user->id === $userId;
});
