# Validation Summary: How to Use Longhorn with Velero for Backup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Velero
- Longhorn
- Kubernetes
- Kubernetes CSI `VolumeSnapshot` / `VolumeSnapshotClass`
- AWS S3 / S3-compatible object storage
- `kubectl` and Velero CLI

## Sources Consulted
- Velero CSI Support (v1.18) — https://velero.io/docs/v1.18/csi/
- Velero Customize Installation — https://velero.io/docs/main/customize-installation/
- Velero Backup Hooks — https://velero.io/docs/v1.17/backup-hooks/
- Velero Troubleshooting — https://velero.io/docs/v1.18/troubleshooting/
- Velero releases — https://github.com/velero-io/velero/releases
- Velero AWS plugin README — https://github.com/velero-io/velero-plugin-for-aws
- Velero AWS plugin releases — https://github.com/velero-io/velero-plugin-for-aws/releases
- Longhorn CSI VolumeSnapshot Associated with Longhorn Backup — https://longhorn.io/docs/1.11.1/snapshots-and-backups/csi-snapshot-support/csi-volume-snapshot-associated-with-longhorn-backup/
- Longhorn Enable CSI Snapshot Support on a Cluster — https://longhorn.io/docs/1.11.1/snapshots-and-backups/csi-snapshot-support/enable-csi-snapshot-support/
- Longhorn Setting a Backup Target — https://longhorn.io/docs/latest/snapshots-and-backups/backup-and-restore/set-backup-target/
- Kubernetes Volume Snapshots — https://kubernetes.io/docs/concepts/storage/volume-snapshots/

## Issues Found
1. The post used outdated Velero installation details. It referenced Velero `v1.13.0`, AWS plugin `v1.9.0`, a separate CSI plugin image, and `--credentials-file`. I updated it to Velero `v1.18.0`, AWS plugin `v1.14.0`, removed the separate CSI plugin install, changed the flag to `--secret-file`, and added `--wait`.
2. The backup flow description was inaccurate for Longhorn. The original text implied Velero uploads snapshot data to object storage, but Velero uploads Kubernetes backup metadata while the actual snapshot or backup data stays in the storage system. I corrected the workflow description and clarified the split between Velero metadata storage and Longhorn volume-data storage.
3. The `VolumeSnapshotClass` was configured for local snapshots, not Longhorn backups. I changed it to use `parameters.type: bak`, renamed it accordingly, and updated the prerequisites/text to require a configured Longhorn backup target so the example actually creates off-cluster volume backups.
4. The test commands could run before the workload was ready. I added `kubectl rollout status` before writing test data and before checking restored data.
5. The backup hook example attached annotations to `Deployment.metadata`, which Velero does not use for pod backup hooks. I moved them to `spec.template.metadata.annotations`, added explicit container annotations, and made the snippet a valid deployment spec.
6. The wording around consistency was overstated. I removed claims that implied application-consistent backups happen automatically and clarified that backup hooks add workload-specific preparation steps.

## Review Notes
- The article now accurately describes the Longhorn `type: bak` flow, where Longhorn stores PVC data in its backup target and Velero stores cluster-resource metadata in object storage.
- The S3 commands shown are AWS-specific examples. Other S3-compatible providers may require extra Velero backup-location configuration such as custom endpoints, path-style access, or CA settings.
- `--use-node-agent` is not required for the specific Longhorn `type: bak` workflow shown here; it is relevant for file system backup and CSI Snapshot Data Movement.
