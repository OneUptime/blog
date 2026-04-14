# Validation Summary: How to Version Dapr CRDs Across Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (runtime, operator, CRDs)
- Kubernetes (kubectl, CRDs)
- Helm (chart-based installation and upgrades)
- Flux CD (GitOps-based HelmRelease management)
- Git (version-controlling CRD manifests)

## Sources Consulted
- Helm official documentation on `helm upgrade` and `--install` flag: https://helm.sh/docs/helm/helm_upgrade/
- Flux CD HelmRelease API reference (v2): https://fluxcd.io/flux/components/helm/api/v2/
- Flux CD v2.3.0 release notes (v2 GA promotion): https://fluxcd.io/blog/2024/05/flux-v2.3.0/
- Flux CD v2.7.0 release notes (v2beta1 removal): https://fluxcd.io/blog/2025/09/flux-v2.7.0/
- Dapr Helm chart installation documentation: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Kubernetes CRD documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/

## Issues Found
1. **Helm `upgrade` missing `--install` flag**: The `helm upgrade dapr dapr/dapr ...` commands in the "Using Helm for CRD Lifecycle Management" section would fail with `Error: UPGRADE FAILED: "dapr" has no deployed releases` if Dapr was not already installed. Changed to `helm upgrade --install` to make the command idempotent (installs if absent, upgrades if present), which is the standard pattern for CI/CD and multi-cluster workflows.

2. **Flux HelmRelease API version outdated**: The Flux HelmRelease manifest used `apiVersion: helm.toolkit.fluxcd.io/v2beta1`, which was deprecated in Flux v2.2.0 (Dec 2023) and removed from CRDs in Flux v2.7.0 (Sep 2025). Updated to `helm.toolkit.fluxcd.io/v2`, the stable GA API version since Flux v2.3.0 (May 2024).

## Review Notes
- The `migrate-components.py` script referenced in the "Handling Breaking Changes" section is a hypothetical script used for illustration. This is acceptable for a guide showing the general migration pattern, but readers should be aware they would need to write or source such a script themselves.
- As of Dapr 1.13, the component CRD API version is `dapr.io/v1alpha1`. The post's mention of migrating from `v1alpha1` to `v1beta1` is used as a hypothetical future scenario, which is a reasonable illustration.
- The list of Dapr CRD names in the Git export loop (components, configurations, resiliencies, subscriptions, httpendpoints) is correct for Dapr 1.13.x.
