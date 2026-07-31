<#
    Temeron — Servidor local para pré-visualização
    ----------------------------------------------------------------------
    Sobe um servidor HTTP simples para você abrir o site no navegador antes
    de publicar. Não precisa de Node, Python ou qualquer instalação: usa só
    o que já vem no Windows.

    Como usar (clique com o botão direito no arquivo > "Executar com o
    PowerShell"), ou pelo terminal:

        powershell -ExecutionPolicy Bypass -File ferramentas\servidor-local.ps1

    Depois abra no navegador:
        http://localhost:8080/admin      -> painel
        http://localhost:8080/p/demo     -> proposta de demonstração

    Para parar: Ctrl+C nesta janela.

    Ele imita as mesmas reescritas de URL que o Netlify vai fazer em
    produção, então o que você vê aqui é o que o cliente vai ver.
#>

[CmdletBinding()]
param(
    [int]$Porta = 8080,
    [string]$Raiz = ''
)

$ErrorActionPreference = 'Stop'

# A raiz é calculada aqui, e não como valor padrão do parâmetro: dentro do
# bloco param() o $PSScriptRoot ainda não está disponível.
if ([string]::IsNullOrWhiteSpace($Raiz)) {
    $pasta = $PSScriptRoot
    if ([string]::IsNullOrWhiteSpace($pasta) -and $MyInvocation.MyCommand.Path) {
        $pasta = Split-Path -Parent $MyInvocation.MyCommand.Path
    }
    if ([string]::IsNullOrWhiteSpace($pasta)) { $pasta = (Get-Location).Path }
    $Raiz = Split-Path -Parent $pasta
}

$Raiz = (Resolve-Path -LiteralPath $Raiz).Path
Write-Host ""
Write-Host "  Temeron - servidor local" -ForegroundColor Yellow
Write-Host "  Pasta: $Raiz"
Write-Host ""

# --- Tipos de conteúdo ---------------------------------------------------
$tipos = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'text/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.svg'  = 'image/svg+xml'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.webp' = 'image/webp'
    '.avif' = 'image/avif'
    '.gif'  = 'image/gif'
    '.ico'  = 'image/x-icon'
    '.woff' = 'font/woff'
    '.woff2'= 'font/woff2'
    '.txt'  = 'text/plain; charset=utf-8'
    '.pdf'  = 'application/pdf'
    '.toml' = 'text/plain; charset=utf-8'
    '.sql'  = 'text/plain; charset=utf-8'
    '.md'   = 'text/markdown; charset=utf-8'
}

# --- Traduz a URL em um arquivo do disco ---------------------------------
# Espelha as regras de netlify.toml. Se mudar lá, mude aqui também.
function Resolver-Caminho {
    param([string]$Url)

    $caminho = $Url.Split('?')[0].Split('#')[0]
    $caminho = [System.Uri]::UnescapeDataString($caminho)

    # Reescritas
    if ($caminho -match '^/p/.+')      { $caminho = '/proposta.html' }
    elseif ($caminho -eq '/p' -or $caminho -eq '/p/') { $caminho = '/proposta.html' }
    elseif ($caminho -match '^/admin/?$')          { $caminho = '/admin/index.html' }
    elseif ($caminho -match '^/admin/editor/?$')   { $caminho = '/admin/editor.html' }
    elseif ($caminho.EndsWith('/'))                { $caminho = $caminho + 'index.html' }

    # Impede sair da pasta do projeto com "../"
    $relativo = $caminho.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
    $completo = [System.IO.Path]::GetFullPath((Join-Path $Raiz $relativo))

    if (-not $completo.StartsWith($Raiz, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $null
    }
    return $completo
}

# --- Escreve uma resposta HTTP -------------------------------------------
function Enviar-Resposta {
    param(
        [System.IO.Stream]$Fluxo,
        [int]$Status,
        [string]$Texto,
        [byte[]]$Corpo,
        [string]$Tipo
    )

    $cabecalho = "HTTP/1.1 $Status $Texto`r`n"
    $cabecalho += "Content-Type: $Tipo`r`n"
    $cabecalho += "Content-Length: $($Corpo.Length)`r`n"
    $cabecalho += "Cache-Control: no-store`r`n"
    $cabecalho += "Connection: close`r`n`r`n"

    $bytesCabecalho = [System.Text.Encoding]::ASCII.GetBytes($cabecalho)
    $Fluxo.Write($bytesCabecalho, 0, $bytesCabecalho.Length)
    if ($Corpo.Length -gt 0) { $Fluxo.Write($Corpo, 0, $Corpo.Length) }
    $Fluxo.Flush()
}

# --- Sobe o socket -------------------------------------------------------
# TcpListener em vez de HttpListener: não exige permissão de administrador.
$ouvinte = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Porta)

try {
    $ouvinte.Start()
} catch {
    Write-Host "  Nao consegui usar a porta $Porta." -ForegroundColor Red
    Write-Host "  Tente outra: .\ferramentas\servidor-local.ps1 -Porta 8090"
    exit 1
}

Write-Host "  No ar em http://localhost:$Porta" -ForegroundColor Green
Write-Host ""
Write-Host "    Painel .............. http://localhost:$Porta/admin"
Write-Host "    Proposta demo ....... http://localhost:$Porta/p/demo"
Write-Host ""
Write-Host "  Ctrl+C para parar."
Write-Host ""

try {
    while ($true) {
        $cliente = $ouvinte.AcceptTcpClient()

        try {
            $fluxo = $cliente.GetStream()
            $fluxo.ReadTimeout = 5000

            # Lê só a primeira linha do pedido: "GET /caminho HTTP/1.1"
            $buffer = New-Object byte[] 4096
            $lidos = $fluxo.Read($buffer, 0, $buffer.Length)
            if ($lidos -le 0) { continue }

            $pedido = [System.Text.Encoding]::ASCII.GetString($buffer, 0, $lidos)
            $primeiraLinha = ($pedido -split "`r`n")[0]
            $partes = $primeiraLinha -split ' '

            if ($partes.Length -lt 2 -or ($partes[0] -ne 'GET' -and $partes[0] -ne 'HEAD')) {
                $corpo = [System.Text.Encoding]::UTF8.GetBytes('Metodo nao suportado')
                Enviar-Resposta $fluxo 405 'Method Not Allowed' $corpo 'text/plain; charset=utf-8'
                continue
            }

            $url = $partes[1]
            $arquivo = Resolver-Caminho $url

            if ($arquivo -and (Test-Path -LiteralPath $arquivo -PathType Leaf)) {
                $extensao = [System.IO.Path]::GetExtension($arquivo).ToLowerInvariant()
                $tipo = $tipos[$extensao]
                if (-not $tipo) { $tipo = 'application/octet-stream' }

                $corpo = [System.IO.File]::ReadAllBytes($arquivo)
                Enviar-Resposta $fluxo 200 'OK' $corpo $tipo
                Write-Host ("  200  " + $url) -ForegroundColor DarkGray
            }
            else {
                $corpo = [System.Text.Encoding]::UTF8.GetBytes(
                    "<h1>404</h1><p>Nao encontrei <code>$url</code> nesta pasta.</p>")
                Enviar-Resposta $fluxo 404 'Not Found' $corpo 'text/html; charset=utf-8'
                Write-Host ("  404  " + $url) -ForegroundColor DarkYellow
            }
        }
        catch {
            Write-Host ("  erro: " + $_.Exception.Message) -ForegroundColor Red
        }
        finally {
            if ($cliente) { $cliente.Close() }
        }
    }
}
finally {
    $ouvinte.Stop()
    Write-Host ""
    Write-Host "  Servidor parado." -ForegroundColor Yellow
}
