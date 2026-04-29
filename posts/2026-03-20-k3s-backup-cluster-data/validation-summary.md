# Validation Summary: How to Back Up K3s Cluster Data

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- SQLite
- etcd and K3s etcd snapshots
- S3-compatible object storage
- systemd
- cron

## Sources Consulted
- K3s Backup and Restore: https://docs.k3s.io/datastore/backup-restore
- K3s `etcd-snapshot` CLI docs: https://docs.k3s.io/cli/etcd-snapshot
- K3s Cluster Datastore docs: https://docs.k3s.io/datastore
- K3s `token` CLI docs: https://docs.k3s.io/cli/token
- K3s Advanced Options / Configuration: https://docs.k3s.io/advanced
- K3s CLI source for `etcd-snapshot` flags: https://github.com/k3s-io/k3s/blob/master/pkg/cli/cmds/etcd_snapshot.go
- K3s CLI source for server snapshot flags: https://github.com/k3s-io/k3s/blob/master/pkg/cli/cmds/server.go

## Issues Found
- The introduction described K3s as having only two datastore backends. I corrected this to include external datastores, because the official datastore documentation lists embedded SQLite, embedded etcd, and external databases.
- The SQLite backup section copied only `state.db`. I changed it to back up `/var/lib/rancher/k3s/server/db/`, matching the K3s backup and restore guidance for SQLite.
- The backup examples used `node-token` and `cred`, but the official restore requirement is the server token at `/var/lib/rancher/k3s/server/token`. I updated the examples and conclusion accordingly.
- The external datastore bullet omitted MariaDB. I added MariaDB to match the supported external datastores in the K3s datastore docs.
- The cron example implied a general backup workflow but only handled embedded etcd, created unpruned on-demand snapshots, and copied `node-token`. I narrowed it to embedded etcd, switched it to a stable snapshot prefix plus `k3s etcd-snapshot prune`, and updated it to back up the server token.
- The cleanup `find` command did not exclude the backup root directory. I added `-mindepth 1` so only child backup directories are eligible for deletion.

## Review Notes
- K3s supports S3 configuration via Kubernetes Secret in current releases, which is more secure than hardcoding credentials in config files or CLI flags. The post's inline credential examples remain valid, so no change was required for correctness.
- Built-in scheduled etcd snapshots are generally preferable to wrapping `k3s etcd-snapshot save` in cron, because K3s already provides scheduling and retention controls for embedded etcd.
