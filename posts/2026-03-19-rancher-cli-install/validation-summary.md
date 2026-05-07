# Validation Summary: How to Install and Configure the Rancher CLI

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher CLI
- Rancher Manager / Rancher Server
- Kubernetes
- Homebrew
- GitHub Releases
- Windows PowerShell

## Sources Consulted
- Rancher CLI documentation: https://ranchermanager.docs.rancher.com/v2.8/reference-guides/cli-with-rancher/rancher-cli
- Rancher User Settings documentation: https://ranchermanager.docs.rancher.com/reference-guides/user-settings
- Rancher API Keys documentation: https://ranchermanager.docs.rancher.com/v2.8/reference-guides/user-settings/api-keys
- Official Rancher CLI releases: https://github.com/rancher/cli/releases
- Official Rancher CLI v2.14.1 release page: https://github.com/rancher/cli/releases/tag/v2.14.1
- Official Rancher CLI repository README: https://github.com/rancher/cli/blob/main/README.md
- Homebrew `rancher-cli` formula: https://formulae.brew.sh/formula/rancher-cli
- Arch Linux official package index search: https://archlinux.org/packages/search/json/?q=rancher-cli
- Arch User Repository search: https://aur.archlinux.org/rpc/?v=5&type=search&arg=rancher-cli

## Issues Found
- The Rancher UI download path was outdated. I updated the steps to match the current documented path: menu button, then **About**, then **CLI Downloads**.
- The post described `v2.8.0` artifacts as the latest release. I updated the version-pinned download examples to `v2.14.1`, which is the current stable Rancher CLI release as of 2026-05-07.
- `pacman -S rancher-cli` was incorrect because Rancher CLI is not in the official Arch repositories. I replaced it with an accurate note about the community-maintained AUR package `rancher-cli-bin`.
- The initial login example was incorrect. `rancher login` requires `--token`; it does not prompt for a bearer token interactively. I updated the login examples accordingly.
- `rancher server add` is not a valid CLI command. I replaced the multi-server example with supported `rancher login ... --name ...` commands.
- `--skip-verify` was shown as a valid `rancher login` flag, but current Rancher CLI does not support that flag for login. I replaced that guidance with the supported `--cacert` flow and the documented first-connection prompt behavior.
- The environment variable section implied that `RANCHER_URL`, `RANCHER_TOKEN`, and `RANCHER_SKIP_VERIFY` are native Rancher CLI environment variables. I corrected the section to present them as user-defined shell variables for scripts and removed the unsupported `RANCHER_SKIP_VERIFY` example.
- The shell completion section was incorrect because current Rancher CLI releases do not provide a `completion` subcommand. I replaced the invalid commands with an accurate note.
- The Windows PowerShell PATH example pointed to the wrong directory after ZIP extraction. I updated it to the actual extracted folder `C:\rancher\rancher-v2.14.1`.
- The macOS manual install example mixed architectures in a way that was not directly executable and used a non-`sudo` `chmod` after a `sudo mv`. I corrected both points.
- The verification section described `rancher kubectl get nodes` as a "kubectl proxy" test. I corrected that description to reflect that it tests Kubernetes API access.

## Review Notes
- Version-pinned download examples will need periodic maintenance as Rancher CLI releases advance.
- Downloading the CLI from the Rancher UI remains the safest compatibility path because it matches the CLI to the target Rancher server.
- Rancher UI labels for API key management vary slightly by version (`API & Keys` in current docs and `Account & API Keys` in older v2.8 docs), so wording in this area should stay version-aware.
