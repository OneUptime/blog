# Validation Summary: How to Handle K3s etcd Maintenance

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- K3s (lightweight Kubernetes distribution)
- etcd (distributed key-value store)
- etcdctl (etcd CLI)
- Kubernetes (kubectl, healthz endpoint)
- Prometheus (metrics, alerting rules)
- Bash scripting / cron
- S3-compatible object storage (for snapshot backups)
- Mermaid diagrams (documentation tooling)

## Sources Consulted
- K3s etcd-snapshot CLI reference: https://docs.k3s.io/cli/etcd-snapshot
- K3s server CLI reference (etcd / S3 flags): https://docs.k3s.io/cli/server
- K3s backup & restore docs: https://docs.k3s.io/datastore/backup-restore
- K3s source code: `pkg/cli/cmds/etcd_snapshot.go` and `pkg/etcd/etcd.go` (github.com/k3s-io/k3s)
- K3s integration tests confirming `/var/lib/rancher/k3s/server/db/etcd/config` path
- K3s custom CA cert script: `contrib/util/generate-custom-ca-certs.sh` (confirms TLS paths)
- etcd official maintenance docs: https://etcd.io/docs/v3.5/op-guide/maintenance/
- Kubernetes kube-apiserver flag reference (`--etcd-compaction-interval` default 5m): https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/

## Issues Found
1. **Invalid `k3s etcd-snapshot info` subcommand.** The post originally used `sudo k3s etcd-snapshot info` as a "K3s built-in" health check. This subcommand does not exist — K3s only defines `save`, `delete`, `ls` (aliases `list`, `l`), and `prune` under `etcd-snapshot` (see `pkg/cli/cmds/etcd_snapshot.go`). Additionally, even if it existed, an `etcd-snapshot` subcommand would not check member health. Replaced the snippet with the actual built-in checks: `kubectl get --raw=/healthz/etcd` for cluster health and `sudo k3s etcd-snapshot ls` as a simple smoke test that the K3s etcd subsystem is responsive.

## Review Notes
- The claim "K3s automatically compacts etcd every 5 minutes" is accurate in effect: K3s disables etcd's internal auto-compaction (`--compact-interval=0s`), but the bundled kube-apiserver compacts revisions every 5 minutes via its default `--etcd-compaction-interval=5m`. So the user-visible behaviour matches the post.
- The YAML config snippets are presented inside ```` ```bash ```` fenced blocks. The content is valid K3s `config.yaml` YAML; only the syntax-highlight hint is suboptimal. Left as-is since the task scope is technical correctness, not stylistic changes.
- K3s defaults referenced in the post: 2 GiB etcd quota (correct), snapshot dir `/var/lib/rancher/k3s/server/db/snapshots` (correct), TLS cert paths under `/var/lib/rancher/k3s/server/tls/etcd/` with `server-ca.crt` / `server-client.crt` / `server-client.key` (correct).
- All S3-related flags (`etcd-s3`, `etcd-s3-endpoint`, `etcd-s3-bucket`, `etcd-s3-region`, `etcd-s3-folder`, `etcd-s3-access-key`, `etcd-s3-secret-key`) and snapshot scheduling flags (`etcd-snapshot-schedule-cron`, `etcd-snapshot-retention`, `etcd-snapshot-dir`) match the documented K3s server options.
- `--cluster-reset` and `--cluster-reset-restore-path` are valid k3s server flags for restoring from a snapshot; the documented procedure (stop k3s, restore on primary, wipe `/var/lib/rancher/k3s/server/db/etcd` on secondaries, restart) is correct.
- etcdctl JSON paths used (`.[0].Status.dbSize` and `.[0].Status.header.revision`) match the actual `etcdctl endpoint status --write-out=json` schema.
- Prometheus metric names (`etcd_mvcc_db_total_size_in_bytes`, `etcd_disk_wal_fsync_duration_seconds_bucket`) are standard etcd-exported metrics and are correct.
