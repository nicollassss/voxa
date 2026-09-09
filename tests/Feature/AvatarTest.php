<?php

namespace Tests\Feature;

use App\Events\MessageSent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class AvatarTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    private function photo(string $name = 'foto.png'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, file_get_contents(base_path('tests/Fixtures/avatar.png')));
    }

    public function test_user_without_photo_or_with_missing_file_has_default_avatar(): void
    {
        $user = User::factory()->create();
        $this->assertSame(asset('images/avatar-default.svg'), $user->avatar_url);
        $user->avatar = 'missing.png';
        $this->assertSame(asset('images/avatar-default.svg'), $user->avatar_url);
        $user->avatar = '../../outside.png';
        $this->assertNull($user->storedAvatarPath());
        $this->assertSame(asset('images/avatar-default.svg'), $user->avatar_url);
    }

    public function test_avatar_is_associated_only_with_authenticated_user_and_replaced_safely(): void
    {
        [$user, $other] = User::factory()->count(2)->create();
        $data = ['name' => $user->name, 'email' => $user->email, 'id' => $other->id];
        $this->actingAs($user)->post('/profile', [...$data, '_method' => 'PATCH', 'avatar' => $this->photo('untrusted-name.php.png')])
            ->assertSessionHasNoErrors()->assertRedirect('/profile');
        $first = $user->refresh()->storedAvatarPath();
        Storage::disk('public')->assertExists($first);
        $this->assertNotSame('untrusted-name.php.png', $user->avatar);
        $this->assertSame('avatar.png', $other->refresh()->avatar);

        $this->post('/profile', [...$data, '_method' => 'PATCH', 'avatar' => $this->photo()])->assertSessionHasNoErrors();
        $second = $user->refresh()->storedAvatarPath();
        $this->assertNotSame($first, $second);
        Storage::disk('public')->assertMissing($first);
        Storage::disk('public')->assertExists($second);
        $this->get('/profile')->assertSee($user->avatar_url);

        $this->patch('/profile', $data)->assertSessionHasNoErrors();
        $this->assertSame($second, $user->refresh()->storedAvatarPath());
    }

    public function test_unsafe_or_oversized_upload_does_not_replace_existing_photo(): void
    {
        $user = User::factory()->create();
        $data = ['name' => $user->name, 'email' => $user->email];
        $this->actingAs($user)->patch('/profile', [...$data, 'avatar' => $this->photo()])->assertSessionHasNoErrors();
        $original = $user->refresh()->storedAvatarPath();
        $files = [
            UploadedFile::fake()->createWithContent('fake.jpg', '<?php echo "not an image";'),
            UploadedFile::fake()->createWithContent('unsafe.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
            $this->photo()->size(2049),
            UploadedFile::fake()->createWithContent('too-wide.png', file_get_contents(base_path('tests/Fixtures/oversized-avatar.png'))),
        ];
        foreach ($files as $file) {
            $this->patch('/profile', [...$data, 'avatar' => $file])->assertSessionHasErrors('avatar');
            $this->assertSame($original, $user->refresh()->storedAvatarPath());
        }
        Storage::disk('public')->assertExists($original);
        $this->assertCount(1, Storage::disk('public')->allFiles());
    }

    public function test_failed_validation_keeps_old_photo_and_creates_no_file(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->patch('/profile', ['name' => '', 'email' => $user->email, 'avatar' => $this->photo()])->assertSessionHasErrors('name');
        $this->assertSame('avatar.png', $user->refresh()->avatar);
        $this->assertEmpty(Storage::disk('public')->allFiles());
    }

    public function test_avatar_is_in_contacts_history_and_broadcast_payload(): void
    {
        Event::fake([MessageSent::class]);
        [$sender, $recipient] = User::factory()->count(2)->create();
        $this->actingAs($sender)->patch('/profile', ['name' => $sender->name, 'email' => $sender->email, 'avatar' => $this->photo()])->assertSessionHasNoErrors();
        $url = $sender->refresh()->avatar_url;
        $this->postJson('/chat/messages', ['to_id' => $recipient->id, 'body' => 'Foto no chat', 'client_id' => (string) Str::uuid()])
            ->assertCreated()->assertJsonPath('message.sender.avatar_url', $url);
        Event::assertDispatched(MessageSent::class, fn ($event) => $event->broadcastWith()['message']['sender']['avatar_url'] === $url);
        $this->actingAs($recipient)->getJson('/chat/users')->assertJsonPath('users.0.avatar_url', $url);
        $this->getJson('/chat/'.$sender->id.'/messages')->assertJsonPath('messages.0.sender.avatar_url', $url);
    }

    public function test_deleting_account_removes_its_photo(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->patch('/profile', ['name' => $user->name, 'email' => $user->email, 'avatar' => $this->photo()])->assertSessionHasNoErrors();
        $path = $user->refresh()->storedAvatarPath();
        $this->delete('/profile', ['password' => 'password'])->assertSessionHasNoErrors();
        Storage::disk('public')->assertMissing($path);
    }

    public function test_guest_cannot_upload_and_logo_serves_original_file(): void
    {
        $this->post('/profile', ['_method' => 'PATCH', 'avatar' => $this->photo()])->assertRedirect('/login');
        $this->assertEmpty(Storage::disk('public')->allFiles());
        $response = $this->get('/brand/voxa.svg')->assertOk();
        $this->assertSame(realpath(resource_path('views/components/voxa.svg')), $response->baseResponse->getFile()->getRealPath());
        $this->assertSame('DB8D2C159291ADDF8C77C83B750C0C4BA579196161B1E4DF24BE8C1A90869146', strtoupper(hash_file('sha256', resource_path('views/components/voxa.svg'))));
    }
}
