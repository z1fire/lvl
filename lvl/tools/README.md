Icon generation helper

This folder contains a small PowerShell helper to generate PNG icons from the existing SVG placeholder. It uses ImageMagick (`magick`) which is available on Windows.

Usage:

1. Install ImageMagick (https://imagemagick.org) and ensure `magick.exe` is on your PATH.
2. From the `lvl` folder run (PowerShell):

   .\tools\generate-icons.ps1 -SvgPath .\icons\icon.svg

This will produce `icon-192.png` and `icon-512.png` inside `lvl/icons/`. Replace the placeholder PNGs in the repo with the generated files and commit.

Notes:
- If you prefer a GUI or another tool, export PNGs from your design tool at 192x192 and 512x512.
- For best PWA results, provide a rounded/filled icon and a maskable icon variant to the manifest (the manifest already marks 512 as maskable).