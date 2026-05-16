# Validation Summary: How to Migrate Storage Between Nodes on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (immutable, API-driven Kubernetes OS)
- `talosctl` CLI (disks, usage, mounts, apply-config)
- Talos machine configuration (`machine.disks`)
- Kubernetes (`kubectl cordon`, `kubectl drain`, `kubectl exec`, `kubectl cp`)
- Kubernetes StorageClass (`storage.k8s.io/v1`)
- Kubernetes PersistentVolumeClaim and PodDisruptionBudget (`policy/v1`)
- VolumeSnapshot API (`snapshot.storage.k8s.io/v1`)
- Longhorn (CRD `replicas.longhorn.io`)
- Rook-Ceph, OpenEBS LocalPV, TopoLVM, NFS (mentioned)
- PostgreSQL (`pg_dump` / `psql` for logical backup)
- Rancher local-path-provisioner

## Sources Consulted
- Talos v1alpha1 config reference — https://www.talos.dev/v1.8/reference/configuration/v1alpha1/config/
- Talos Disk Management / Layout docs — https://www.talos.dev/v1.12/talos-guides/configuration/disk-management/layout/
- `talosctl` CLI reference — https://www.talos.dev/latest/reference/cli/
- Kubernetes blog: "Volume Snapshot Moves to GA" (1.20) — https://kubernetes.io/blog/2020/12/10/kubernetes-1.20-volume-snapshot-moves-to-ga/
- `kubectl drain` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Longhorn CRDs (deploy/longhorn.yaml) — https://github.com/longhorn/longhorn

## Issues Found
1. **Talos disk partition `size: 0`** — The original snippet used `size: 0  # Use entire disk` for `machine.disks[].partitions[].size`. According to the official Talos config reference, the documented way to allocate the rest of the disk to a partition is to **omit** the `size` field entirely ("If `size:` is omitted, the partition is sized to occupy the full disk"). While `size: 0` may work in practice as an undocumented shorthand, it is not the documented convention. **Fix:** Removed the `size: 0` line and replaced it with a comment indicating that omitting `size` allocates the rest of the disk.

## Review Notes
- All `talosctl` commands shown (`disks`, `usage /var`, `mounts`, `apply-config --file`) are valid and use correct flag syntax (`-n <node>` for endpoint selection).
- `kubectl drain --delete-emptydir-data` is the current (non-deprecated) flag; the older `--delete-local-data` was removed in newer Kubernetes versions.
- `snapshot.storage.k8s.io/v1` is the correct GA API for `VolumeSnapshot` (since Kubernetes 1.20).
- `policy/v1` for `PodDisruptionBudget` is the GA API (since Kubernetes 1.21).
- The Longhorn `replicas.longhorn.io` CRD and the queried fields (`spec.nodeID`, `status.currentState`) match the upstream Longhorn manifest.
- Minor caveat (not corrected, as it is a documented limitation rather than an error): the Method 3 "temporary pod for data copy" approach mounts two PVCs in one pod. With `ReadWriteOnce` PVCs across different nodes, both PVCs must be schedulable on the same node — the in-code comment hints at this ("Use node affinity to schedule on the source node first"), but no actual `nodeAffinity` block is included. Readers using this pattern with multi-node local storage may need to add explicit affinity or use `ReadWriteMany`/snapshot flows.
- Minor caveat (not corrected): Rancher's `local-path-provisioner` (used as `storageClassName: local-path` in the snapshot example) does not itself implement CSI snapshots. Readers using snapshots in practice need a CSI driver that supports `VolumeSnapshotClass` (e.g., OpenEBS, TopoLVM, Longhorn, Rook-Ceph). The example reads as illustrative.
- `pg_dump`/`psql` example uses the local-shell redirection `> backup.sql` after `kubectl exec`, which is correct (stdout from `kubectl exec` is captured on the client side).
