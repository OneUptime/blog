# Validation Summary: How to Restore Kubernetes Applications with Velero

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Velero
- Kubernetes
- Kubernetes Restore custom resources
- Kubernetes ConfigMaps
- PersistentVolume and PersistentVolumeClaim restore workflows
- Velero file system backup with PodVolumeRestore
- AWS Velero storage plugin

## Sources Consulted
- Velero v1.18 Restore Reference: https://velero.io/docs/v1.18/restore-reference/
- Velero v1.18 Restore API Type: https://velero.io/docs/v1.18/api-types/restore/
- Velero v1.18 Resource Filtering: https://velero.io/docs/v1.18/resource-filtering/
- Velero v1.18 File System Backup: https://velero.io/docs/v1.18/file-system-backup/
- Velero v1.15 Cluster Migration guide: https://velero.io/docs/v1.15/migration-case/
- Velero restore create CLI source: https://github.com/velero-io/velero/blob/main/pkg/cmd/cli/restore/create.go
- Velero install CLI source for `--restore-only`: https://github.com/velero-io/velero/blob/main/pkg/cmd/cli/install/install.go
- Velero plugin for AWS releases: https://github.com/vmware-tanzu/velero-plugin-for-aws/releases

## Issues Found
- The complete-restore example created a restore without a name, then described and logged `production-backup-20260128-restore`. Velero generates a timestamped name when no restore name is supplied, so the follow-up commands would not target the created restore. Updated the restore command to explicitly create `production-backup-20260128-restore`.
- The cross-cluster restore example used `--exclude-cluster-scoped-resources` with `velero restore create`. Current Velero docs mark that scoped-resource flag as backup-only. Replaced it with the documented restore flag `--include-cluster-resources=false`.
- The storage class examples used a non-existent `--storage-class-mappings` restore flag. Velero documents storage class mapping through a labeled ConfigMap with `velero.io/plugin-config` and `velero.io/change-storage-class: RestoreItemAction`. Replaced the invalid flags with ConfigMap examples followed by the restore command.
- The troubleshooting YAML used a non-existent `Restore.spec.storageClassMapping` field. Replaced it with the documented storage class mapping ConfigMap format.
- The Restore CR comment said `preserveNodePorts` preserved original node affinity. That field preserves Service nodePorts, so the comment was corrected.
- The Restore CR comment for `itemOperationTimeout` described waiting for items to become ready. The API documents it as the timeout for asynchronous item operations, so the comment was corrected.
- The verification script used `velero restore get ... -o jsonpath=...`; Velero's output formats are not Kubernetes-style jsonpath. Replaced it with `kubectl get restore ... -o jsonpath=...` against the Restore CR.
- Versioned examples used an older AWS plugin tag (`velero/velero-plugin-for-aws:v1.8.0`). Updated it to a current AWS plugin release (`velero/velero-plugin-for-aws:v1.14.1`).
- The automated restore-test CronJob used `velero/velero:v1.12.0` while also relying on `kubectl` and `jq`, which are not safe assumptions for that image. Reworked the example to use a kubectl image, query Velero Backup CRs directly, and create a Velero Restore CR with `spec.namespaceMapping`.
- The "Resource Conflict Resolution" heading was missing Markdown heading markup. Added `##` so the section renders correctly.

## Review Notes
- The CronJob example still assumes the `velero` service account has RBAC to list Backup CRs, create Restore CRs, inspect restored pods, and delete the temporary namespace.
- `--restore-only` exists in the current Velero install CLI, but for cross-cluster migration the official migration guide also recommends setting the BackupStorageLocation access mode to `ReadOnly`, which the post now continues to show.
