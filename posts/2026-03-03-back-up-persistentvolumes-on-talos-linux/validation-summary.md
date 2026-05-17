# Validation Summary: How to Back Up PersistentVolumes on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Velero (backup tool)
- CSI VolumeSnapshots (`snapshot.storage.k8s.io/v1`)
- Rook Ceph (RBD CSI driver) as the example storage backend
- MinIO (S3-compatible object storage)
- AWS S3
- Kopia / Restic (file-system backups via Velero node-agent)
- Kubernetes CronJob (`batch/v1`)
- PostgreSQL (`pg_dump` example)

## Sources Consulted
- Velero CSI snapshot documentation: https://velero.io/docs/main/csi/
- Velero file-system backup documentation: https://velero.io/docs/main/file-system-backup/
- Velero customize installation documentation: https://velero.io/docs/main/customize-installation/
- Velero restore reference: https://velero.io/docs/main/restore-reference/
- Velero GitHub releases page: https://github.com/vmware-tanzu/velero/releases
- Velero issue tracker (EnableCSI feature flag discussion): https://github.com/vmware-tanzu/velero/issues/6694
- Kubernetes Volume Snapshot API documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes CronJob documentation (batch/v1): https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
1. **Velero CSI plugin no longer installed separately (fixed).** Starting with Velero v1.14, the `velero-plugin-for-csi` repository was merged into the main Velero binary. The Velero docs now state explicitly: "no need to install Velero CSI plugin anymore." Both `velero install` examples (S3 and MinIO) listed `velero/velero-plugin-for-csi:v0.7.0` in `--plugins`. Removed that plugin from both commands, leaving only `velero/velero-plugin-for-aws:v1.9.0`. The `--features=EnableCSI` flag is still required as of v1.18 and was left in place.
2. **Broken Velero download URL (fixed).** The post used `https://github.com/vmware-tanzu/velero/releases/latest/download/velero-linux-amd64.tar.gz`, which returns 404 — Velero does not publish an unversioned `latest` asset. All release assets are versioned (e.g. `velero-v1.18.0-linux-amd64.tar.gz`) and extract to a directory of the same stem. Replaced the wget snippet with a versioned form using a `VELERO_VERSION=v1.18.0` variable, and updated both the `tar` filename and the `mv` source directory to match the actual extracted folder name.

## Review Notes
- The `--features=EnableCSI` flag is still required in Velero v1.18, but there is an open upstream discussion ([issue #6694](https://github.com/vmware-tanzu/velero/issues/6694)) about removing it in a future release. If/when that happens, the install commands here should be updated.
- v1.18.0 (released March 2025) is the current stable Velero release as of May 2026. The pinned `velero/velero-plugin-for-aws:v1.9.0` plugin remains compatible.
- The `velero.io/csi-volumesnapshot-class: "true"` label, the `backup.velero.io/backup-volumes` pod annotation, all `velero backup`/`schedule`/`restore` flags, and the VolumeSnapshot / PVC `dataSource` manifests are all current and correct.
- The example uses a hardcoded snapshot name with a date (`postgres-snap-20240115`); not technically wrong, just an aesthetic choice — left as-is since the surrounding text is illustrative.
