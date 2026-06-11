# Validation Summary: How to Implement Longhorn Backup Targets

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Longhorn
- Kubernetes
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Longhorn BackupTarget, Backup, Snapshot, Volume, BackupVolume, and RecurringJob custom resources
- S3-compatible object storage
- NFS
- Prometheus alerting rules
- Bash and kubectl

## Sources Consulted
- Longhorn 1.12.0: Setting a Backup Target: https://longhorn.io/docs/1.12.0/snapshots-and-backups/backup-and-restore/set-backup-target/
- Longhorn 1.12.0: Create a Backup: https://longhorn.io/docs/1.12.0/snapshots-and-backups/backup-and-restore/create-a-backup/
- Longhorn 1.12.0: Restore from a Backup: https://longhorn.io/docs/1.12.0/snapshots-and-backups/backup-and-restore/restore-from-a-backup/
- Longhorn 1.12.0: Recurring Snapshots and Backups: https://longhorn.io/docs/1.12.0/snapshots-and-backups/scheduling-backups-and-snapshots/
- Longhorn 1.12.0: Architecture and Concepts: https://longhorn.io/docs/1.12.0/concepts/
- Longhorn 1.12.0 CRD definitions: https://raw.githubusercontent.com/longhorn/longhorn/v1.12.0/deploy/longhorn.yaml
- SUSE Storage 1.11 Metrics for Monitoring: https://documentation.suse.com/cloudnative/storage/1.11/en/observability/longhorn-metrics.html

## Issues Found
- The post described S3 and NFS as the two primary backup target types. Current Longhorn documentation also lists SMB/CIFS and Azure Blob Storage, so this was changed to say S3 and NFS are supported examples.
- The backup target manifests used obsolete `Setting` custom resources for `backup-target` and `backup-target-credential-secret`. These were replaced with the documented `longhorn-default-resource` ConfigMap pattern for the default backup target.
- The manual `Backup` manifest omitted `spec.backupMode` and the `backup-volume` metadata label needed to associate the backup with the source volume when using the CRD directly. Both were added.
- The `Snapshot` manifest omitted `spec.createSnapshot: true`. This was added so the CR requests creation of a new snapshot.
- The post used `kubectl wait --for=condition=ready` for Longhorn Snapshot and Volume resources, but these CRDs do not expose that condition. The examples now poll `.status.readyToUse` for snapshots and `.status.restoreRequired` for restored volumes.
- The PVC recurring-job example omitted `recurring-job.longhorn.io/source=enabled`, which is required for Longhorn to sync recurring-job labels from PVCs to the associated Longhorn volume. The label was added.
- Restore examples said volume size can match or exceed the source volume. Current Longhorn restore documentation requires the exact byte count, so the text was corrected.
- Restore `Volume` examples were aligned with Longhorn's documented fields by using `frontend: blockdev` and `dataEngine: v1`.
- Backup listing used a non-documented `longhornvolume` label selector. This was changed to a simple `kubectl get backups -o wide | grep <volume-name>` example.
- The DR restore script used the invalid ready condition wait and restore fields; it now polls `.status.restoreRequired` and uses documented restore fields.
- The backup verification CronJob used a hard-coded restore size that may not match the selected backup. It now reads `.status.volumeSize` from the selected backup.
- The retention example used invalid `RecurringJob.spec.task: backup-cleanup` and described `retain` as days. It now uses `task: backup` and describes `retain` as the number of backups retained.
- The Prometheus rule used `longhorn_backup_state{state="Error"}` even though current Longhorn exposes `longhorn_backup_state` as a numeric value. The expression now checks `longhorn_backup_state == 4`. The unsupported backup target metric alert was removed.
- Troubleshooting commands that referenced old backup settings and unrelated driver deployer logs were updated to use `backuptargets` and Longhorn manager backup logs.

## Review Notes
The article is now technically aligned with Longhorn 1.12.0-era documentation. Longhorn also supports multiple backup targets in recent versions, but the post focuses on configuring the default target, which is appropriate for the scope of this guide.
