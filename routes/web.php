<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
Route::get('/brand/voxa.svg', function () {
    return response()->file(resource_path('views/components/voxa.svg'), [
        'Content-Type' => 'image/svg+xml',
        'Cache-Control' => 'public, max-age=86400',
    ]);
})->name('brand.logo');

Route::get('/', function () {
    return redirect()->route(auth()->check() ? 'chat.index' : 'login');
});

Route::get('/dashboard', function () {
    return redirect()->route('chat.index');
})->middleware('auth')->name('dashboard');

Route::redirect('/chatify', '/chat')->middleware('auth');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
