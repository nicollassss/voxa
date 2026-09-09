<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;

class ProfileController extends Controller
{
    public function edit(Request $request): View
    {  return view('profile.edit', [    'user' => $request->user(),
        ]);}
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {   $user = $request->user();
        $previousAvatar = $user->storedAvatarPath();
        $newAvatar = null;
        $user->fill($request->safe()->except('avatar'));
        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }
        if ($request->hasFile('avatar')) {
            // Laravel gera um nome aleatório e a extensão a partir do tipo da imagem.
            $newAvatar = $request->file('avatar')->store('users-avatar', 'public');
            if (! $newAvatar) {
                throw ValidationException::withMessages(['avatar' => 'Não foi possível armazenar a foto. Tente novamente.']);
            }
            $user->avatar = basename($newAvatar);
        }
        try {
            $user->save();
        } catch (\Throwable $exception) {
            if ($newAvatar) Storage::disk('public')->delete($newAvatar);
            throw $exception;
        }
        if ($newAvatar && $previousAvatar) Storage::disk('public')->delete($previousAvatar);
        return Redirect::route('profile.edit')->with('status', 'profile-updated');  }
    public function destroy(Request $request): RedirectResponse
    {
        $request->validateWithBag('userDeletion', [
        'password' => ['required', 'current_password'],
        ]);
        $user = $request->user();
        $avatar = $user->storedAvatarPath();
        Auth::logout();
        $user->delete();
        if ($avatar) Storage::disk('public')->delete($avatar);
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return Redirect::to('/');
    }
}


//crud do profike, incluindo update da senha, edit perfil e exclusao
