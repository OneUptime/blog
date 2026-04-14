# Validation Summary: How to Install Dapr on Minikube

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (runtime and CLI)
- Minikube
- Kubernetes (v1.29.0)
- kubectl
- Docker (as Minikube driver)

## Sources Consulted
- Dapr CLI installation docs: https://docs.dapr.io/getting-started/install-dapr-cli/
- Dapr Kubernetes deployment docs: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr CLI reference (`dapr init`, `dapr status`, `dapr dashboard`, `dapr uninstall`): https://docs.dapr.io/reference/cli/
- Dapr quickstarts repository: https://github.com/dapr/quickstarts
- Minikube start command reference: https://minikube.sigs.k8s.io/docs/commands/start/
- Dapr 1.13 release notes: https://blog.dapr.io/

## Issues Found
No technical issues found.

## Review Notes
- The expected pod list (including `dapr-dashboard`) and the `dapr dashboard -k` command are accurate for Dapr 1.13.0, which the post explicitly references as an install option. In Dapr 1.14+, the dashboard was separated from the default installation. If a reader installs the latest Dapr version via `dapr init --kubernetes --wait`, they may not see the `dapr-dashboard` pod and the `dapr dashboard` CLI command may not function without separate installation. A future update could clarify this version-specific behavior.
- The `kubectl version --client` flag produces a deprecation notice in kubectl 1.28+ suggesting `--client=true`, but it still functions correctly.
- The Minikube resource allocation (4 CPUs, 8 GB RAM) exceeds Dapr's minimum requirements, which is a good practice for a development guide.
