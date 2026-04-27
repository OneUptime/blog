# Validation Summary: How to Optimize etcd Performance for Rancher

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- etcd (v3.5)
- Rancher
- RKE (Rancher Kubernetes Engine v1)
- RKE2
- Kubernetes (CronJob, hostNetwork)
- fio (IO benchmarking)
- Prometheus / PromQL
- etcdctl

## Sources Consulted
- etcd Hardware recommendations: https://etcd.io/docs/v3.5/op-guide/hardware/
- etcd Tuning guide: https://etcd.io/docs/v3.5/tuning/
- etcd Maintenance (defrag, compaction): https://etcd.io/docs/v3.5/op-guide/maintenance/
- etcd Metrics reference: https://etcd.io/docs/v3.5/metrics/
- IBM blog "Using fio to Tell Whether Your Storage Is Fast Enough for Etcd"
- RKE1 Nodes config: https://rke.docs.rancher.com/config-options/nodes
- RKE2 Configuration reference: https://docs.rke2.io/install/configuration
- RKE2 Server config reference: https://docs.rke2.io/reference/server_config
- RKE2 Certificate management: https://docs.rke2.io/security/certificates
- Docker Hub `rancher/hardened-etcd` tags: https://hub.docker.com/r/rancher/hardened-etcd/tags

## Issues Found
1. **Mislabeled RKE distribution in Step 1 (lines 32–40)**: The YAML block was commented as `# RKE2 cluster.yaml - dedicated etcd disk`, but the YAML format shown (`nodes:` with `role: [etcd, controlplane]` and `docker_socket: /var/run/docker.sock`) is RKE1 (legacy Rancher Kubernetes Engine) syntax. RKE2 does not use a `cluster.yaml` with that node format. Changed the comment to `# RKE cluster.yml - dedicated etcd disk` so the label matches the syntax shown.

2. **Non-existent Docker image tag in Step 3 CronJob**: The image `rancher/hardened-etcd:v3.5.12` does not exist on Docker Hub. The `rancher/hardened-etcd` repository uses tags of the form `vX.Y.Z-k3sN-buildYYYYMMDD`. Updated the tag to `v3.5.13-k3s1-build20240910`, which matches the actual published tag format.

## Review Notes
- The `fio` command parameters (`--bs=2300`, `--size=22m`, `--ioengine=sync --fdatasync=1`) match the well-known IBM/etcd-community recommendation for measuring fsync latency. The etcd hardware page itself links to the IBM blog rather than specifying the exact flags, but the values are accurate.
- Default `heartbeat-interval` (100ms), default `election-timeout` (1000ms), and the "election timeout >= 10x heartbeat" guidance are all correct per etcd tuning docs.
- `quota-backend-bytes=8589934592` is exactly 8 GiB (8 × 1024³). Correct.
- `auto-compaction-retention=8` with `auto-compaction-mode=periodic` is interpreted as 8 hours (bare integers are treated as hours for backward compatibility). Using the explicit `"8h"` form would be slightly more readable but the current value is valid.
- All Prometheus metric names (`etcd_mvcc_db_total_size_in_bytes`, `etcd_disk_wal_fsync_duration_seconds_bucket`, `etcd_server_leader_changes_seen_total`, `etcd_server_proposals_failed_total`) are correct.
- The defrag CronJob example uses RKE1-style certificate paths (`/etc/kubernetes/ssl/kube-*.pem`). For RKE2 deployments, certs would live at `/var/lib/rancher/rke2/server/tls/etcd/server-*.{crt,key}`. The example is illustrative and would need volume mounts to access host certs/scripts in any case; left as-is since the post mixes RKE1 and RKE2 contexts and the paths are consistent with the RKE1 example in Step 1.
- Minor caveat: `etcdctl defrag` is described as "non-disruptive" — it does block writes on the local member during the operation, so production users typically run it one node at a time. The author's "takes a few seconds" framing is reasonable for small DBs.
