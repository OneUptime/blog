# Validation Summary: How to Implement Velero Cross-Cluster Migration

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Velero
- Kubernetes
- Kubernetes BackupStorageLocation, Backup, and Restore custom resources
- Velero file system backup with Kopia
- Kubernetes persistent volumes and persistent volume claims
- Bash scripting

## Sources Consulted
- Velero v1.18 Cluster migration documentation: https://velero.io/docs/v1.18/migration-case/
- Velero v1.18 File System Backup documentation: https://velero.io/docs/v1.18/file-system-backup/
- Velero v1.18 Backup API type documentation: https://velero.io/docs/v1.18/api-types/backup/
- Velero v1.18 BackupStorageLocation API type documentation: https://velero.io/docs/v1.18/api-types/backupstoragelocation/
- Velero v1.18 Restore API type documentation: https://velero.io/docs/v1.18/api-types/restore/
- Velero v1.18 Restore reference documentation: https://velero.io/docs/v1.18/restore-reference/
- Velero v1.18 Restore Resource Modifiers documentation: https://velero.io/docs/v1.18/restore-resource-modifiers/
- Velero v1.18 CLI help output for `velero backup create`, `velero restore create`, and `velero restore describe`
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- The target-cluster backup sync step said `velero backup-location get` could force a sync. Velero automatically syncs backups from object storage on its configured backup sync period; the command does not force a sync. Updated the wording to say to wait for automatic sync.
- The restore monitoring command used `velero restore describe migration-restore --details -w`, but `velero restore describe` does not support `-w/--wait` in Velero v1.18. Added `--wait` to `velero restore create` and changed the describe command to `velero restore describe migration-restore --details`.
- The cross-cloud file system backup text referred to "restic/kopia". Velero's current documentation presents Kopia as the current uploader and notes restic is under deprecation. Updated the example wording to Kopia.
- The storage class mapping examples used a nonexistent `--storage-class-mappings` restore flag and a nonexistent `Restore.spec.storageClassMapping` field. Replaced them with the Velero-supported `ConfigMap` labeled `velero.io/change-storage-class: RestoreItemAction`.
- The resource transformation example used an invalid plugin ConfigMap shape for JSON patch resource modifiers. Replaced it with a valid resource modifier YAML and a restore command using `--resource-modifier-configmap`.

## Review Notes
The post is technically relevant and validated after the corrections above. Velero file system backup is still documented as beta quality, and production migrations should test application-specific consistency and restore behavior before cutover.
