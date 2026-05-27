# Validation Summary: How to Set Up a Disaster Recovery Plan for GKE Clusters Using Velero

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine
- Google Cloud Storage
- Google Cloud IAM
- Google Cloud Storage Transfer Service
- Velero
- Velero GCP plugin
- Kubernetes Deployments and CronJobs
- PostgreSQL backup hooks

## Sources Consulted
- Velero GCP plugin README: https://github.com/vmware-tanzu/velero-plugin-for-gcp
- Velero install CLI documentation: https://velero.io/docs/main/velero-install/
- Velero v1.17 customize installation documentation: https://velero.io/docs/v1.17/customize-installation/
- Velero backup hooks documentation: https://velero.io/docs/main/backup-hooks/
- Velero v1.17 file system backup documentation: https://velero.io/docs/v1.17/file-system-backup/
- Velero v1.17 backup reference: https://velero.io/docs/v1.17/backup-reference/
- Google Cloud Storage Transfer Service create transfers documentation: https://cloud.google.com/storage-transfer/docs/create-transfers
- Velero GCP BackupStorageLocation configuration: https://github.com/vmware-tanzu/velero-plugin-for-gcp/blob/main/backupstoragelocation.md
- Velero GCP VolumeSnapshotLocation configuration: https://github.com/vmware-tanzu/velero-plugin-for-gcp/blob/main/volumesnapshotlocation.md

## Issues Found
- The GCP IAM setup granted broad Compute Storage Admin and Service Account User roles but omitted the Velero GCP plugin's documented custom permissions, including `iam.serviceAccounts.signBlob`, which is required for commands such as `velero backup logs`, `velero backup describe`, and `velero restore describe`. Replaced this with the official custom role permissions and bucket object admin binding.
- The Velero GCP plugin version was pinned to `v1.9.0`, which corresponds to Velero v1.13.x and is no longer the current documented compatibility target. Updated examples to `velero/velero-plugin-for-gcp:v1.13.0`, compatible with Velero v1.17.x.
- The install examples used `--backup-location-config serviceAccount=...` while also using a service account key file. The GCP plugin documents this option for Workload Identity-style authentication, not key-file installs. Removed the unnecessary backup location service account config from key-file install examples and the additional backup location example.
- The backup hook annotations were placed on the Deployment metadata, but Velero backup hook annotations must be on pods or pod templates. Moved them under `spec.template.metadata.annotations`.
- The hook example described `pg_dump` as flushing PostgreSQL WAL before a snapshot. `pg_dump` creates a logical dump rather than flushing WAL. Adjusted the text and comment to describe it as an application-specific consistency step.
- The hook example included `backup.velero.io/backup-volumes`, which opts the volume into Velero File System Backup and can make Velero skip a volume snapshot for that volume. Removed it because the surrounding commands use volume snapshots.
- The automated DR CronJob used `bitnami/kubectl:latest`, which does not provide the `velero` CLI or `jq` used by the script. Updated the image reference to a custom tools image that includes `kubectl`, `velero`, and `jq`.

## Review Notes
The post now validates as a technically relevant tutorial. For production use, prefer GKE Workload Identity over long-lived service account keys where possible, and build/pin a specific DR test tools image rather than using `latest`.
