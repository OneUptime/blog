# Validation Summary: How to Back Up etcd in RKE

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE/RKE1
- Kubernetes
- etcd
- RKE etcd snapshots
- S3-compatible object storage
- Shell scripting and cron

## Sources Consulted
- RKE1 Backups and Disaster Recovery: https://rke.docs.rancher.com/etcd-snapshots
- RKE1 One-time Snapshots: https://rke.docs.rancher.com/etcd-snapshots/one-time-snapshots
- RKE1 Recurring Snapshots: https://rke.docs.rancher.com/etcd-snapshots/recurring-snapshots
- RKE1 Restoring from Backup: https://rke.docs.rancher.com/etcd-snapshots/restoring-from-backup
- RKE v1.8.13 release notes: https://github.com/rancher/rke/releases/tag/v1.8.13
- RKE v1.8.13 CLI source: https://github.com/rancher/rke/blob/v1.8.13/cmd/etcd.go
- RKE v1.8.13 backup config types: https://github.com/rancher/rke/blob/v1.8.13/types/backup_types.go
- RKE Tools v0.1.103 etcd backup implementation: https://github.com/rancher/rke-tools/blob/v0.1.103/main.go
- Local verification with the official RKE v1.8.13 Linux AMD64 binary from GitHub releases (`rke etcd --help` and `rke etcd snapshot-save --help`).

## Issues Found
- RKE1 lifecycle status was missing. Added a short note that RKE1 is in its final/end-of-life phase and that new clusters or migrations should use RKE2.
- The post described local and S3 as separate storage modes. RKE always writes snapshots locally to `/opt/rke/etcd-snapshots` and can also upload them to S3, so the wording was corrected.
- The `safe_timestamp` examples were removed. It is not used by the RKE CLI snapshot path verified in RKE v1.8.13 and the original comment incorrectly described it as adding timestamps.
- The AWS S3 `endpoint` example used an empty value. RKE expects an S3 endpoint in `s3backupconfig`; the example now uses `s3.amazonaws.com`.
- The MinIO endpoint example included `http://`. RKE passes the endpoint to the S3 client as a host/port value, so the example now uses `minio.example.com:9000`.
- The S3 and MinIO examples were in one YAML document with duplicate top-level `services` keys. They are now separate snippets.
- The `rke etcd snapshot-list` command was incorrect. RKE v1.8.13 only exposes `snapshot-save` and `snapshot-restore`, so the post now lists local snapshot files on an etcd node with `sudo ls`.
- The post suggested checking `/var/lib/rancher/etcd/` for snapshots. That is the etcd data directory, not the RKE snapshot directory, so it was removed.
- The snapshot verification commands assumed a normal user could `scp` root-owned snapshot archives and used the wrong extracted path. The example now copies via `sudo cat`, unzips the archive, and runs `etcdctl snapshot status` against `/tmp/etcd-verify/backup/${SNAPSHOT_NAME}`.
- The automated script logged to `/var/log` while the cron example ran as `ubuntu`. The log path was changed to `/home/ubuntu/rke/rke-backup.log` so the example can run without root-owned log setup.

## Review Notes
RKE snapshots are zip archives containing the etcd snapshot and, in newer RKE versions, the cluster state file. The post now matches the current RKE1 CLI surface and RKE Tools snapshot archive behavior. RKE1 remains usable for existing clusters, but it should be treated as legacy/EOL technology.
