# Validation Summary: How to Deploy Backup Solutions with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux HelmRepository, HelmRelease, and Kustomization APIs
- Velero
- Velero Helm chart
- Kubernetes Backup, Schedule, Restore, BackupStorageLocation, and VolumeSnapshotLocation resources
- AWS S3, EBS snapshots, and EKS IAM roles for service accounts
- PrometheusRule alerts

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `get helmreleases` documentation: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Velero Helm chart repository and chart metadata: https://github.com/vmware-tanzu/helm-charts
- Velero Helm chart values: https://github.com/vmware-tanzu/helm-charts/blob/main/charts/velero/values.yaml
- Velero Backup API documentation: https://velero.io/docs/v1.18/api-types/backup/
- Velero Schedule API documentation: https://velero.io/docs/v1.17/api-types/schedule/
- Velero Restore API and restore reference: https://velero.io/docs/v1.18/api-types/restore/ and https://velero.io/docs/v1.18/restore-reference/
- Velero CSI documentation and upgrade notes: https://velero.io/docs/v1.17/csi/ and https://velero.io/docs/v1.14/upgrade-to-1.14/
- Velero File System Backup documentation: https://velero.io/docs/v1.15/file-system-backup/
- Velero BackupStorageLocation and location documentation: https://velero.io/docs/v1.18/api-types/backupstoragelocation/ and https://velero.io/docs/v1.18/locations/
- AWS EKS Velero backup and restore guidance: https://aws.amazon.com/blogs/containers/back-up-and-restore-your-amazon-eks-cluster-resources-using-velero/
- Velero AWS plugin compatibility information: https://github.com/vmware-tanzu/velero-plugin-for-aws

## Issues Found
- The HelmRelease used `version: "7.x"` with plugin versions from the Velero 1.14 era. Updated the chart range to `12.x`, which matches the current Velero Helm chart line for Velero 1.18.
- The AWS plugin image was `velero/velero-plugin-for-aws:v1.10.0`, which is intended for Velero 1.14. Updated it to `v1.14.0`, which is compatible with Velero 1.18.
- The Helm values installed `velero-plugin-for-csi:v0.7.0`. Removed that init container because Velero 1.14 and later include the CSI plugin in Velero itself, and installing the separate CSI plugin can cause duplicate plugin registration.
- The AWS example annotated the service account for an EKS IAM role but left the chart's default static credentials secret enabled. Added `credentials.useSecret: false` so the pod uses AWS workload identity instead of a mounted cloud credentials file.
- The `orderedResources` example used `v1/Secret` and `v1/ConfigMap` as map keys. Changed them to `secrets` and `configmaps` because Velero expects plural resource names in that field.
- The comment for `orderedResources` implied restore dependency ordering. Reworded it to describe backup collection order, which is what the Velero Backup API defines.
- The "no recent backup" Prometheus alert did not handle the case where `velero_backup_last_successful_timestamp` is absent. Updated the PromQL expression to include `absent(...)`.
- The node-agent comment mentioned Restic alongside Kopia. Removed the Restic reference because Restic is deprecated in current Velero releases and backups using the Restic path are disabled in Velero 1.17 and 1.18.

## Review Notes
The snippets are syntactically valid YAML after the corrections. Future improvements could include showing a `kustomization.yaml` for CI validation even though Flux can auto-generate one for plain YAML directories, and adding notes that Velero restore drills should be tested against the specific storage classes, CSI drivers, and workload consistency requirements in use.
