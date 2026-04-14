# Validation Summary: How to Use Dapr with k0s

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- k0s (zero-friction Kubernetes distribution)
- Dapr (Distributed Application Runtime)
- Helm (Kubernetes package manager)
- Calico (CNI network provider)
- kubectl

## Sources Consulted
- k0s ClusterConfig v1beta1 schema — verified against 8 other k0s blog posts in this repository that all place `podCIDR` and `serviceCIDR` under `spec.network`
- k0s official installation script URL: https://get.k0s.sh
- Dapr Helm chart repository: https://dapr.github.io/helm-charts/
- Dapr Kubernetes annotations documentation (dapr.io/enabled, dapr.io/app-id, dapr.io/app-port)
- Dapr Kubernetes version compatibility page: https://docs.dapr.io/operations/support/support-kubernetes/

## Issues Found
1. **k0s ClusterConfig: `podCIDR` and `serviceCIDR` at wrong nesting level.** These fields were placed directly under `spec` (as siblings of `network`) instead of under `spec.network`. Fixed by indenting them two spaces so they are nested under `spec.network`, consistent with the k0s v1beta1 schema and all other k0s configuration examples in this blog.

## Review Notes
- The k0s upgrade procedure shown (stop, re-download binary, start) is a simplified approach. For production multi-node clusters, k0s recommends using `k0sctl` or the autopilot update mechanism for zero-downtime upgrades.
- The Dapr Helm install uses `global.ha.enabled=true`, which requires at least 3 replicas of Dapr system pods. This is appropriate for production but may be heavy for single-node development clusters. The post does not mention this trade-off.
- The `sudo curl -sSLf https://get.k0s.sh | sudo sh` line in the upgrade section has a redundant `sudo` before `curl` (piping to `sudo sh` is sufficient), though this is not incorrect — just unnecessary.
