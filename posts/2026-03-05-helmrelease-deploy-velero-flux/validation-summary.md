# Validation Summary: How to Use HelmRelease for Deploying Velero with Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux HelmRepository and HelmRelease APIs
- Kubernetes Secrets and Namespaces
- Velero
- Velero Helm chart
- Velero AWS and GCP provider plugins
- Velero Backup and Schedule resources
- Prometheus ServiceMonitor integration

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux CLI `get helmreleases` documentation: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux HelmRepository source API documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- VMware Tanzu Velero Helm chart repository and values: https://github.com/vmware-tanzu/helm-charts/tree/main/charts/velero
- Velero Helm chart release metadata for chart 12.0.1: https://github.com/vmware-tanzu/helm-charts/releases
- Velero AWS plugin README and compatibility matrix: https://github.com/velero-io/velero-plugin-for-aws
- Velero GCP plugin README and compatibility matrix: https://github.com/velero-io/velero-plugin-for-gcp
- Velero Backup API documentation: https://velero.io/docs/v1.18/api-types/backup/
- Velero Backup reference and CLI examples: https://velero.io/docs/v1.18/backup-reference/

## Issues Found
- The HelmRelease used chart version `7.x` with Velero plugin images `v1.10.0`, which matches Velero 1.14 but is outdated relative to the current VMware Tanzu chart line. Updated the chart constraint to `12.x` and both AWS/GCP plugin images to `v1.14.0`, which matches Velero 1.18 according to the official plugin compatibility matrices.
- The Secret example used the `velero` namespace before showing that the namespace exists. Since the HelmRelease itself is also namespaced to `velero`, `install.createNamespace` is not sufficient to create the namespace that contains the HelmRelease and Secret objects. Added a `Namespace` manifest before the Secret.
- The verification command used `flux get helmrelease velero -n velero`. Flux documents the command as `flux get helmreleases`; updated the command to `flux get helmreleases -n velero`.

## Review Notes
- The Velero Helm chart values used in the post, including `configuration.backupStorageLocation`, `configuration.volumeSnapshotLocation`, `credentials.existingSecret`, `deployNodeAgent`, `nodeAgent`, `schedules`, and `metrics.serviceMonitor.enabled`, are valid chart values.
- The Velero Backup resource fields `includedNamespaces`, `ttl`, `storageLocation`, `snapshotVolumes`, and `volumeSnapshotLocations` are valid Velero Backup spec fields.
- The AWS and GCS snippets assume static credential secrets. Workload identity approaches are also supported by Velero providers, but the existing examples are technically valid for secret-based authentication.
