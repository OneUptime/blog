# Validation Summary: How to Upgrade Dapr on Kubernetes Without Downtime

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes
- Helm 3
- kubectl
- Dapr CLI

## Sources Consulted
- Dapr official documentation on upgrading Dapr with Helm: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-upgrade/
- Dapr Helm charts repository: https://github.com/dapr/helm-charts
- Helm official documentation for `helm upgrade`, `helm rollback`, `helm get values`: https://helm.sh/docs/
- Kubernetes documentation for `kubectl rollout restart`, `kubectl rollout status`, `kubectl rollout undo`: https://kubernetes.io/docs/reference/kubectl/
- Dapr documentation on actor placement and rebalancing: https://docs.dapr.io/developing-applications/building-blocks/actors/

## Issues Found
1. **Step 7 — incorrect jsonpath querying init containers instead of containers**: The command to verify updated sidecar versions used `spec.initContainers[*]` in the jsonpath expression, but daprd runs as a regular sidecar container, not an init container. Step 1 of the same post correctly used `spec.containers[*]` for the identical purpose. Fixed `spec.initContainers[*]` to `spec.containers[*]` to match the correct container type and be consistent with Step 1.

## Review Notes
- The Dapr dashboard version (`0.14.0`) in the expected output of Step 5 is correct — the dashboard follows its own versioning scheme separate from the Dapr runtime version.
- The two-phase upgrade approach (control plane first, then rolling sidecar restarts) is consistent with official Dapr upgrade documentation.
- The Helm chart repository URL (`https://dapr.github.io/helm-charts/`) is the correct official source.
- The `global.ha.enabled=true` Helm value is a valid and recommended setting for production Dapr deployments.
- The actor handling section provides reasonable guidance, though the `sleep 30` wait is a pragmatic approximation — actual rebalance time depends on cluster size and actor count.
- The CI/CD automation script is well-structured but does not include pre-upgrade validation (e.g., checking that the target version exists or that the cluster is healthy before starting). This is acceptable for a tutorial but worth noting for production use.
