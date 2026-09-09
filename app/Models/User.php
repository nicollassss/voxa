<?php

namespace App\Models;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    public function storedAvatarPath(): ?string
    {
        $filename = $this->avatar;
        if (! is_string($filename) || $filename === config('chatify.user_avatar.default')
            || ! preg_match('/\A[a-zA-Z0-9_-]+\.(?:jpe?g|png|webp)\z/', $filename)) {
            return null;
        }

        return 'users-avatar/'.$filename;
    }

    protected function avatarUrl(): Attribute
    {
        return Attribute::get(function () {
            $path = $this->storedAvatarPath();

            return $path && Storage::disk('public')->exists($path)
                ? Storage::disk('public')->url($path)
                : asset('images/avatar-default.svg');
        });
    }

    public function sentMessages(): HasMany
    {
        return $this->hasMany(ChMessage::class, 'from_id');
    }

    public function receivedMessages(): HasMany
    {
        return $this->hasMany(ChMessage::class, 'to_id');
    }
    protected $fillable = [
        'name',
        'email',
        'password',
    ];
    protected $hidden = [
        'password',
        'remember_token',
    ];
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
