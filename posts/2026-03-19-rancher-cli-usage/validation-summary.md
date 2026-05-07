# Validation Summary: How to Use the Rancher CLI

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher CLI
- Rancher Manager
- Kubernetes
- kubectl
- Bash scripting

## Sources Consulted
- Rancher CLI overview: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cli-with-rancher
- Rancher CLI reference (archived): https://ranchermanager.docs.rancher.com/v2.8/reference-guides/cli-with-rancher/rancher-cli
- kubectl utility docs: https://ranchermanager.docs.rancher.com/v2.10/reference-guides/cli-with-rancher/kubectl-utility
- Using API Tokens: https://ranchermanager.docs.rancher.com/api/api-tokens
- Rancher CLI repository: https://github.com/rancher/cli
- Rancher CLI v2.14.1 release: https://github.com/rancher/cli/releases/tag/v2.14.1
- Official Rancher CLI `v2.14.1` help output verified locally from the release binary (`rancher --help`, `rancher login --help`, `rancher context --help`, `rancher clusters --help`, `rancher projects --help`, `rancher namespaces --help`, `rancher token --help`)

## Issues Found
- The login example used `--skip-verify`, but the current `rancher login` command supports `--cacert` instead. I replaced the example with a valid `--cacert` invocation.
- The context-switch example used `rancher context switch --project ...`, but the current command takes the target project as a positional argument. I corrected the example.
- The project-switch example used `rancher project switch`, which is not a valid command. I replaced it with `rancher context switch`.
- The cluster inspection example used `rancher clusters inspect`, which is not a valid subcommand. I replaced it with `rancher inspect --type cluster`.
- The namespace move example used an invalid-looking destination project identifier. I updated it to a valid Rancher project ID format.
- The `catalog`, `apps`, and `multiclusterapps` sections documented legacy command groups that are not present in the current Rancher CLI. I replaced those sections with accurate notes instead of leaving broken commands in place.
- The token section documented `tokens ls/create/delete`, but the current CLI exposes `token` for kubeconfig authentication and cache cleanup, not Rancher API key lifecycle management. I rewrote the section accordingly.
- The `rancher kubectl` explanation overstated how the command works. I corrected the text to reflect that Rancher CLI runs the local `kubectl` binary using generated and cached kubeconfig for the current context.
- The scripting examples used unsupported flags such as `rancher context switch --cluster` and `rancher kubectl --cluster`. I rewrote them to use `rancher clusters kubeconfig` plus `kubectl`, which is valid with the current CLI.
- The shell-completion examples used a `completion` command that is not available in current Rancher CLI releases. I replaced that section with valid built-in help examples.
- The environment-variable examples used unsupported variables (`RANCHER_URL`, `RANCHER_TOKEN`, `RANCHER_SKIP_VERIFY`). I replaced them with supported variables (`RANCHER_CONFIG_DIR`, `CATTLE_OAUTH_AUTH_FLOW`).
- The summary and description implied broader CLI coverage than the current tool actually provides. I narrowed those claims to match current functionality.

## Review Notes
- Current Rancher documentation for the CLI is relatively high-level. Archived Rancher v2.8 docs still describe legacy command groups that no longer appear in the current CLI binary.
- Modern Rancher application delivery workflows are typically handled through the Rancher UI, Helm, or Fleet rather than the old `apps` or `multiclusterapps` CLI commands.
