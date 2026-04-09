# Validation Summary: How to Use Helm Values Files for Rook-Ceph GitOps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (v1.14.0)
- Helm (values files, `helm template`)
- ArgoCD (Application CRD, multi-source)
- Flux CD (HelmRelease v2, valuesFrom)
- Kubernetes (dry-run validation, ConfigMaps)
- Git (change tracking)

## Sources Consulted
- Rook-Ceph Helm chart values.yaml at v1.14.0 tag: https://github.com/rook/rook/blob/v1.14.0/deploy/charts/rook-ceph/values.yaml
- ArgoCD documentation on multiple sources: https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- ArgoCD Application CRD spec: https://argo-cd.readthedocs.io/en/stable/user-guide/helm/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/helmreleases/
- Rook official Helm quickstart: https://rook.io/docs/rook/latest/Helm-Charts/operator-chart/

## Issues Found

### 1. Invalid `monitoring.metricsPort` field in production values
- **What was wrong:** The production values override included `monitoring.metricsPort: 9283`. The rook-ceph operator Helm chart's `monitoring` section only supports the `enabled` field. There is no `metricsPort` field — this value would be silently ignored by Helm.
- **What was changed:** Removed the `monitoring` block entirely from the production values example, since without `metricsPort` it would only duplicate the `monitoring.enabled: true` already set in the base values.
- **Why:** Including non-existent chart values in a tutorial is misleading and could confuse readers into thinking this is a configurable option.

### 2. ArgoCD Application using invalid external HTTPS URLs in `valueFiles`
- **What was wrong:** The ArgoCD Application spec used `spec.source` (singular) with raw GitHub HTTPS URLs in `helm.valueFiles`. ArgoCD does not support fetching values files from arbitrary external HTTPS URLs when using a Helm repository source. The `valueFiles` paths are resolved relative to the chart or referenced sources, not as external URLs.
- **What was changed:** Converted the ArgoCD Application to use the multi-source feature (`spec.sources`, plural) with a `$values` reference. The Helm chart source references values files via `$values/environments/...`, and a second source defines the Git repository containing the values files with `ref: values`.
- **Why:** The multi-source approach is the documented and recommended way to use external values files with Helm chart sources in ArgoCD. It supports authentication via ArgoCD's repository credentials and works with both public and private repositories.

## Review Notes
- The Flux HelmRelease example is correct and follows current best practices. The `valuesKey: values.yaml` is explicit about the default, which aids readability.
- The `helm template | kubectl apply --dry-run=server` validation pattern is a solid recommendation. Note that `--dry-run=server` requires an active cluster connection.
- All rook-ceph operator Helm chart values (image, crds, logLevel, resources, tolerations, nodeSelector) were verified against the v1.14.0 chart and are correct.
- The Helm repo URL `https://charts.rook.io/release` is correct per official Rook documentation.
