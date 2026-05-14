# Validation Summary: How to Use HelmRelease for Deploying MinIO with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux HelmRelease and HelmRepository custom resources
- Kubernetes
- Helm
- MinIO
- MinIO Client (mc)
- S3-compatible object storage

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease documentation for valuesFrom and install.createNamespace: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux bootstrap GitHub CLI reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Official MinIO Helm chart repository index: https://charts.min.io/index.yaml
- Official MinIO Helm chart values and templates from the MinIO repository: https://github.com/minio/minio/tree/master/helm/minio
- MinIO Client alias command reference: https://min.io/docs/minio/linux/reference/minio-mc/mc-alias-set.html
- MinIO Client lifecycle rule command reference: https://min.io/docs/minio/linux/reference/minio-mc/mc-ilm-rule-add.html
- MinIO Client admin policy command reference: https://min.io/docs/minio/linux/reference/minio-mc-admin/mc-admin-policy-create.html

## Issues Found
- The HelmRelease examples used `metadata.namespace: minio` while relying on `install.createNamespace: true`. Flux creates the Helm target namespace, not the namespace that must already exist for the HelmRelease object itself. Changed the HelmRelease examples to live in `flux-system` and added `spec.targetNamespace: minio`.
- After moving the HelmRelease to `flux-system`, Flux could otherwise derive a release name that changes the generated service names. Added `spec.releaseName: minio` so the chart continues to create the `minio` and `minio-console` services used later in the guide.
- The credential Secret example used `namespace: minio`, but Flux `valuesFrom` references must point to a Secret or ConfigMap in the same namespace as the HelmRelease. Changed the Secret namespace to `flux-system`.
- The `valuesFrom` example showed only the field block, which could be misread as a top-level manifest field. Wrapped it under `spec:` to show the correct HelmRelease placement.
- The deployment monitoring command checked HelmReleases in the `minio` namespace. Updated it to `flux-system` to match the corrected HelmRelease namespace.
- The commit command omitted `minio-secret.yaml` even though the guide creates it. Added it to the `git add` command.
- The verification section tested `http://localhost:9000` with `mc` without port-forwarding the MinIO API in that step. Added an API port-forward and backgrounded both port-forward commands so subsequent commands can run.

## Review Notes
- The MinIO chart repository URL, chart name, `mode`, `replicas`, `rootUser`, `rootPassword`, `persistence`, `service`, `consoleService`, `buckets`, and `metrics.serviceMonitor` values match the official MinIO Helm chart structure.
- The Flux `helm.toolkit.fluxcd.io/v2` and `source.toolkit.fluxcd.io/v1` API versions are current in the official Flux documentation.
- The current official MinIO chart repository still serves chart version 5.4.0 with a 2024 MinIO app version; pinning a specific chart version instead of `5.x` could improve reproducibility in a future revision.
