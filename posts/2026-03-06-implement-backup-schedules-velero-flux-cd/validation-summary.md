# Validation Summary: How to Implement Backup Schedules with Velero and Flux CD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- Velero
- Velero Helm chart
- Flux CD HelmRelease and Kustomization APIs
- Flux notification-controller
- Prometheus Operator PrometheusRule
- AWS S3 / AWS Velero plugin
- Kubernetes CronJob and RBAC

## Sources Consulted
- Velero Schedule API documentation: https://velero.io/docs/v1.18/api-types/schedule/
- Velero Restore API documentation: https://velero.io/docs/v1.18/api-types/restore/
- Velero Backup Storage Location documentation: https://velero.io/docs/v1.18/api-types/backupstoragelocation/
- Velero compatibility matrix: https://velero-io.github.io/velero/
- VMware Tanzu Velero Helm chart values and Chart.yaml: https://github.com/vmware-tanzu/helm-charts/tree/main/charts/velero
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux notification Provider and Alert documentation: https://fluxcd.io/flux/components/notification/providers/ and https://fluxcd.io/flux/components/notification/alerts/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Prometheus Operator PrometheusRule API documentation: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Velero HelmRelease pinned an outdated chart (`5.4.0`) and AWS plugin (`v1.9.0`) for a current 2026 guide. Updated the chart to `12.0.1` and the AWS plugin to `v1.13.1`, matching the current VMware Tanzu Velero chart values.
- The Helm chart values placed `prefix` under `configuration.backupStorageLocation[].config`, but the chart expects it as a top-level field on the backup storage location entry. Moved `prefix` next to `bucket`.
- The prerequisite hardcoded Kubernetes `v1.24+`, which is not a reliable current compatibility statement for a specific Velero release. Replaced it with a compatibility-based prerequisite.
- The `deployNodeAgent` comment said it installed the CSI snapshot plugin. That field deploys Velero's node-agent for file system backup, so the comment was corrected.
- The Schedule example described `useOwnerReferencesInBackup` as server-side encryption. That field controls owner references on created Backup resources, so the comment was corrected.
- The backup verification CronJob used `jq` with a `bitnami/kubectl` image that does not guarantee `jq` is present, and it referenced a ServiceAccount without RBAC. Added ServiceAccount, Role, and RoleBinding resources and rewrote the checks with `kubectl` custom columns plus `awk`.
- Flux notification Provider and Alert examples used `notification.toolkit.fluxcd.io/v1`, but current Flux documentation uses `v1beta3` for Provider and Alert. Updated both API versions.
- The Prometheus missing-backup alert did not handle the absence of `velero_backup_last_successful_timestamp`. Updated the expression to include `absent(...)`, following the pattern used by the current Velero Helm chart.

## Review Notes
- The examples remain AWS-focused. GCS and Azure are listed as possible object storage backends, but their Velero provider-specific Helm values and credentials differ.
- The backup health CronJob checks API state and storage-location status; it does not perform a test restore. A future improvement could add a separate non-production restore validation workflow.
