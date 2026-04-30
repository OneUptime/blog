# Validation Summary: How to Install OpenTofu on Arch Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Arch Linux
- pacman
- AUR
- yay
- paru
- HCL

## Sources Consulted
- OpenTofu install documentation: https://opentofu.org/docs/intro/install/
- OpenTofu standalone install documentation: https://opentofu.org/docs/intro/install/standalone/
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/commands/
- OpenTofu language settings documentation: https://opentofu.org/docs/language/settings/
- Arch Linux package database for `opentofu`: https://archlinux.org/packages/extra/x86_64/opentofu/
- Arch Linux `opentofu` file list: https://archlinux.org/packages/extra/x86_64/opentofu/files/
- Arch Linux `pacman(8)` manual: https://man.archlinux.org/man/pacman.8.en
- Arch Linux `makepkg(8)` manual: https://man.archlinux.org/man/makepkg.8.en
- AUR RPC metadata for `opentofu-bin`: https://aur.archlinux.org/rpc/?v=5&type=info&arg[]=opentofu-bin
- OpenTofu GitHub latest release metadata: https://api.github.com/repos/opentofu/opentofu/releases/latest

## Issues Found
- The official repository section referenced the `community` repo as a fallback. I removed that guidance because `opentofu` is available in Arch's `extra` repository, and `community` is not the correct current repository reference here.
- The standalone binary example pinned `TOFU_VERSION="1.9.0"`. I updated it to `1.11.6` to match the latest upstream OpenTofu release as of 2026-04-30 and the current `opentofu-bin` AUR package version.
- The verification section expected `/usr/bin/opentofu`, which is incorrect on Arch. I changed it to `/usr/bin/tofu`, matching the Arch package file list and the upstream CLI command name.
- The fish completion command `tofu completion fish` was incorrect. I removed it because current OpenTofu does not provide a `completion` subcommand, and the official built-in autocomplete documentation covers bash and zsh only.

## Review Notes
- As of 2026-04-30, Arch's `extra` repository lists `opentofu 1.11.6-1`.
- The quick-test HCL example is valid with current OpenTofu and successfully runs `tofu init` and `tofu apply -auto-approve` without requiring any providers.
- The standalone zip install method works as shown after updating the version, but the official installer script also supports integrity verification and may be worth mentioning in a future refresh.
