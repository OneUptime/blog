# Validation Summary: How to Purge dataDirHostPath Before Reinitializing Rook-Ceph

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Rook (v1.14.0)
- Ceph (Reef v18.2.x)
- Kubernetes (DaemonSets, kubectl, Helm)
- Linux kernel modules (rbd, ceph)

## Sources Consulted
- Rook official repository at tag v1.14.0: `deploy/examples/cluster.yaml` confirming `dataDirHostPath: /var/lib/rook` default and Ceph Reef v18.2.2 image
- Rook official cleanup job: `deploy/examples/cleanup-job.yaml` confirming cleanup pattern and that `hostPID` is not used
- Ceph source code (`src/mon/MonitorDBStore.h`) confirming RocksDB as the monitor store backend
- Ceph Luminous (v12.x) release notes confirming the LevelDB-to-RocksDB switch for monitors (2017)
- Rook GitHub repository confirming `v1.14.0` tag existence and deploy file paths at `deploy/examples/`

## Issues Found
1. **LevelDB incorrectly stated as monitor store backend (line 26)**: The post described `store.db/` as a "LevelDB database with monitor state." Ceph monitors switched from LevelDB to RocksDB in Ceph Luminous (v12.x, released 2017). Since Rook v1.14.0 ships Ceph Reef (v18.2.2), the monitor store is RocksDB. Fixed to "RocksDB database with monitor state."

2. **Unnecessary `hostPID: true` in cleanup DaemonSet (line 92)**: The DaemonSet spec included `hostPID: true`, which shares the host PID namespace with the pod. This is not needed for file cleanup on a hostPath volume mount -- it grants unnecessary privilege. Rook's own official cleanup job does not use `hostPID`. Removed the `hostPID: true` line.

## Review Notes
- The Rook version referenced (v1.14.0) is valid but may become outdated. The latest Rook releases should be checked when following this guide.
- The `privileged: true` securityContext on the cleanup init container is more permissive than strictly necessary for deleting files, but it avoids potential permission issues across different node configurations and is acceptable for a short-lived cleanup task.
- The post correctly warns against purging during upgrades or recovery scenarios, which is an important distinction.
- The DaemonSet approach for cleanup is a well-known pattern in the Rook community and is preferable to SSH for clusters where direct node access is limited.
