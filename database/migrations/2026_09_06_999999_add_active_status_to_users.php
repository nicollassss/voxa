<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddActiveStatusToUsers extends Migration
{  
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'active_status')) {
                $table->boolean('active_status')->default(0);
            }
        });
    }
    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('active_status');
        });
    }
}
