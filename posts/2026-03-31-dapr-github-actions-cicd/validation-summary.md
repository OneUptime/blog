# Validation Summary: How to Use Dapr with GitHub Actions for CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (CLI, sidecar, components)
- GitHub Actions (CI/CD workflows)
- Docker / Docker Buildx (container image builds)
- Kubernetes (deployment, rollout)
- kubectl
- Docker Hub (container registry)

## Sources Consulted
- Dapr CLI install script source: https://github.com/dapr/cli/blob/master/install/install.sh
- Dapr CLI reference — `dapr init`: https://docs.dapr.io/reference/cli/dapr-init/
- Dapr CLI reference — `dapr run`: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr CLI overview (all commands): https://docs.dapr.io/reference/cli/cli-overview/
- Dapr in-memory state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-inmemory/
- `--components-path` deprecation in favor of `--resources-path`: https://github.com/dapr/cli/issues/953
- docker/build-push-action releases: https://github.com/docker/build-push-action/releases
- azure/k8s-set-context action: https://github.com/azure/k8s-set-context

## Issues Found

1. **Dapr CLI install script `-b` flag does not exist** (both Stage 1 and Stage 3 occurrences): The install script does not accept `-b` to set the install directory. It uses the `DAPR_INSTALL_DIR` environment variable (defaulting to `/usr/local/bin`). Changed to the standard one-liner: `wget -q ... -O - | /bin/bash`.

2. **"three stages" should be "four stages"**: The overview text said the workflow has three stages, but the post describes four: test, build, validate-components, and deploy. Updated to "four stages: test, build, validate, and deploy."

3. **`--components-path` is deprecated**: The `dapr run` flag `--components-path` has been replaced by `--resources-path`. The old flag still works but prints a deprecation warning. Updated to `--resources-path`.

4. **`dapr validate` command does not exist**: The Dapr CLI has no `validate` subcommand. The full list of Dapr CLI commands does not include `validate`. Replaced with `kubectl apply --dry-run=client -f "$file"`, which is the standard Kubernetes approach for client-side manifest validation. Also removed the unnecessary Dapr CLI install step from that stage since it is no longer needed.

## Review Notes
- `docker/build-push-action@v5` is valid but outdated; the latest major version is v7. Left as-is since v5 still functions correctly.
- `azure/k8s-set-context@v3` is valid but outdated; v4+ uses `node20` instead of `node16`. Left as-is since v3 still functions correctly.
- The in-memory state store component YAML omits the `spec.metadata` field. While this works in practice (defaults to empty), the official docs show it as a required field. Left as-is since the omission does not cause runtime errors.
- `kubectl apply --dry-run=client` performs basic YAML and Kubernetes resource structure validation. For full Dapr-specific CRD validation, server-side dry-run (`--dry-run=server`) against a cluster with Dapr CRDs installed would be needed.
