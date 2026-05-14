# Validation Summary: How to Install Flux CD CLI on Windows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD CLI
- GitOps
- Kubernetes
- Windows PowerShell
- Chocolatey
- Windows Subsystem for Linux (WSL)

## Sources Consulted
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux CLI installation documentation: https://fluxcd.io/flux/cmd/
- Flux PowerShell completion command reference: https://fluxcd.io/flux/cmd/flux_completion_powershell/
- Flux check command reference: https://fluxcd.io/flux/cmd/flux_check/
- Flux GitHub bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux GitHub releases and latest release API: https://github.com/fluxcd/flux2/releases and https://api.github.com/repos/fluxcd/flux2/releases/latest
- Chocolatey install command documentation: https://docs.chocolatey.org/en-us/choco/commands/install/

## Issues Found
- The manual binary install example pinned Flux to `2.4.0`, which is outdated as of the review date. Updated the example to `2.8.7`, the latest Flux release verified from the official Flux GitHub releases.
- The PowerShell autocompletion example used `command -v`, which is a POSIX shell pattern and not valid for Windows PowerShell. Replaced it with a `Get-Command flux -ErrorAction SilentlyContinue` guard.
- The PowerShell profile creation snippet created the profile file without ensuring the parent directory existed. Added creation of the parent directory with `New-Item -ItemType Directory -Path (Split-Path -Parent $PROFILE) -Force`.
- The manual uninstall PATH cleanup used a broad `*flux*` match that could remove unrelated PATH entries. Narrowed it to remove only the exact `$env:LOCALAPPDATA\flux` entry.
- The tags metadata used `Window` instead of `Windows`. Corrected the tag.

## Review Notes
The Flux CLI installation methods, `choco install flux`, WSL install script, `flux check --pre`, `flux bootstrap github`, `flux get all`, `flux logs`, and `flux reconcile source git flux-system` commands were verified against official Flux documentation and are technically valid.
