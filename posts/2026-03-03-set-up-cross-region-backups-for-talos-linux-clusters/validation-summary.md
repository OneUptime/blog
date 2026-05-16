# Validation Summary: How to Set Up Cross-Region Backups for Talos Linux Clusters

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- Talos Linux (talosctl)
- Kubernetes (CronJob, etcd snapshots)
- AWS S3 (Cross-Region Replication, IAM, versioning)
- Velero (multi-location backup configuration)
- MinIO (bucket replication, mc client)
- Bash shell scripting

## Sources Consulted
- Talos disaster recovery docs — https://docs.siderolabs.com/talos/v1.9/build-and-extend-talos/cluster-operations-and-maintenance/disaster-recovery
- Talos machine configuration editing — https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/editing-machine-configuration
- Velero customize installation / BSL docs — https://velero.io/docs/main/customize-installation/
- MinIO `mc replicate add` (community edition) — https://docs.min.io/community/minio-object-store/reference/minio-mc/mc-replicate-add.html
- AWS CLI `s3api put-bucket-replication` reference — https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-replication.html
- AWS S3 ReplicationRule API reference — https://docs.aws.amazon.com/AmazonS3/latest/API/API_ReplicationRule.html
- AWS Storage Blog on delete marker replication — https://aws.amazon.com/blogs/storage/managing-delete-marker-replication-in-amazon-s3/

## Issues Found

1. **MinIO `mc replicate add` syntax** — The original command passed `--remote-bucket site-b/talos-backups` (an alias/bucket path), which is not accepted by the community/standard `mc` client. Only the AIStor enterprise client accepts that form. Fixed by changing `--remote-bucket` to a URL containing the credentials (`http://admin:password@minio-site-b:9000/talos-backups`), which is the documented community form. Also added explicit `mc version enable` calls on both buckets, since bucket replication requires versioning.

2. **`talosctl get machineconfig -o yaml` export** — The original script wrote the raw output of `talosctl get machineconfig -o yaml` directly to a backup file. That output is a COSI resource wrapper with the actual configuration nested under `.spec`, so the file as written is not directly re-appliable. Fixed by piping through `yq '.spec'` to extract the usable machine config YAML, plus a one-line comment explaining why.

## Review Notes

- `talosctl -n <ip> etcd snapshot <path>` and `talosctl bootstrap --recover-from=<snapshot>` were both verified as valid in current Talos releases (v1.9). `--recover-from` handles snapshot ingestion as part of bootstrap, so no separate `talosctl etcd recover` step is required when the snapshot was created via `talosctl etcd snapshot`. If a reader ever uses a snapshot copied directly from the etcd data directory, they would additionally need `--recover-skip-hash-check`, but that is out of scope for this post.
- The AWS S3 V2 replication configuration (with `Filter: {}`, `Priority`, and `DeleteMarkerReplication.Status: Enabled`) is valid per current API docs.
- The Velero CLI commands (`backup-location create`, `schedule create`, `backup create`, `restore create`) and their flags (`--provider`, `--bucket`, `--config region=...`, `--default`, `--storage-location`, `--ttl`, `--schedule`, `--include-namespaces`, `--from-backup`) all match current Velero docs.
- The architecture ASCII diagram is slightly imprecise — it draws an arrow from the cluster to the Region B replica bucket, while replication actually flows from the primary bucket (shown below) to the replica. The textual description that follows clarifies the correct flow, so I left the diagram alone rather than restructuring it.
- The hardcoded `admin:password` credentials in the MinIO example are obviously placeholders; readers in production should swap in scoped service-account credentials and use HTTPS endpoints.
