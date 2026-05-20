# Validation Summary: How to Configure Health Checks for Velero Backups in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes ConfigMaps
- Argo CD Lua resource health checks
- Velero Backup, Restore, Schedule, and BackupStorageLocation custom resources
- Kustomize
- Helm
- kubectl
- Velero CLI

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo Helm chart values: https://raw.githubusercontent.com/argoproj/argo-helm/main/charts/argo-cd/values.yaml
- Velero Backup API documentation: https://velero.io/docs/main/api-types/backup/
- Velero Restore API documentation: https://velero.io/docs/v1.18/api-types/restore/
- Velero Schedule API documentation: https://velero.io/docs/v1.17/api-types/schedule/
- Velero API package reference for current phase enums: https://pkg.go.dev/github.com/vmware-tanzu/velero@v1.18.0/pkg/apis/velero/v1
- Velero BackupStorageLocation documentation: https://velero.io/docs/main/api-types/backupstoragelocation/
- Velero resource filtering documentation: https://velero.io/docs/main/resource-filtering/
- Referenced OneUptime Velero article: https://oneuptime.com/blog/post/2026-01-06-kubernetes-backup-restore-velero/view

## Issues Found
- The Velero Backup phase list included `Uploading`, which is not a current Velero v1.18 `BackupPhase`, and omitted `Queued`, `ReadyToStart`, `WaitingForPluginOperations`, `WaitingForPluginOperationsPartiallyFailed`, `Finalizing`, and `FinalizingPartiallyFailed`. Updated the phase list and backup health checks to match current Velero API enums.
- The Velero Restore phase list omitted current plugin-operation and finalizing phases. Updated the restore phase list and restore health check to mark these in-flight phases as `Progressing`.
- The Schedule health check text said schedules can be paused, but the Lua only checked `status.phase`. Velero stores pause state in `spec.paused`, so the script now returns Argo CD `Suspended` when `obj.spec.paused == true`.
- The Helm values example used `server.config`, which is not the current community `argo-cd` chart location for `argocd-cm` values. Updated it to `configs.cm`.
- The stale backup note implied Lua time functions were merely limited. Argo CD disables standard Lua libraries by default, so the note now says open libraries must be enabled if time functions are needed.

## Review Notes
The Kustomize and Helm examples intentionally show only the Backup health check, while the earlier section provides full examples for Backup, Restore, Schedule, and BackupStorageLocation. That is technically valid, but future revisions could make the examples more consistent by including all resource customizations in each application method.
