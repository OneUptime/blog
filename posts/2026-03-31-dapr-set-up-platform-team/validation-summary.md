# Validation Summary: How to Set Up a Dapr Platform Team

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (runtime, CLI, components)
- Kubernetes
- Git (for component change management workflow)

## Sources Consulted
- Dapr CLI reference — `dapr status`: https://docs.dapr.io/reference/cli/dapr-status/
- Dapr CLI reference — `dapr upgrade`: https://docs.dapr.io/reference/cli/dapr-upgrade/
- Dapr CLI overview: https://docs.dapr.io/reference/cli/cli-overview/
- Dapr CLI source code — `pkg/kubernetes/client.go`: https://github.com/dapr/cli/blob/master/pkg/kubernetes/client.go
- GitHub issue on kubeconfig support: https://github.com/dapr/cli/issues/884

## Issues Found
1. **`--kubeconfig` flag used with `dapr status` and `dapr upgrade` is not an officially documented Dapr CLI flag.** The flag exists only as an internal Go `flag` package registration in the CLI source code (`pkg/kubernetes/client.go`), not as a proper Cobra command flag. It does not appear in `dapr status --help` or `dapr upgrade --help` output and is not documented on docs.dapr.io. The supported approach is to use the `KUBECONFIG` environment variable. All commands in the "Runtime Upgrade Process" section were updated to use `KUBECONFIG=<path> dapr <command> -k` instead of `dapr <command> -k --kubeconfig <path>`.

## Review Notes
- The post is primarily organizational guidance (team structure, support tiers, metrics) with a small number of CLI commands. The organizational recommendations are reasonable and align with platform engineering best practices.
- The `dapr upgrade --runtime-version 1.15.0` example uses a specific version number. As of the review date, Dapr 1.15.x is a plausible near-future version. The command syntax is correct per the official docs.
- The `kubectl get pods -n dapr-system` command is correct for verifying Dapr system pods after an upgrade.
- The git workflow commands in the "Component Change Management" section are standard git operations and are correct.
