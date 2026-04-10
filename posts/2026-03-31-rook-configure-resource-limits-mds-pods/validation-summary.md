# Validation Summary: How to Configure Resource Limits for Rook-Ceph MDS Pods

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph MDS (Metadata Server)
- CephFS (Ceph Filesystem)
- Kubernetes (resource limits, pod management)

## Sources Consulted
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Filesystem/ceph-filesystem-crd/
- Ceph MDS configuration reference: https://docs.ceph.com/en/latest/cephfs/mds-config-ref/
- Ceph admin socket vs `ceph tell` documentation: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/

## Issues Found

### 1. `ceph daemon` used from the Rook tools pod (monitoring and detection sections)
- **What was wrong:** The monitoring and detection commands used `ceph daemon mds.myfs-a <command>` from within the Rook toolbox pod (`deploy/rook-ceph-tools`). The `ceph daemon` subcommand connects via the local admin socket file (`/var/run/ceph/...asok`), which is only present on the host where the MDS daemon actually runs. The Rook toolbox pod does not mount MDS admin sockets, so these commands would fail with a connection error.
- **What was changed:** Replaced `ceph daemon mds.myfs-a` with `ceph tell mds.myfs-a` in all four affected commands. `ceph tell` routes the admin command through the Ceph monitors, so it works from any pod that has access to the Ceph cluster (including the toolbox).
- **Why:** `ceph tell` is the correct way to issue admin socket commands remotely and is the standard approach in Rook-Ceph environments where daemons run in separate pods.

### 2. Removed unnecessary `python3 -m json.tool` piping after `ceph tell`
- **What was wrong:** The original commands piped `ceph daemon` output through `python3 -m json.tool` for pretty-printing. Since `ceph tell` already outputs formatted JSON, the extra piping is unnecessary.
- **What was changed:** Removed `| python3 -m json.tool` from the `dump_mempools`, `perf dump`, and `dump_ops_in_flight` commands.
- **Why:** Cleaner commands; `ceph tell` output is already human-readable JSON.

## Review Notes
- The CephFilesystem CRD YAML is correct and uses the current `ceph.rook.io/v1` API version.
- The `mds_cache_memory_limit` value of 6442450944 correctly equals 6 GiB (6 x 1073741824), and leaving ~2 GiB headroom below the 8 GiB pod limit is reasonable guidance.
- The MDS resource sizing table provides sensible recommendations, though actual requirements vary by workload pattern (many small files vs. fewer large directories).
- The `activeCount: 2` multi-active MDS configuration is correct for high-throughput scenarios.
- MDS daemon naming (`myfs-a`, `myfs-b`) matches the Rook naming convention.
