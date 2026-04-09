# Validation Summary: How to Retrieve MDS Metadata in CephFS

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook-Ceph (Kubernetes operator for Ceph)
- CephFS (Ceph Filesystem)
- MDS (Metadata Server) daemons
- Ceph CLI (`ceph fs status`, `ceph mds metadata`, `ceph tell`, `ceph fs dump`)
- jq (JSON processing)
- kubectl (Kubernetes CLI)

## Sources Consulted
- CephFS Administrative Commands (Ceph Docs): https://docs.ceph.com/en/latest/cephfs/administration/
- MDS Cache Configuration (Reef): https://docs.ceph.com/en/reef/cephfs/cache-configuration/
- Ceph MDS source code (MDSRank.cc, MDSDaemon.cc): https://github.com/ceph/ceph/blob/main/src/mds/MDSRank.cc
- Ceph Perf Counters documentation (Reef): https://docs.ceph.com/en/reef/dev/perf_counters/
- Ceph Multi-Active MDS documentation: https://docs.ceph.com/en/latest/cephfs/multimds/

## Issues Found
- **`cache status` output description was inaccurate**: The post claimed the output "shows memory usage broken down by inode type (directory, file, symlink) and the total cache usage versus the configured limit." In reality, `cache status` dumps mempool statistics for the MDS cache memory pool, which provides memory accounting by mempool category — not a per-inode-type breakdown. Changed the description to accurately reflect the mempool-based output.

## Review Notes
- All Ceph commands used in the post (`ceph fs status`, `ceph mds metadata`, `ceph tell mds.<fsname>:<rank> session ls`, `perf dump`, `cache status`, `dump_historic_ops`, `ceph fs dump`) are valid and current in Ceph Reef and Squid releases.
- The `mds.cephfs:0` addressing format (fsname:rank) is the modern, recommended approach for multi-filesystem environments.
- The `mds_cache_memory_limit` configuration option is correct and is the current recommended way to limit MDS memory (the older `mds_cache_size` inode-count limit is deprecated).
- The perf dump JSON paths (`.mds.inodes`, `.mds.caps`, `.mds.request`) are all verified against the Ceph source code as correct field names.
