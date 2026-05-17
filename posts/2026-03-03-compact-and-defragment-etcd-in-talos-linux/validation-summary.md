# Validation Summary: How to Compact and Defragment etcd in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (Sidero Labs)
- talosctl CLI (`etcd status`, `etcd defrag`, `etcd snapshot`, `etcd alarm`, `logs`)
- etcd v3.5.x (etcdctl, compaction, defragmentation, backend quota)
- Kubernetes (kube-apiserver flags, Pod, CronJob, hostPath volume, nodeSelector, tolerations)
- kubectl

## Sources Consulted
- Talos CLI reference (https://docs.siderolabs.com/talos/v1.7/reference/cli/) — confirms `talosctl etcd defrag`, `talosctl etcd status`, `talosctl etcd snapshot <path>`, `talosctl etcd alarm` subcommands
- Talos etcd maintenance guide (https://docs.siderolabs.com/talos/v1.7/build-and-extend-talos/cluster-operations-and-maintenance/etcd-maintenance) — confirms etcd default space quota of 2 GiB and recommended maximum of 8 GiB; confirms kube-apiserver performs automatic compaction; confirms `talosctl etcd alarm disarm` is required after raising the quota
- etcd v3.5 maintenance docs (https://etcd.io/docs/v3.5/op-guide/maintenance/) — confirms compaction only marks space free internally and defragmentation is what reclaims disk space; confirms defragmentation blocks reads/writes on the live member
- Kubernetes kube-apiserver reference (https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/) — confirms `--etcd-compaction-interval` flag with default `5m0s`
- Talos source / community references for `/system/secrets/etcd/` PKI layout (`ca.crt`, `server.crt`, `server.key`, `peer.crt`, `peer.key`) — confirms the hostPath and file names used in the maintenance pod manifest

## Issues Found
- **Default etcd space quota was incorrect.** The post originally stated "The default space quota in many configurations is 8GB". The actual etcd default backend quota is **2 GiB**; 8 GiB is the recommended **maximum**, not the default. Updated the Best Practices section to state the 2 GiB default and 8 GiB recommended maximum, and to mention that the NOSPACE alarm must be cleared with `talosctl etcd alarm disarm` after raising the quota (per Talos docs).

## Review Notes
- All `talosctl etcd` commands used in the post (`status`, `defrag`, `snapshot <path>`, `logs etcd`) verified against the Talos v1.7 CLI reference.
- Description of compaction (marks revisions free, no shrink on disk) and defragmentation (rewrites DB file, blocks the member) matches the official etcd v3.5 maintenance docs.
- The `--etcd-compaction-interval` flag is correctly attributed to the kube-apiserver (not etcd itself), with the documented default of 5m.
- The maintenance Pod and CronJob manifests are syntactically valid Kubernetes objects (`apiVersion: v1` / `batch/v1`, correct tolerations and nodeSelector syntax, `hostNetwork: true` to reach `127.0.0.1:2379`).
- The hostPath `/system/secrets/etcd` and file names `ca.crt`, `peer.crt`, `peer.key` match Talos's etcd PKI layout. The peer cert/key are signed by the same CA as `ca.crt` and work for client authentication in Talos's etcd setup; a dedicated client cert would be more idiomatic, but the documented approach functions correctly.
- The etcd image tag `gcr.io/etcd-development/etcd:v3.5.12` is valid and the registry is correct (official etcd team registry). Newer v3.5.x point releases exist (v3.5.13+); readers running the snippet in 2026 may want to bump the tag, but the example remains functional.
- The CronJob schedule `"0 3 * * 0"` correctly resolves to 03:00 every Sunday.
- The snapshot example `talosctl -n 192.168.1.10 etcd snapshot /backup/pre-maintenance.snapshot` correctly streams the snapshot to a path on the local machine running talosctl (the path is local, not on the node).
- The "DB Size" vs "DB In Use" output description matches the fields returned by `talosctl etcd status` / `etcdctl endpoint status`.
- Whether the maintenance Pod will actually mount `/system/secrets/...` depends on the Pod Security Admission level configured for `kube-system`; on default Talos installs this typically works, but operators with restricted PSA on `kube-system` would need to adjust labels or use a different namespace. Not a factual error in the post, but worth flagging as a deployment caveat.
