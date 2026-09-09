param(
    [string]$MySqlDirectory = 'C:\Program Files\MySQL\MySQL Server 9.5',
    [int]$Port = 3307,
    [switch]$Initialize
)

$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$dataDirectory = Join-Path $projectDirectory '.local\mysql'
$serverExecutable = Join-Path $MySqlDirectory 'bin\mysqld.exe'
if (-not (Test-Path -LiteralPath $serverExecutable)) {
    throw 'Informe a pasta do MySQL com -MySqlDirectory.'
}
if ($Initialize -and -not (Test-Path -LiteralPath (Join-Path $dataDirectory 'mysql'))) {
    New-Item -ItemType Directory -Path $dataDirectory -Force | Out-Null
    & $serverExecutable --no-defaults --initialize-insecure "--basedir=$MySqlDirectory" "--datadir=$dataDirectory" --console
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível inicializar o banco local.' }
}
if (-not (Test-Path -LiteralPath (Join-Path $dataDirectory 'mysql'))) {
    throw 'Execute este script com -Initialize na primeira vez.'
}
& $serverExecutable --no-defaults "--basedir=$MySqlDirectory" "--datadir=$dataDirectory" "--port=$Port" --bind-address=127.0.0.1 --mysqlx=OFF --console
