# Validation Summary: How to Handle K3s Backup and Restore

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- K3s (lightweight Kubernetes distribution)
- Kubernetes (kubectl, namespaces, deployments, statefulsets, services, configmaps, secrets, ingresses, PVCs, RBAC, CRDs)
- Embedded etcd datastore (snapshots, cluster-reset restore flow)
- SQLite datastore (default single-node K3s)
- External datastores: PostgreSQL (`pg_dump`) and MySQL/MariaDB (`mysqldump`)
- S3-compatible object storage (AWS S3, MinIO, `aws s3 sync`)
- systemd (drop-in overrides for the `k3s.service` unit)
- GPG (asymmetric encryption for backup files)
- Prometheus node_exporter textfile collector
- Slack incoming webhooks (alerting)

## Sources Consulted
- K3s Backup and Restore docs: https://docs.k3s.io/datastore/backup-restore
- K3s `etcd-snapshot` CLI docs: https://docs.k3s.io/cli/etcd-snapshot
- K3s source `pkg/cli/cmds/etcd_snapshot.go` (for canonical and alias S3 flag names)
- K3s server CLI reference for `--cluster-reset` / `--cluster-reset-restore-path`
- kubectl version flag deprecation notes (Kubernetes 1.28 removed `kubectl version --short`)

## Issues Found
1. **Incorrect claim that etcd snapshots work with SQLite.** The post stated *"These commands work with both embedded etcd and SQLite datastores"* and later *"K3s snapshots capture the cluster state stored in etcd or SQLite"*. K3s's built-in `etcd-snapshot` commands only operate on the embedded etcd datastore. SQLite backups are performed by stopping K3s and copying `/var/lib/rancher/k3s/server/db/`. Updated both passages to reflect this and added guidance on how to back up SQLite/external datastores.
2. **Incorrect combination of `--cluster-init` with `--cluster-reset --cluster-reset-restore-path`.** Three restore scripts (`k3s-restore-new-cluster.sh`, `disaster-recovery-full.sh`, and `test-restore.sh`) passed both `--cluster-init` and `--cluster-reset` to `k3s server`. Per the K3s docs, `--cluster-reset --cluster-reset-restore-path` alone bootstraps a new etcd cluster from the snapshot; `--cluster-init` must not be combined with it. Additionally, `--cluster-reset` exits after resetting, so the service must be started normally afterward. Removed `--cluster-init` from all three scripts and added a follow-up `systemctl enable --now k3s` step (with a note about adding `--token=<value>` when restoring to a different host).
3. **Deprecated `kubectl version --short` flag.** The backup manifest used `kubectl version --short`, which was removed in kubectl 1.28+. Replaced with `kubectl version 2>/dev/null | grep 'Server Version'` so the script keeps working on current kubectl releases.

## Review Notes
- The S3 flags used with `k3s etcd-snapshot save` (`--s3`, `--s3-bucket`, `--s3-region`, `--s3-endpoint`, `--s3-access-key`, `--s3-secret-key`) are the canonical names defined in the K3s source; the `--etcd-s3*` variants are accepted aliases. Both forms work.
- The single-node failure recovery snippet that does `rm -rf /var/lib/rancher/k3s/server/db && systemctl start k3s` for a corrupted etcd member is a real but advanced workflow; in production the recommended approach is to also `kubectl delete node` and remove the member from the etcd cluster on a healthy peer before re-adding. Left unchanged because the post frames it as a recovery snippet, not the only path.
- The post says HA multi-node K3s "uses embedded etcd". HA can also be backed by an external datastore (PostgreSQL/MySQL); the post addresses external datastores in a later section, so this simplification is acceptable.
- Default snapshot retention noted in the post (`etcd-snapshot-retention: 24` / `12` in examples) overrides K3s's default of 5 — both are valid configurations and the examples make the override explicit, so no change needed.

## Notes
- None beyond the items above.
