# Validation Summary: How to Configure Longhorn Disaster Recovery Volumes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Longhorn (distributed block storage for Kubernetes)
- Kubernetes (PersistentVolume, PersistentVolumeClaim, CSI)
- Longhorn CRDs: `Volume`, `RecurringJob`, `Setting` (`longhorn.io/v1beta2`)
- S3 / NFS / Azure Blob / GCS as backup targets
- kubectl (label, patch, apply commands)

## Sources Consulted
- Longhorn official documentation — DR volumes: https://longhorn.io/docs/1.7.2/advanced-resources/disaster-recovery/dr-volume/
- Longhorn official documentation — Recurring snapshots and backups: https://longhorn.io/docs/1.7.2/snapshots-and-backups/scheduling-backups-and-snapshots/
- Longhorn Volume CRD reference (`longhorn.io/v1beta2`): https://longhorn.io/docs/1.7.2/references/longhorn-manager-api/
- Longhorn static provisioning guide (PV/PVC with `csi.driver.longhorn.io`): https://longhorn.io/docs/1.7.2/nodes-and-volumes/volumes/create-a-volume/
- Longhorn Settings reference (`backup-target`, `backup-target-credential-secret`): https://longhorn.io/docs/1.7.2/references/settings/
- Kubernetes CSI persistent volume reference: https://kubernetes-csi.github.io/docs/

## Issues Found
- **PV `volumeAttributes` field for the activated DR volume was incorrect.** The example used `storage.kubernetes.io/csiProvisionerIdentity: driver.longhorn.io`, which is a system-managed attribute populated by the CSI external-provisioner during dynamic provisioning — it should not be set manually on a statically defined PV. Replaced it with the Longhorn-recommended attributes for static provisioning: `numberOfReplicas: "2"` and `staleReplicaTimeout: "2880"`, which match the official Longhorn static-PV examples.

## Review Notes
- The `apiVersion: longhorn.io/v1beta2` is the current API for Longhorn 1.3+.
- `RecurringJob` fields (`cron`, `task: "backup"`, `retain`, `concurrency`) and the `recurring-job.longhorn.io/<job-name>=enabled` label syntax are correct.
- Volume CRD spec fields (`size` in bytes as a string, `numberOfReplicas`, `fromBackup`, `standby: true`, `accessMode: rwo`) match the Longhorn schema.
- The `fromBackup` URL form `s3://bucket@region/?volume=<name>` is accepted for DR volumes — Longhorn will sync from the latest backup of the named source volume. A more specific form `s3://bucket@region/?backup=<backup-name>&volume=<name>` is also valid; the post's simpler form is fine.
- The `kubectl patch settings.longhorn.io <name> -p '{"value": "..."}'` pattern is correct because Longhorn `Setting` CRs store the value at the top level (no `spec` wrapper).
- `storageClassName: longhorn` on the static PV will function because the PVC binds via `volumeName`, but using a dedicated `longhorn-static` StorageClass (with no provisioner side-effects) is the documented best practice. Left unchanged to preserve the author's structure.
- The architecture diagram is a simplified representation — DR volume sync is mediated through the shared backup target, not a direct cluster-to-cluster channel — but the diagram already shows the backup target between clusters, so it is accurate.
