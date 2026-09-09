<?php
$pdo = new PDO('mysql:host=127.0.0.1;port=3307', 'root', '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$pdo->exec('CREATE DATABASE IF NOT EXISTS chatweb3ams CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
echo "Banco chatweb3ams disponível em 127.0.0.1:3307.\n";
