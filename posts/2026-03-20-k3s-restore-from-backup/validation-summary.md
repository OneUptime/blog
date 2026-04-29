# Validation Summary: How to Restore K3s from a Backup

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- SQLite
- embedded etcd
- S3-compatible object storage
- `kubectl`
- `systemd`

## Sources Consulted
- K3s Backup and Restore documentation: https://docs.k3s.io/datastore/backup-restore
- K3s `etcd-snapshot` CLI documentation: https://docs.k3s.io/cli/etcd-snapshot
- K3s `token` CLI documentation: https://docs.k3s.io/cli/token
- K3s `server` CLI documentation: https://docs.k3s.io/cli/server
- K3s rollback documentation: https://docs.k3s.io/upgrades/roll-back

## Issues Found
- The SQLite restore example restored only `state.db`. I changed it to restore the full `/var/lib/rancher/k3s/server/db` directory and the server token because K3s documents both as required for a valid restore.
- The embedded etcd section referred to a nonexistent `etcd-snapshot restore` command. I changed the explanation to the documented `k3s server --cluster-reset --cluster-reset-restore-path=...` restore flow.
- The local embedded-etcd restore examples did not account for clusters that have S3 snapshot settings in `config.yaml`. I added `--etcd-s3=false` so the local snapshot path is used even when S3 settings exist.
- The S3 snapshot listing example did not match the documented CLI form. I updated it to `k3s etcd-snapshot ... ls` and clarified that S3 restores use the snapshot filename instead of a local filesystem path.
- The HA restore example removed only `/var/lib/rancher/k3s/server/db/etcd` on peer servers. I changed it to remove the entire `/var/lib/rancher/k3s/server/db/` directory, which is the documented peer rejoin step after restoring the first server.
- The configuration restore section used the wrong token path (`node-token`) and implied manual TLS restoration for embedded-etcd restores. I corrected the token path to `/var/lib/rancher/k3s/server/token` and noted that K3s rewrites certificate material from the datastore during embedded-etcd restore.

## Review Notes
- The post is technically correct against the K3s documentation consulted on April 29, 2026.
- The examples use inline S3 credentials for demonstration. In production, those values should be handled with more secure configuration practices.
