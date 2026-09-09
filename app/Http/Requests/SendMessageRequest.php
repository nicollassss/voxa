<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SendMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->body)) {
            $this->merge(['body' => trim($this->body)]);
        }
    }

    public function rules(): array
    {
        return [
            'to_id' => ['required', 'integer', Rule::exists('users', 'id'), Rule::notIn([$this->user()->id])],
            'body' => ['required', 'string', 'max:5000'],
            'client_id' => ['required', 'uuid'],
        ];
    }

    public function messages(): array
    {
        return [
            'body.required' => 'Escreva uma mensagem.',
            'body.max' => 'A mensagem deve ter no máximo 5.000 caracteres.',
            'to_id.exists' => 'O destinatário não está mais disponível.',
            'to_id.not_in' => 'Selecione outro usuário para conversar.',
        ];
    }
}
