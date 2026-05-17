# Validation Summary: How to Back Up and Restore Namespaces on Talos Linux

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Velero (backup tool)
- kubectl
- yq (v4 syntax)
- Kubernetes CronJob / Velero Schedule CRD
- S3 (referenced as backup storage location)

## Sources Consulted
- Velero documentation — File System Backup: https://velero.io/docs/main/file-system-backup/
- Velero API types — Schedule: https://velero.io/docs/main/api-types/schedule/
- Velero source — `velero backup get` output format: https://github.com/vmware-tanzu/velero/blob/main/pkg/cmd/cli/backup/get.go
- Velero v1 API godoc (BackupList): https://pkg.go.dev/github.com/vmware-tanzu/velero/pkg/apis/velero/v1
- bitnami/kubectl image contents: https://hub.docker.com/r/bitnami/kubectl
- Velero CLI annotations for selective volume backup (`backup.velero.io/backup-volumes`, `backup.velero.io/backup-volumes-excludes`)
- Kubernetes `batch/v1` CronJob and `apps/v1` Deployment API references

## Issues Found
The original "Automated Namespace Backup with CronJobs" section contained two real bugs that would prevent the example from working:

1. **Wrong container image**: The CronJob used `image: bitnami/kubectl:latest` but the inline shell script invoked `velero backup create ...` and `velero backup get ...`. The bitnami/kubectl image only ships the `kubectl` binary — `velero` is not present, so every velero invocation in the container would fail with "command not found."

2. **Broken jq query against `velero backup get`**: The script used `velero backup get "${ns}-${TIMESTAMP}" -o json | jq -r '.status.phase'`. Velero always wraps `backup get` output in a `BackupList` (even when a single name is supplied), so `.status.phase` would always resolve to `null` and the post-backup status check would never see "Completed."

**Fix applied**: Replaced the CronJob example with Velero's native `Schedule` custom resource (apiVersion `velero.io/v1`, kind `Schedule`), which is the documented and idiomatic way to run recurring Velero backups. The `Schedule` template carries the same `includedNamespaces`, `defaultVolumesToFsBackup`, and `ttl` settings, so the user-facing behavior matches the original intent without needing a custom container image or fragile status-parsing logic. The section heading was updated from "Automated Namespace Backup with CronJobs" to "Automated Namespace Backup with Velero Schedules" to reflect the corrected approach, and short follow-up commands were added showing how to list and inspect the backups the schedule produces.

## Review Notes
- The Velero CLI flag `--default-volumes-to-fs-backup` is correct for Velero 1.10+ (it replaced `--default-volumes-to-restic`). Note that Restic is being deprecated in favor of Kopia in newer Velero releases; the file-system-backup flag and pod annotations remain stable, but users on very old Velero (<1.10) would still see the `--default-volumes-to-restic` name.
- The pod annotations `backup.velero.io/backup-volumes` and `backup.velero.io/backup-volumes-excludes` are correct.
- The Velero restore flags (`--from-backup`, `--namespace-mappings`, `--include-resources`, `--selector`, `--wait`) and the cross-cluster migration prerequisite (shared backup storage location) are all accurate.
- The kubectl/yq export-and-clean workflow uses correct yq v4 syntax. As a future improvement, the post could mention that `kubectl get all` does not actually return all namespaced resources (it expands to a curated set), but the example already lists the additional resource types explicitly, so this is not an error.
- The Schedule example in the fix backs up the three listed namespaces into a single backup per run. If a user wants fully isolated per-namespace backups (matching the original CronJob's loop semantics), they can create one Schedule object per namespace; restore-time `--include-namespaces` on a multi-namespace backup also provides granular recovery.
