# Validation Summary: How to Install talosctl on macOS, Linux, and Windows

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- Talos Linux (`talosctl` CLI)
- Homebrew (macOS package manager)
- Scoop (Windows package manager)
- Chocolatey (Windows package manager)
- AUR / `yay` (Arch Linux)
- Nix / nixpkgs
- WSL2 (Windows Subsystem for Linux)
- PowerShell
- Shell completion (bash, zsh, fish, PowerShell)

## Sources Consulted
- [Official Talos docs - Install talosctl (v1.9)](https://docs.siderolabs.com/talos/v1.9/getting-started/talosctl)
- [siderolabs/homebrew-tap on GitHub](https://github.com/siderolabs/homebrew-tap)
- [Sidero scoop bucket reference (siderolabs/scoop-bucket)](https://github.com/siderolabs/scoop-bucket)
- [Chocolatey community - talosctl package](https://community.chocolatey.org/packages/talosctl)
- [AUR - talosctl-bin](https://aur.archlinux.org/packages/talosctl-bin)
- [nixpkgs - talosctl](https://mynixos.com/nixpkgs/package/talosctl)
- [siderolabs/talos GitHub releases](https://github.com/siderolabs/talos/releases)

## Issues Found
No technical issues found. All installation methods, URLs, package names, and CLI commands were verified against current upstream sources:

- Homebrew tap formula `siderolabs/tap/talosctl` is correct.
- Install script URL `https://talos.dev/install` is the official one-liner installer.
- GitHub release asset naming pattern `talosctl-<os>-<arch>` (e.g. `talosctl-darwin-arm64`, `talosctl-linux-amd64`, `talosctl-windows-amd64.exe`) matches the official release assets.
- Scoop bucket `https://github.com/siderolabs/scoop-bucket.git` and `scoop install talosctl` are correct.
- `choco install talosctl` is the correct Chocolatey command.
- AUR package name `talosctl-bin` is correct.
- `nix-env -iA nixpkgs.talosctl` is the correct nixpkgs attribute path.
- `talosctl version --client`, `talosctl gen config <name> <endpoint> --output-dir <dir>`, and `talosctl completion {bash|zsh|fish|powershell}` are all valid commands.
- PowerShell `Invoke-WebRequest` syntax and `[Environment]::SetEnvironmentVariable(...)` usage are accurate.

## Review Notes
- The Homebrew snippet contains a comment `# Add the Sidero Labs tap` directly above `brew install siderolabs/tap/talosctl`. The fully-qualified formula does implicitly tap the repository, so the command works as written, but a future revision could either remove the comment or precede the install with an explicit `brew tap siderolabs/tap` for clarity.
- The example `talosctl version --client` output shows `Tag: v1.9.x` and `Go version: go1.22.x`. This was the current series at the time of writing; Talos has since progressed to the v1.12/v1.13 line. The output is illustrative, so it is not technically wrong, but the version numbers will look dated to readers landing on the post after the next few releases.
- Arch Linux now also ships `talosctl` in the official `extra` repository (`pacman -S talosctl`), which can be a more stable option than `talosctl-bin` from the AUR. Worth mentioning in a future update.
- Windows users also have `winget` available (`winget install -e --id Sidero.talosctl`), which could be added alongside Scoop and Chocolatey in a future revision.
- The bash completion path `/etc/bash_completion.d/talosctl` is Linux-conventional; on macOS with Homebrew bash, the appropriate path is typically under `$(brew --prefix)/etc/bash_completion.d/`. Not incorrect, just worth flagging for macOS readers.
