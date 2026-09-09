<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'avatar' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048', 'dimensions:max_width=2048,max_height=2048'],
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class)->ignore($this->user()->id),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'avatar.image' => 'Selecione uma imagem válida.',
            'avatar.mimes' => 'Use uma imagem JPG, PNG ou WebP.',
            'avatar.max' => 'A foto deve ter no máximo 2 MB.',
            'avatar.dimensions' => 'A foto deve ter no máximo 2048 × 2048 pixels.',
            'avatar.uploaded' => 'Não foi possível enviar a foto. Verifique o arquivo e o limite de 2 MB.',
        ];
    }
}
