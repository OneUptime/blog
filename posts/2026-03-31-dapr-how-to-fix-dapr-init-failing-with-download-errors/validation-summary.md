# Validation Summary: How to Fix 'dapr init' Failing with Download Errors

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr CLI (`dapr init`, `dapr status`)
- Docker (image pulling, container management)
- Kubernetes (Dapr control plane installation)
- Redis, Zipkin (Dapr default infrastructure)
- curl, openssl (network diagnostics)
- kubectl (Kubernetes pod inspection)

## Sources Consulted
- Dapr CLI reference: https://docs.dapr.io/reference/cli/
- Dapr CLI `dapr init` reference: https://docs.dapr.io/reference/cli/dapr-init/
- Dapr CLI `dapr status` reference: https://docs.dapr.io/reference/cli/dapr-status/
- Dapr self-hosted installation guide: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-with-docker/
- Dapr Kubernetes installation guide: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/

## Issues Found

1. **Misleading description of `--log-as-json` flag (line 27)**: The post described `dapr init --log-as-json` as producing "verbose output." The `--log-as-json` flag only changes the log format to JSON; it does not increase verbosity. Changed the description to "JSON-formatted output for easier diagnosis."

2. **Contradictory advice in Fix 3 - Docker Pull Failures (line 93)**: After instructing the reader to pre-pull Docker images manually, the post then said to run `dapr init --slim`, which skips container setup entirely — making the pre-pull pointless. Changed to `dapr init` (without `--slim`) so the pre-pulled images are actually used.

3. **Incomplete slim mode description (line 107)**: The post said slim mode skips "Redis or Zipkin containers" but omitted that it also skips the placement service and scheduler service. Updated to list all skipped components.

4. **Incorrect self-hosted verification command (lines 181-195)**: The post used `dapr status` for self-hosted verification, but `dapr status` is a Kubernetes-only command (requires `-k`). Changed self-hosted verification to use `docker ps --filter name=dapr_` and updated the expected output to show Docker container format instead of the Kubernetes table format that was incorrectly shown.

## Review Notes
- The Dapr CLI does not have a `--verbose` or `--log-level` flag for increasing diagnostic output during `dapr init`. The `--log-as-json` flag is the closest available option for structured diagnostic output.
- The component YAML example in Fix 4 is correct for Dapr's component spec format.
- The `--image-registry` and `--runtime-version` flags are correctly documented.
- The airgapped environment instructions (retagging from internal registry) are a valid approach.
