# Helper: generate high-quality PNG icons from the SVG placeholder using ImageMagick (magick.exe)
# Usage: .\generate-icons.ps1 -SvgPath .\icons\icon.svg
param(
  [Parameter(Mandatory=$true)]
  [string] $SvgPath
)

$root = Split-Path -Parent $SvgPath
$iconsDir = Join-Path $root "icons"
if (-not (Test-Path $iconsDir)) { New-Item -ItemType Directory -Path $iconsDir | Out-Null }

$magick = "magick"
# Verify ImageMagick exists
try {
  & $magick -version > $null 2>$null
} catch {
  Write-Error "ImageMagick (magick.exe) not found in PATH. Install it or adjust this script to use another tool."
  exit 1
}

$sizes = @(192,512)
foreach ($s in $sizes) {
  $out = Join-Path $iconsDir "icon-$s.png"
  & $magick convert `"$SvgPath`" -background none -resize ${s}x${s} `"$out`"
  if ($LASTEXITCODE -eq 0) { Write-Output "Wrote $out" } else { Write-Error "Failed to write $out" }
}

Write-Output "Done. Add the generated PNGs to your repo and update manifest if needed."