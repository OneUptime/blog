# Validation Summary: How to Configure Rook-Ceph for Blue-Green Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (RBD block storage and CephFS)
- Kubernetes VolumeSnapshots (snapshot.storage.k8s.io/v1)
- Kubernetes PersistentVolumeClaims with dataSource (clone from snapshot)
- Kubernetes Deployments and Services
- kubectl CLI
- Ceph CLI tools (ceph status, ceph -w)

## Sources Consulted
- Kubernetes VolumeSnapshot documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes PVC dataSource (volume cloning from snapshots): https://kubernetes.io/docs/concepts/storage/persistent-volumes/#volume-snapshot-and-restore-volume-from-snapshot-support
- Rook-Ceph VolumeSnapshot documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-snapshot/
- Kubernetes Deployment spec: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service spec: https://kubernetes.io/docs/concepts/services-networking/service/
- Ceph CLI reference (ceph status, ceph df, ceph -w): https://docs.ceph.com/en/latest/man/8/ceph/

## Issues Found

### Issue 1: Missing `template.metadata.labels` in Deployment YAML
- **What was wrong:** The Deployment's pod template was missing `metadata.labels`. Kubernetes requires that `spec.selector.matchLabels` matches labels defined in `spec.template.metadata.labels`. The YAML as written would be rejected by the Kubernetes API server with a validation error.
- **What was changed:** Added `metadata.labels` block with `app: myapp` and `version: green` to the pod template, matching the `selector.matchLabels`.
- **Why:** This is a required field per the Kubernetes Deployment spec. Without it, the Deployment cannot be created.

### Issue 2: Incorrect `ceph df | grep green` monitoring command
- **What was wrong:** `ceph df` displays pool-level storage statistics (pool names, usage, available space). PVC names like "green" do not appear in `ceph df` output — Ceph pools have names like `replicapool` or `device_health_metrics`, not PVC-derived names. This command would produce no output.
- **What was changed:** Replaced `watch -n2 "ceph df | grep green"` with `ceph -w` which streams real-time cluster events, including RBD image operations during the clone/restore process.
- **Why:** `ceph -w` is the standard way to monitor ongoing Ceph operations in real time and would actually show relevant activity during a PVC clone from snapshot.

## Review Notes
- The Deployment uses `replicas: 3` with a single ReadWriteOnce PVC (`data-green-db-0`). In a multi-node cluster, pods scheduled on different nodes would fail to mount the RWO volume. This pattern works only if all pods land on the same node (e.g., via node affinity). For production use, readers should either use `replicas: 1` for the database tier, use a StatefulSet with per-replica PVCs, or use ReadWriteMany if the storage backend supports it.
- The `volumeSnapshotClassName: ceph-rbdplugin-snapclass` and `storageClassName: ceph-ha-database` are example names. Readers will need to substitute their actual class names from their Rook-Ceph deployment.
- The post's claim that RBD volume cloning creates an "instant copy" is accurate — Ceph uses copy-on-write for snapshots and clones, so the initial clone operation is near-instant regardless of data size.
- Strategy 2 (ReadWriteMany with CephFS) is correctly presented as an alternative. The `rook-cephfs` StorageClass name and `ReadWriteMany` access mode are appropriate for CephFS.
