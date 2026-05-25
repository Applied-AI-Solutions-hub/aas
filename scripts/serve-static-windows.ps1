param(
  [string]$Root = "\\wsl.localhost\Ubuntu\home\s1tba\.openclaw\workspace\github-repos\aas\dist",
  [int]$Port = 8787
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $Root)) {
  throw "Static root not found: $Root"
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
$listener.Server.SetSocketOption(
  [System.Net.Sockets.SocketOptionLevel]::Socket,
  [System.Net.Sockets.SocketOptionName]::ReuseAddress,
  $true
)
$listener.Start()
Write-Host "Serving $Root on http://0.0.0.0:$Port/"

function Get-ContentType([string]$Path) {
  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".html" { "text/html; charset=utf-8"; break }
    ".css" { "text/css; charset=utf-8"; break }
    ".js" { "text/javascript; charset=utf-8"; break }
    ".json" { "application/json; charset=utf-8"; break }
    ".svg" { "image/svg+xml"; break }
    ".png" { "image/png"; break }
    ".jpg" { "image/jpeg"; break }
    ".jpeg" { "image/jpeg"; break }
    ".webp" { "image/webp"; break }
    ".ico" { "image/x-icon"; break }
    default { "application/octet-stream" }
  }
}

function Send-Response($Stream, [int]$Status, [string]$Reason, [byte[]]$Body, [string]$ContentType) {
  $header = "HTTP/1.1 $Status $Reason`r`nContent-Length: $($Body.Length)`r`nContent-Type: $ContentType`r`nConnection: close`r`nCache-Control: no-cache`r`n`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($Body.Length -gt 0) {
    $Stream.Write($Body, 0, $Body.Length)
  }
}

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $buffer = New-Object byte[] 8192
      $read = $stream.Read($buffer, 0, $buffer.Length)
      if ($read -le 0) { continue }

      $request = [System.Text.Encoding]::ASCII.GetString($buffer, 0, $read)
      $requestLine = ($request -split "`r?`n")[0]
      $parts = $requestLine -split " "
      if ($parts.Length -lt 2 -or $parts[0] -ne "GET") {
        Send-Response $stream 405 "Method Not Allowed" ([System.Text.Encoding]::UTF8.GetBytes("Method Not Allowed")) "text/plain; charset=utf-8"
        continue
      }

      $rawPath = [System.Uri]::UnescapeDataString(($parts[1] -split "\?")[0])
      if ($rawPath -eq "/") { $rawPath = "/index.html" }
      $relative = $rawPath.TrimStart("/") -replace "/", "\"
      $fullPath = [System.IO.Path]::GetFullPath((Join-Path $Root $relative))
      $rootFull = [System.IO.Path]::GetFullPath($Root)

      if (-not $fullPath.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $fullPath -PathType Leaf)) {
        Send-Response $stream 404 "Not Found" ([System.Text.Encoding]::UTF8.GetBytes("Not Found")) "text/plain; charset=utf-8"
        continue
      }

      $body = [System.IO.File]::ReadAllBytes($fullPath)
      Send-Response $stream 200 "OK" $body (Get-ContentType $fullPath)
    } catch {
      try {
        Send-Response $stream 500 "Internal Server Error" ([System.Text.Encoding]::UTF8.GetBytes("Internal Server Error")) "text/plain; charset=utf-8"
      } catch {}
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
