# Validation Summary: How to Set Up Multiple Active MDS Daemons in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph / CephFS
- Ceph MDS (Metadata Server) daemons
- Kubernetes (kubectl, CRDs)

## Sources Consulted
- Rook official documentation: CephFilesystem CRD (https://rook.io/docs/rook/latest-release/CRDs/Shared-Filesystem/ceph-filesystem-crd/)
- Rook official documentation: Filesystem Storage (https://rook.io/docs/rook/latest-release/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/)
- Rook example filesystem.yaml (https://github.com/rook/rook/blob/master/deploy/examples/filesystem.yaml)
- Ceph documentation: CephFS MDS configuration and subtree pinning
- Ceph tracker wiki: MDS memory consumption (https://tracker.ceph.com/projects/ceph/wiki/Mds_-_reduce_memory_consumption)
- Ceph blog: New in Luminous - CephFS metadata server memory limits (https://ceph.io/en/news/blog/2017/new-luminous-cephfs-metadata-server-memory-limits/)
- Red Hat Ceph Storage documentation: `ceph fs status` output format

## Issues Found

### 1. Incorrect subtree pinning command
- **What was wrong:** The post used `ceph fs subvolume pin myfs no_fragment_export 0 --path /data/team-a` to pin a directory to an MDS rank. This command is incorrect in multiple ways: `ceph fs subvolume pin` operates on named subvolumes, not arbitrary directory paths; `no_fragment_export` is not a valid pin type (valid types are `export`, `distributed`, `random`); and `--path` is not a valid flag for this command.
- **What was changed:** Replaced with the correct method for pinning arbitrary directories: `setfattr -n ceph.dir.pin -v 0 /mnt/cephfs/data/team-a`, which uses the `ceph.dir.pin` extended attribute on a mounted CephFS path.
- **Why:** The original command would fail with a syntax error. The `setfattr` approach is the documented and correct way to pin CephFS directories to specific MDS ranks.

### 2. MDS memory per inode figure off by ~1000x
- **What was wrong:** The post stated "The MDS daemon uses approximately 1.5 bytes of memory per inode in its cache." The actual figure is approximately 1 KB per cached inode (the CInode struct alone is >1 KB). 1.5 bytes per inode is physically impossible for any meaningful metadata structure.
- **What was changed:** Corrected to "approximately 1 KB of memory per cached inode."
- **Why:** The original figure would mislead readers into severely under-provisioning MDS memory, potentially causing MDS cache pressure and performance degradation.

## Review Notes
- The CephFilesystem CRD YAML is correct but omits some commonly recommended fields like `failureDomain: host` and `requireSafeReplicaSize: true`. These are optional and their omission is acceptable for a tutorial focused on multi-MDS setup.
- The pod count explanation (6 pods = 3 active + 3 standby with `activeCount: 3` and `activeStandby: true`) is accurate per Rook's documented behavior of creating double the requested MDS instances.
- Modern Ceph uses `mds_cache_memory_limit` (default 4 GB in recent versions) rather than inode count-based cache limits. The post could benefit from mentioning this setting in the future, but this is an enhancement rather than an error.
- The `ceph fs status` output format and column names (RANK, STATE, MDS, ACTIVITY, DNS, INOS, DIRS, CAPS) are accurate.
