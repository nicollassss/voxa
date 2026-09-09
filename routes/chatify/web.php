<?php

use App\Http\Controllers\ChatController;
use Illuminate\Support\Facades\Route;

// Rotas publicadas pelo Chatify e adaptadas para o chat acadêmico com Echo.
Route::get('/', [ChatController::class, 'index'])->name('chat.index');
Route::get('/users', [ChatController::class, 'users'])->name('chat.users');
Route::get('/{user}/messages', [ChatController::class, 'history'])->name('chat.history');
Route::post('/messages', [ChatController::class, 'store'])->middleware('throttle:60,1')->name('chat.send');
