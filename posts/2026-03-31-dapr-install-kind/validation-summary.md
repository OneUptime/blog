# Validation Summary: How to Install Dapr on KiND (Kubernetes in Docker)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- KiND (Kubernetes in Docker)
- Kubernetes
- Docker
- GitHub Actions (CI pipeline integration)
- kubectl

## Sources Consulted
- [Dapr Kubernetes deployment docs](https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/) — verified control plane components and `dapr init -k` behavior
- [Dapr CLI installation docs](https://docs.dapr.io/getting-started/install-dapr-cli/) — verified install script URL and command syntax
- [Dapr annotations reference](https://docs.dapr.io/reference/arguments-annotations-overview/) — verified `dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port` annotations
- [KiND Quick Start docs](https://kind.sigs.k8s.io/docs/user/quick-start/) — verified API version, commands, image loading, and current release version
- [helm/kind-action GitHub releases](https://github.com/helm/kind-action/releases) — verified latest action version

## Issues Found

1. **Dapr dashboard listed in expected output (incorrect)**: The expected pod output included `dapr-dashboard-5d9d9f5b6-xtz4c`, but the Dapr dashboard is NOT installed by default with `dapr init --kubernetes`. It is only included when using the `--dev` flag or when installed separately via Helm. Removed the dashboard pod from the expected output.

2. **KiND version outdated**: The `go install` command referenced `kind@v0.22.0`, which is significantly behind the current release. Updated to `kind@v0.31.0` (current stable release).

3. **helm/kind-action version outdated**: The GitHub Actions workflow used `helm/kind-action@v1.8.0`, which is an old release. Updated to `helm/kind-action@v1.14.0` (latest release, which includes KiND v0.31.0 support).

## Review Notes
- The KiND cluster configuration API version `kind.x-k8s.io/v1alpha4` is correct and current.
- The Dapr CLI install script URL (`https://raw.githubusercontent.com/dapr/cli/master/install/install.sh`) is correct per official docs.
- The Dapr annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`) are all correct.
- The `kind load docker-image` command and `imagePullPolicy: Never` pattern are correct for local development with KiND.
- The `dapr-system` namespace is the correct default for Dapr control plane pods.
- The `kind-dapr-dev` context naming convention (prefixing cluster name with `kind-`) is correct.
