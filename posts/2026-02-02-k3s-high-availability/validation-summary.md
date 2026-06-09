# Validation Summary: How to Configure K3s High Availability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- K3s (lightweight Kubernetes distribution)
- Kubernetes (kubectl, control plane, kubelet)
- etcd (embedded datastore, snapshots, quorum)
- PostgreSQL (external datastore option)
- HAProxy (layer-4 TCP load balancing)
- Keepalived (VRRP-based virtual IP failover)
- Prometheus / kube-state-metrics (alerting rules)
- systemd (service management, drop-in overrides)
- Flannel VXLAN (default K3s CNI)

## Sources Consulted
- K3s documentation: https://docs.k3s.io
- K3s HA Embedded etcd: https://docs.k3s.io/datastore/ha-embedded
- K3s External Datastore: https://docs.k3s.io/datastore
- K3s `etcd-snapshot` CLI reference: https://docs.k3s.io/cli/etcd-snapshot
- K3s `server` CLI reference: https://docs.k3s.io/cli/server
- K3s Backup & Restore: https://docs.k3s.io/datastore/backup-restore
- Rancher community wiki — using etcdctl with K3s embedded etcd: https://github.com/rancher/rancher/wiki/How-to-Use-Etcdctl-with-K3s-Embedded-Etcd
- HAProxy documentation: https://www.haproxy.org/documentation.html
- Keepalived documentation: https://keepalived.readthedocs.io/
- etcd releases (etcdctl distribution): https://github.com/etcd-io/etcd/releases

## Issues Found

1. **Invalid `k3s etcd-snapshot info` subcommand (two occurrences).** The `k3s etcd-snapshot` CLI supports only `save`, `delete`, `ls`/`list`, and `prune`. There is no `info` subcommand. Replaced both invocations (in the "Verify etcd Cluster Health" step and in the health-check script) with `k3s etcd-snapshot ls`.

2. **Incorrect claim that K3s ships etcdctl and runs etcd as a pod.** The original code attempted `kubectl exec` into a pod selected by `-l component=etcd` and stated "K3s includes etcdctl in the k3s binary." Both are wrong: K3s embeds etcd directly in the `k3s server` process (not as a static pod), so the `component=etcd` selector returns no results, and `etcdctl` must be installed separately from the upstream etcd release archive. Rewrote the section to use `etcdctl` against `https://127.0.0.1:2379` on a server node with the K3s-generated TLS files, and added a note about the separate install.

3. **Stale `master` role label.** The expected-output comment claimed nodes would show `control-plane,etcd,master`. The `master` role label was deprecated in Kubernetes 1.20 and is no longer applied by current K3s versions — modern K3s server nodes show `control-plane,etcd`. Updated the comment accordingly.

4. **Broken etcd member count in the health-check script.** The script ran `grep -c "member"` against the output of `k3s etcd-snapshot info` (which doesn't exist) — even with the corrected `ls`, that grep would not yield a member count because snapshot listings don't enumerate etcd members. Simplified the check to report whether embedded etcd is reachable (snapshots accessible) instead of fabricating a member count.

## Review Notes
- All server/agent installation flags (`--cluster-init`, `--token`, `--node-ip`, `--tls-san`, `--disable=traefik`, `--disable=servicelb`, `--write-kubeconfig-mode=644`, `--datastore-endpoint`, `--server`, `--node-name`, `--etcd-snapshot-schedule-cron`, `--etcd-snapshot-retention`, `--etcd-snapshot-dir`, `--cluster-reset`, `--cluster-reset-restore-path`) verified against the current K3s server CLI reference.
- K3s default networking values (POD_CIDR `10.42.0.0/16`, SERVICE_CIDR `10.43.0.0/16`, CLUSTER_DNS `10.43.0.10`) and the documented ports (6443, 2379, 2380, 10250, 8472/UDP) are accurate.
- HAProxy and Keepalived configurations are syntactically valid; the VRRP `weight 2` plus priority 101/100 setup correctly favors LB1 as the VIP holder while the haproxy health check is passing.
- PostgreSQL datastore connection-string format (`postgres://user:pass@host:port/db`) matches the K3s `--datastore-endpoint` spec.
- The Prometheus alert expressions reference standard metrics (`kube_node_status_condition`, `kube_node_role` from kube-state-metrics; `etcd_server_has_leader`, `etcd_disk_wal_fsync_duration_seconds_bucket` from etcd; `apiserver_client_certificate_expiration_seconds_*` from kube-apiserver). They will work provided kube-state-metrics and an etcd/apiserver scrape are configured — readers should confirm exporter availability in their stack.
- The certificate file names `client.crt` / `client.key` in the etcd commands exist on most K3s installs; some recent versions also expose `server-client.crt`/`server-client.key`. Either pair works on a current K3s server; left the more common `client.crt`/`client.key` to minimize churn.
