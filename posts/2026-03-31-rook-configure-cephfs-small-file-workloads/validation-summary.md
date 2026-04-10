# Validation Summary: How to Configure CephFS for Small File Workloads

## Status
validated

## Post Type
Tutorial / Performance Tuning Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph / CephFS (distributed filesystem)
- Ceph MDS (Metadata Server)
- Kubernetes StorageClass / CSI
- mdtest (HPC metadata benchmarking tool)

## Sources Consulted
- Ceph MDS Cache Configuration: https://docs.ceph.com/en/reef/cephfs/cache-configuration/
- Ceph MDS Config Reference (Reef): https://docs.ceph.com/en/reef/cephfs/mds-config-ref/
- CephFS Directory Fragmentation (Quincy): https://docs.ceph.com/en/quincy/cephfs/dirfrags/
- Linux Kernel CephFS Mount Options: https://docs.kernel.org/filesystems/ceph.html
- mount.ceph man page (Reef): https://docs.ceph.com/en/reef/man/8/mount.ceph/
- Ceph Pool Configuration Reference: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph MDS Journaling: https://docs.ceph.com/en/latest/cephfs/mds-journaling/

## Issues Found

### 1. Fabricated config option: `mds_op_memory_check` (REMOVED)
**What was wrong:** The command `ceph config set mds mds_op_memory_check 0` does not exist in any version of Ceph. This config option is not in the Ceph source code or documentation. The accompanying description ("Set MDS to prioritize metadata operations") is vague and does not correspond to any known MDS behavior.
**What was changed:** Removed the entire block (description + command).

### 2. Deprecated command: `ceph fs set cephfs allow_dirfrags true` (REPLACED)
**What was wrong:** Directory fragmentation was made permanently enabled in Ceph Luminous (v12.2.x). This command prints a deprecation warning in Luminous and may not exist in modern Ceph releases (Pacific, Quincy, Reef). Since Rook deploys modern Ceph, this command is obsolete.
**What was changed:** Replaced with `ceph config set mds mds_bal_split_size 10000`, which tunes the directory fragment split threshold. Updated the accompanying text to note that directory fragmentation is enabled by default in modern Ceph.

### 3. Invalid kernel mount option: `dcache_timeout=60` (FIXED)
**What was wrong:** `dcache_timeout` is not a valid CephFS kernel mount option. The kernel client supports `dcache` as a boolean flag (enable/disable dentry cache), with no timeout parameter.
**What was changed:** Replaced `dcache_timeout=60` with `dcache` in both the `mount -t ceph` command and the StorageClass `mountOptions`.

### 4. Incorrect description of `min_size` pool setting (FIXED)
**What was wrong:** The text described `ceph osd pool set cephfs-data0 min_size 2` as "Set the object size for the data pool to match small file sizes to reduce wasted space." This is incorrect. `min_size` sets the minimum number of active replicas required for the pool to accept I/O — it has nothing to do with object size or storage efficiency.
**What was changed:** Updated the description to: "Set the minimum number of active replicas required for the data pool to accept I/O."

## Review Notes
- `mds_log_max_segments 128` is the current default value in modern Ceph (changed from 30 around Nautilus). The command is valid but effectively a no-op on Pacific/Quincy/Reef clusters. Consider setting to 256 for more journal capacity during high metadata churn.
- `caps_max=65536` is a valid kernel mount option that limits the number of capabilities held by the client.
- The `mdtest` tool is not typically pre-installed in the Rook toolbox container (`rook-ceph-tools`). Users would need to install it or run it from a separate pod with CephFS mounted.
- The `setfattr -n ceph.dir.pin` command is correct for MDS directory pinning but would need to be run from a pod with CephFS mounted, not from the toolbox container.
