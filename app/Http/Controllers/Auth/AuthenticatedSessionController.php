<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

class AuthenticatedSessionController extends Controller
//controller sessao da autenticacao
{ public function create(): View
    {
        return view('auth.login');
    }
    //pede a auth e redireciona pra dashboard
    public function store(LoginRequest $request): RedirectResponse
    {
    $request->authenticate();
    $request->session()->regenerate();
    return redirect()->intended(route('dashboard', absolute: false));    }
      //destroi a sessao e redireciona pra home
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        //home route

        return redirect('/');
    }}
