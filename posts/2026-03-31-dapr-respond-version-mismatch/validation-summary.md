# Validation Summary: How to Respond to Dapr Version Mismatch Issues

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (control plane, sidecar injector, CLI)
- Kubernetes (kubectl, pod management, rolling restarts)
- Helm (deployment management)
- Homebrew (macOS CLI installation)

## Sources Consulted
- Dapr Kubernetes deployment docs: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr arguments and annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr CLI install docs: https://docs.dapr.io/getting-started/install-dapr-cli/
- Dapr Kubernetes upgrade docs: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-upgrade/
- Dapr sidecar injector overview: https://docs.dapr.io/concepts/dapr-services/sidecar-injector/
- GitHub: dapr/cli repo (confirmed `master` branch and install script): https://github.com/dapr/cli
- GitHub issue #4366 (dapr.io/sidecar-injected label): https://github.com/dapr/dapr/issues/4366

## Issues Found
- **Broken URL in Step 6**: The upgrade documentation URL `https://docs.dapr.io/operations/upgrading/` returns a 404. Corrected to `https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-upgrade/`, which is the actual Kubernetes upgrade documentation path.

## Review Notes
- The `dapr.io/sidecar-injected=true` label used in Step 2 was only introduced in Dapr v1.11 (June 2023). The blog post examples use Dapr v1.13.0 so this is consistent, but users on older Dapr versions would not have this label available.
- The cluster-wide restart script in Step 3 filters by `app.kubernetes.io/managed-by=Helm`, which will only restart Helm-managed deployments. Deployments created via other means (plain kubectl, Kustomize, ArgoCD, etc.) would be missed. Users should adapt the label selector to their environment.
- The custom-columns command in Step 2 hardcodes `.spec.containers[1].image` (index 1), assuming the daprd sidecar is always the second container. This is typically true but could be inaccurate if pods have additional sidecar containers injected before daprd.
- The Homebrew formula `dapr-cli` works for upgrades if previously installed via the `dapr/tap` tap, but new installations require the full tap reference: `brew install dapr/tap/dapr-cli`.
- All other commands (`dapr status -k`, `dapr --version`, `kubectl rollout restart`, annotation `dapr.io/sidecar-image`) and technical explanations are accurate.
