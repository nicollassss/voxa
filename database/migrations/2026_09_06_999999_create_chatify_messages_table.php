<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateChatifyMessagesTable extends Migration
{
    public function up()
    {
        Schema::create('ch_messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('from_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('to_id')->constrained('users')->cascadeOnDelete();
            $table->uuid('client_id')->nullable();
            $table->string('body', 5000)->nullable();
            $table->string('attachment')->nullable();
            $table->boolean('seen')->default(false);
            $table->timestamps();
            $table->unique(['from_id', 'client_id']);
            $table->index(['from_id', 'to_id', 'created_at', 'id'], 'messages_conversation_history');
        });
    }
    public function down()
    {
        Schema::dropIfExists('ch_messages');
    }
}
