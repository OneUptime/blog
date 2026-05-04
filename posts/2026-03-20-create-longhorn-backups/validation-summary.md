# Validation Summary: How to Create Longhorn Backups

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Longhorn (cloud-native distributed block storage for Kubernetes)
- Kubernetes (kubectl, CRDs, PVC, Secret)
- AWS S3 (as backup target example)
- Longhorn CRDs: `Backup`, `RecurringJob`, `BackupVolume`, `Volume`, `Settings`
- CSI VolumeSnapshot (`snapshot.storage.k8s.io/v1`)

## Sources Consulted
- Longhorn 1.7 docs — Set Backup Target: https://longhorn.io/docs/1.7.0/snapshots-and-backups/backup-and-restore/set-backup-target/
- Longhorn 1.7 docs — Create a Backup: https://longhorn.io/docs/1.7.0/snapshots-and-backups/backup-and-restore/create-a-backup/
- Longhorn 1.7 docs — Restore from a Backup: https://longhorn.io/docs/1.7.0/snapshots-and-backups/backup-and-restore/restore-from-a-backup/
- Longhorn 1.7 docs — Scheduling Backups and Snapshots (RecurringJob CRD): https://longhorn.io/docs/1.7.0/snapshots-and-backups/scheduling-backups-and-snapshots/
- Longhorn 1.7 docs — CSI VolumeSnapshot associated with Longhorn Backup: https://longhorn.io/docs/1.7.0/snapshots-and-backups/csi-snapshot-support/csi-volume-snapshot-associated-with-longhorn-backup/

## Issues Found
1. **Invalid `volume` field on the `Backup` CRD spec.** The original example included `volume: my-longhorn-volume` under `spec`. The Longhorn `Backup` CRD spec only has `snapshotName`, `backupMode`, and `labels`; the parent volume is derived from the referenced snapshot. **Fix:** Removed the `volume` field and added the (valid) `backupMode: incremental` field, with an updated comment explaining the volume is derived from the snapshot.

2. **Invalid PVC restore example using `BackupVolume` as a data source.** The original showed a PVC with `dataSourceRef` pointing to `kind: BackupVolume` (`apiGroup: longhorn.io`). Longhorn does not support restoring a PVC by referencing a `BackupVolume` directly; the supported declarative pattern is to create a CSI `VolumeSnapshot` (`snapshot.storage.k8s.io/v1`) bound to a `VolumeSnapshotContent` that references the Longhorn backup, and then provision the PVC from that `VolumeSnapshot`. **Fix:** Updated the PVC example to use `dataSource` with `kind: VolumeSnapshot` and `apiGroup: snapshot.storage.k8s.io`, and added a comment noting the prerequisite VolumeSnapshot.

3. **Misleading comment on `kubectl get backupvolumes.longhorn.io`.** The original comment said this command checks "backup jobs running", but `BackupVolume` is the per-volume entry in the backup store (not a representation of running jobs). **Fix:** Updated the comment to accurately describe the resource.

## Review Notes
- The `AWS_ENDPOINTS` env var (plural) in the credential secret is correct — Longhorn uses this name even though AWS's own SDK conventions use `AWS_ENDPOINT_URL`. Leaving it empty for AWS S3 is also correct.
- The S3 backup target URL format `s3://<bucket>@<region>/` (with trailing slash and `@region`) is correct and version-stable.
- The `RecurringJob` CRD fields (`cron`, `task`, `retain`, `concurrency`, `labels`) and the volume association label format `recurring-job.longhorn.io/<name>=enabled` are correct for `longhorn.io/v1beta2`.
- The bash for-loop that labels every Longhorn volume with `recurring-job.longhorn.io/daily-backup=enabled` is technically valid, but readers should be cautioned that this opts in *every* volume, including system/test volumes — a label-selector or explicit list is usually safer in production. Not changed since it is functionally correct and the post calls it a "script" example.
- The Longhorn API endpoint `http://longhorn-frontend.longhorn-system.svc/v1/backupvolumes/<volume>/backups` referenced in the curl example is the internal cluster service URL; readers will need to port-forward or access from in-cluster. Left as-is since the post implies API usage.
- "Check Integrity" in the UI section is hedged with "if available" — Longhorn does have backup verification via restore-and-checksum approaches but no single-click "Check Integrity" button in the standard UI; the hedging keeps the statement defensible.
