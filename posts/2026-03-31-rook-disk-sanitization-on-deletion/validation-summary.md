# Validation Summary: How to Configure Disk Sanitization on Rook-Ceph Cluster Deletion

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Kubernetes (container orchestration)
- CephCluster CRD (`ceph.rook.io/v1`)
- `cleanupPolicy.sanitizeDisks` API

## Sources Consulted
- Rook CephCluster CRD types: https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go (lines 3413-3455 for `CleanupPolicySpec` and `SanitizeDisksSpec`)
- Rook cleanup API constants: https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/cleanup.go (confirmation string, method/dataSource enums)
- Rook disk sanitization implementation: https://github.com/rook/rook/blob/master/pkg/daemon/ceph/cleanup/disk.go (uses `shred` for `complete`, `ceph-volume lvm zap` for `quick`)
- Rook operator cleanup Job creation: https://github.com/rook/rook/blob/master/pkg/operator/ceph/cluster/cleanup.go (creates batch Jobs per node, not DaemonSets)
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Ceph teardown documentation: https://rook.io/docs/rook/latest/Storage-Configuration/ceph-teardown/

## Issues Found

### 1. Cleanup mechanism incorrectly described as DaemonSet
- **What was wrong:** The post stated "Rook launches a cleanup DaemonSet" and used `kubectl get daemonset` to monitor it.
- **What was changed:** Corrected to "Rook launches cleanup Jobs (one per node)" and changed the kubectl command from `get daemonset` to `get job`.
- **Why:** The Rook operator creates individual Kubernetes batch Jobs (one per node via NodeSelector), not a DaemonSet. Source: `pkg/operator/ceph/cluster/cleanup.go`.

### 2. Example log output referenced `dd` instead of `shred`
- **What was wrong:** The example output showed `dd: '/dev/sdb': writing... pass 1 of 3 complete`, implying the `dd` command is used.
- **What was changed:** Replaced with `shred`-style output (`shred: /dev/sdb: pass 1/3 (random)...`).
- **Why:** The `complete` sanitization method uses the `shred` utility, not `dd`. The `shred` command is invoked with `--force --verbose --iterations=N` flags. Source: `pkg/daemon/ceph/cleanup/disk.go`.

### 3. `quick` method description was inaccurate
- **What was wrong:** The table described `quick` as wiping "Only the Ceph data partitions and superblock."
- **What was changed:** Corrected to "Ceph metadata via ceph-volume lvm zap."
- **Why:** The `quick` method runs `ceph-volume lvm zap <disk>`, which removes Ceph and LVM metadata. It does not target "data partitions and superblock" specifically. Source: `pkg/daemon/ceph/cleanup/disk.go`.

## Review Notes
- The YAML configuration (apiVersion, kind, field names, field values) is all correct per the CRD type definitions.
- The `confirmation: "yes-really-destroy-data"` value is verified correct (the only non-empty value accepted per kubebuilder validation).
- The `iteration` field is correctly singular (matches the JSON tag `"iteration"` in the Go struct).
- The `dataSource` values `zero` and `random` are correct. Implementation detail: `zero` passes `--random-source=/dev/zero` to shred; `random` uses shred's default entropy source and adds a final `--zero` pass.
- The label selector `app=rook-ceph-cleanup` is correct for finding cleanup pods.
- Time estimates are reasonable ballpark figures but will vary significantly by hardware.
- The compliance references (DoD 5220.22-M, NIST 800-88) are used appropriately as general guidance. Note that NIST 800-88 actually recommends cryptographic erase or physical destruction for SSDs rather than overwrite passes.
