# Validation Summary: How to Handle Full CephFS Filesystems

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Rook-Ceph (Kubernetes operator for Ceph)
- CephFS (Ceph distributed filesystem)
- Ceph OSD full ratios and capacity management
- Ceph subvolume quotas
- Prometheus alerting rules
- Kubernetes (kubectl exec into toolbox pods)

## Sources Consulted
- Ceph FS Volumes and Subvolumes documentation: https://docs.ceph.com/en/latest/cephfs/fs-volumes/
- Ceph FS Quotas documentation: https://docs.ceph.com/en/latest/cephfs/quota/
- Ceph OSD full ratio configuration: https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/
- Ceph MGR Prometheus module source (metric names): https://github.com/ceph/ceph/blob/main/src/pybind/mgr/prometheus/module.py
- Ceph subvolume resize implementation: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/volumes/fs/operations/versions/subvolume_v2.py
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/

## Issues Found

### 1. Incorrect command for identifying large directories (Step 3)
- **What was wrong:** The post used `ceph tell mds.myfs:0 dirfrag ls /volumes` to find the largest space consumers. The `dirfrag ls` command is a low-level MDS admin command that shows directory fragmentation metadata (how directories are sharded across MDS), not directory sizes or space usage. It is not useful for capacity analysis.
- **What was changed:** Replaced with `ceph fs subvolume ls myfs --group_name <groupname>`, which lists subvolumes and is the correct starting point for identifying space consumers in a CephFS environment managed by Rook.

### 2. Incorrect `--group_name` syntax in `ceph fs subvolume info` (Step 3)
- **What was wrong:** The group name was passed as a positional argument: `ceph fs subvolume info myfs <subvolname> <groupname>`.
- **What was changed:** Fixed to use the named option: `ceph fs subvolume info myfs <subvolname> --group_name <groupname>`. Per the Ceph docs, `--group_name` is an optional named parameter, not positional.

### 3. Incorrect size format and `--group_name` syntax in `ceph fs subvolume resize` (Step 5)
- **What was wrong:** The command `ceph fs subvolume resize myfs <subvolname> 100G --no_shrink <groupname>` had three issues: (a) `100G` is not accepted — the command requires size in bytes, (b) `<groupname>` was a bare positional arg instead of `--group_name <groupname>`, and (c) `--no_shrink` was placed before the group name arg.
- **What was changed:** Fixed to `ceph fs subvolume resize myfs <subvolname> 107374182400 --group_name <groupname> --no_shrink`. The size is now in bytes (107374182400 = 100 GiB), group name uses the correct flag, and `--no_shrink` is properly placed at the end.

## Review Notes
- The default full ratios (nearfull 85%, backfillfull 90%, full 95%) are correct for Ceph defaults.
- The emergency procedure of raising `set-full-ratio` to 0.97 is a well-known operational practice. The post could additionally mention raising `set-backfillfull-ratio` to ensure backfill operations don't interfere during recovery, but this is not an error.
- The Prometheus metric names (`ceph_cluster_total_used_bytes`, `ceph_cluster_total_bytes`) are verified correct per the Ceph MGR prometheus module source.
- The CephFS quota extended attributes (`ceph.quota.max_bytes`, `ceph.quota.max_files`) are correct per the CephFS quota documentation.
- The Rook `CephCluster` CRD YAML uses the correct API version (`ceph.rook.io/v1`) and storage node specification format.
