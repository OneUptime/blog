# Validation Summary: How to Install ArgoCD CLI on macOS, Linux, and Windows

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Argo CD CLI
- macOS, Linux, and Windows shell installation
- Homebrew, Arch Linux pacman, Nix, Chocolatey, and Scoop
- Docker / OCI container images
- Bash, Zsh, Fish, and PowerShell completions
- Argo CD CLI contexts, authentication tokens, and environment variables

## Sources Consulted
- Argo CD CLI installation documentation: https://argo-cd.readthedocs.io/en/latest/cli_installation/
- Argo CD CLI command reference for `argocd version`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_version/
- Argo CD CLI command reference for `argocd completion`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_completion/
- Argo CD CLI command reference for `argocd login`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- Argo CD CLI command reference for `argocd context`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_context/
- Argo CD CLI command reference for `argocd account generate-token`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_generate-token/
- Argo CD CLI environment variables documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/environment-variables/
- Argo CD GitHub releases and release assets: https://github.com/argoproj/argo-cd/releases
- Chocolatey `argocd-cli` package page: https://community.chocolatey.org/packages/argocd-cli
- Scoop Main bucket / package index for `argocd`: https://github.com/ScoopInstaller/Main
- Nixpkgs package metadata for `argocd`: https://mynixos.com/nixpkgs/package/argocd

## Issues Found
- The Arch Linux package manager example used the AUR package `argocd-bin` via `yay`. The current official Argo CD installation documentation lists `pacman -S argocd`, so the example was changed to `sudo pacman -S argocd`.
- The examples pinned `v2.13.3`, which is stale for this 2026 post and older than the current Argo CD release line. The example version was updated to `v3.4.2`, matching the latest release identified during review.
- The Docker-based installation used `argoproj/argocd` from Docker Hub. Current Argo CD releases publish the official image under `quay.io/argoproj/argocd`, so the Docker command and alias were updated accordingly.
- The version compatibility sample output used the old `v2.13.3` version. It was updated to `v3.4.2` to stay consistent with the corrected examples.

## Review Notes
Most CLI commands, flags, binary asset names, context handling, completion commands, and environment variables matched the official Argo CD command reference. The Windows manual install example writes to `C:\Windows\System32`, which works only from an elevated shell; a user-local PATH directory would be friendlier in a future rewrite, but the command is technically valid.
