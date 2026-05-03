# Validation Summary: How to Deploy Fission on Rancher - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Fission (serverless framework for Kubernetes)
- Rancher / Kubernetes
- Helm
- fission CLI
- Python and NodeJS function runtimes
- MessageQueueTrigger (Kafka via KEDA)
- TimeTrigger (cron)
- HTTPTrigger
- Longhorn (storage class reference)

## Sources Consulted
- Fission official docs: https://fission.io/docs/
- Fission CLI reference: https://fission.io/docs/reference/fission-cli/
- Fission GitHub repo: https://github.com/fission/fission
- Fission Helm charts repo: https://github.com/fission/fission-charts
- Fission examples (Python/NodeJS): https://github.com/fission/examples
- Fission v1.19.0 release assets: https://github.com/fission/fission/releases/tag/v1.19.0
- Fission types.go (CRD spec): https://github.com/fission/fission/blob/main/pkg/apis/core/v1/types.go
- Docker Hub: https://hub.docker.com/r/fission/python-env

## Issues Found

1. **`fission route create` is not a valid command.** The correct subcommand for creating an HTTP trigger is `fission httptrigger create`. Fixed both occurrences in Step 3 and Step 4.

2. **`fission timer create` / `fission timer list` are not valid commands.** The correct subcommands are `fission timetrigger create` and `fission timetrigger list`. Fixed both occurrences in Step 5.

## Review Notes

- The post pins Fission to v1.19.0. This release exists and the binary URL/asset path are correct, but the latest stable release is v1.22.0 (released 2025-12-18). Pinning is a valid author choice; readers wanting the latest features should bump the version.
- The `fission/python-env:latest` image tag exists on Docker Hub but was last pushed in 2022 (Python 3.7-era). For modern deployments, consider versioned tags such as `fission/python-env-3.12`.
- The Python `def main():` signature without a `context` argument is correct for Fission Python — request data is accessed via `flask.request` inside the function body.
- The NodeJS handler in the post uses `module.exports = async function(context) { ... }`. Fission's official examples use the arrow form (`async (context) => { ... }`), but the function-expression form is functionally equivalent and accepted; left unchanged.
- The MessageQueueTrigger YAML uses `mqtkind: keda` and `functionref` (lowercase). Both are correct — these match the lowercase JSON tags in Fission's CRD types.go, even though the Go struct fields are camelCase (`MqtKind`, `FunctionReference`).
- The `--mincpu`, `--maxcpu`, `--minmemory`, `--maxmemory` flags on `fission environment create` are correct (millicores and megabytes).
