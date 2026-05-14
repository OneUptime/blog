# Validation Summary: How to Install Flux CD CLI on macOS with Homebrew

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux CLI
- GitOps
- Kubernetes
- macOS
- Homebrew
- Shell autocompletion for Zsh and Bash

## Sources Consulted
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux CLI command reference: https://fluxcd.io/flux/cmd/
- Flux bootstrap GitHub command reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux create kustomization command reference: https://fluxcd.io/flux/cmd/flux_create_kustomization/
- Flux export source git command reference: https://fluxcd.io/flux/cmd/flux_export_source_git/
- Homebrew installation documentation: https://docs.brew.sh/Installation
- Homebrew shell completion documentation: https://docs.brew.sh/Shell-Completion
- Homebrew taps documentation: https://docs.brew.sh/Taps
- Homebrew homepage install command: https://brew.sh/

## Issues Found
- The prerequisites listed macOS 10.15 (Catalina) or later without noting Homebrew's current support policy. Updated the section to state that Homebrew officially supports macOS 14 (Sonoma) or later, while macOS 10.15 through 13 are unsupported but may still work.
- The tap setup wording implied that manually running `brew tap fluxcd/tap` is strictly required before installation. Adjusted the wording because the official Flux install command uses the fully qualified formula name `brew install fluxcd/tap/flux`.
- The troubleshooting PATH example wrote Homebrew's shell environment setup to `~/.zshrc`. Updated it to `~/.zprofile`, which aligns with Homebrew's current macOS post-install guidance for Zsh login shells.

## Review Notes
The Flux CLI installation, version check, pre-flight check, completion commands, update command, uninstall command, and common Flux CLI examples are consistent with the current official Flux and Homebrew documentation. Bash completion setup may vary depending on whether the user is using the macOS-provided Bash or a newer Homebrew-installed Bash; Homebrew documents `bash-completion@2` for Homebrew Bash 4 or newer.
