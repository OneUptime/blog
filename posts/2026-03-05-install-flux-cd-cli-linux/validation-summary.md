# Validation Summary: How to Install Flux CD CLI on Linux

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Flux CD CLI
- GitOps
- Kubernetes
- Linux shell commands
- Homebrew for Linux
- Arch Linux AUR
- Bash and Zsh shell completion

## Sources Consulted
- Flux official installation documentation: https://fluxcd.io/flux/installation/
- Flux official CLI installation documentation: https://fluxcd.io/flux/cmd/
- Flux official `flux check` command reference: https://fluxcd.io/flux/cmd/flux_check/
- Flux official `flux version` command reference: https://fluxcd.io/flux/cmd/flux_version/
- Flux official `flux logs` command reference: https://fluxcd.io/flux/cmd/flux_logs/
- Flux official `flux export source git` command reference: https://fluxcd.io/flux/cmd/flux_export_source_git/
- Flux official upgrade documentation: https://fluxcd.io/flux/installation/upgrade/
- Flux GitHub releases page: https://github.com/fluxcd/flux2/releases
- Flux install script source: https://raw.githubusercontent.com/fluxcd/flux2/main/install/flux.sh

## Issues Found
- The direct download example pinned `FLUX_VERSION=2.4.0`, which is outdated. Updated it to `2.8.7`, the latest GitHub release available during validation on 2026-05-14.
- The system-wide Bash completion command used `sudo flux completion bash > /etc/bash_completion.d/flux`. The output redirection is performed by the current shell, not by `sudo`, so it can fail for a root-owned completion directory. Changed it to pipe through `sudo tee`.

## Review Notes
The remaining install methods and Flux CLI commands matched official Flux documentation. The post does not include checksum verification for the manual download path; that could be added in the future for stronger supply-chain hygiene, but the current manual download instructions are otherwise consistent with the release asset naming.
