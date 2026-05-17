# Validation Summary: How to Configure Redundant Control Plane Nodes in Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (talosctl CLI, machine config v1alpha1)
- Kubernetes control plane (kube-apiserver, kube-scheduler, kube-controller-manager)
- etcd (membership, snapshots, tuning, recovery)
- VIP / load balancer for the Kubernetes API endpoint
- Prometheus / kube-prometheus-stack PrometheusRule CRD
- etcdctl (for inspecting snapshot files)

## Sources Consulted
- Talos `talosctl` CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos control plane internals: https://www.talos.dev/v1.11/learn-more/control-plane/
- Talos disaster recovery (etcd snapshot/restore): https://www.talos.dev/v1.10/advanced/disaster-recovery/
- Talos v1alpha1 config reference (`cluster.etcd.*`, `cluster.allowSchedulingOnControlPlanes`, `DeviceVIPConfig`): https://docs.siderolabs.com/talos/v1.10/reference/configuration/v1alpha1/config/
- Talos multihoming / `advertisedSubnets` / `listenSubnets`: https://www.talos.dev/v1.11/talos-guides/network/multihoming/
- Talos "Resetting a Machine" guide (`talosctl reset --graceful`): https://www.talos.dev/v1.10/talos-guides/resetting-a-machine/
- etcd documentation (`etcdctl snapshot status`, election-timeout/heartbeat-interval, auto-compaction)
- Kubernetes kube-apiserver / kube-controller-manager flag references for `default-not-ready-toleration-seconds`, `default-unreachable-toleration-seconds`, `node-monitor-period`, `node-monitor-grace-period`

## Issues Found

1. **Invalid `talosctl etcd snapshot status` subcommand.** The post used `talosctl etcd snapshot status db.snapshot` to verify a snapshot. This subcommand does not exist in talosctl — `talosctl etcd snapshot` only takes a local path argument and downloads the snapshot. Snapshot metadata inspection is an `etcdctl` operation. Replaced with `etcdctl --write-out=table snapshot status db.snapshot`.

2. **Incorrect claim that all control plane components run as static pods.** The post stated "Talos Linux runs all of these components as static pods managed by the Talos runtime, not by Kubernetes itself." In reality, only kube-apiserver, kube-scheduler, and kube-controller-manager run as static pods (managed by the kubelet). etcd is started directly by Talos (machined) as a service outside Kubernetes. Reworded to reflect this distinction.

3. **Misleading "rotate certificates" framing for `talosctl gen secrets`.** The post presented `talosctl gen secrets --from-controlplane-config` as a way to rotate certificates. That command does not rotate anything on a running cluster — it extracts/generates a secrets bundle from an existing controlplane config (used for backup or regenerating machine configs). Reworded the surrounding text to describe what the command actually does, and replaced the shell redirect `> secrets.yaml` (the command does not write to stdout) with the `-o secrets.yaml` flag.

## Review Notes

- The `cluster.etcd.extraArgs` settings (`election-timeout`, `heartbeat-interval`, `snapshot-count`, `auto-compaction-mode`, `auto-compaction-retention`) are valid etcd flags and the values are reasonable for on-prem deployments. The post correctly notes cloud environments may need higher values.
- `cluster.etcd.advertisedSubnets` is correctly nested under `cluster.etcd` (matches the Talos schema).
- `machine.network.interfaces[].vip.ip` is the correct VIP configuration field.
- `cluster.allowSchedulingOnControlPlanes: false` is the correct field name (default is already `false`, so this is explicit but harmless).
- `talosctl reset --graceful` works because `--graceful` is a boolean flag that defaults to `true`. For single-node clusters, `--graceful=false` would be required.
- `talosctl bootstrap --recover-from=/path/to/db.snapshot` is the correct disaster-recovery syntax. Users restoring a snapshot copied directly from `/var/lib/etcd/member/snap/db` (rather than via `talosctl etcd snapshot`) may also need `--recover-skip-hash-check` — not strictly required for this post, but worth knowing.
- The Prometheus alert expressions (`up{job="etcd"}`, `etcd_server_has_leader`, `etcd_disk_wal_fsync_duration_seconds_bucket`, `up{job="apiserver"}`) all reference real metrics; the job labels assume the user's scrape config matches.
- The kubelet flag `rotate-server-certificates` is a beta feature and still requires CSR approval (often via an external approver) for server certs to actually rotate — the post doesn't call this out, but the flag itself is valid.
