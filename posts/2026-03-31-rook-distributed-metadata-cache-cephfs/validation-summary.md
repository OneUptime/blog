# Validation Summary: How to Understand Distributed Metadata Cache in CephFS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (Kubernetes operator for Ceph)
- CephFS (Ceph Filesystem)
- Ceph MDS (Metadata Server)
- kubectl (Kubernetes CLI)

## Sources Consulted
- Ceph official documentation: CephFS cache configuration (https://docs.ceph.com/en/latest/cephfs/cache-configuration/)
- Ceph official documentation: MDS config reference (https://docs.ceph.com/en/latest/cephfs/mds-config-ref/)
- Ceph source code: `src/mds/MDSRank.cc` for perf counter registration and admin socket command names
- Ceph source code: `src/common/options/mds.yaml.in` for config option definitions and types

## Issues Found

1. **Version attribution for `mds_cache_memory_limit` was incorrect.** The post stated "Nautilus+" but this option was introduced in Mimic (v13). Changed "Nautilus+" to "Mimic+".

2. **`inode_max` perf counter does not exist.** The jq filter `.mds | {inodes, inode_max, caps}` referenced a nonexistent counter. Removed `inode_max` from the filter, leaving `.mds | {inodes, caps}` which uses two confirmed counters.

3. **`mds_cache_trim_threshold` described and used incorrectly.** The post described it as a float (0.95) representing "95% of limit", but it is actually a `size` type option (default `256Ki` / 262144) controlling the number of dentries to trim per tick. Fixed the value and description.

4. **`mds_cache_trim_decay_rate` described incorrectly.** The post described it as "trim 5% of cache per pass" with a value of 0.05, but it actually controls the exponential half-life decay rate for the trimming throttle (default 1.0, lower = more aggressive). Fixed the value and description.

5. **`cap_revoke_eviction` and `cap_revoke_timeout` are not perf dump counters.** `mds_cap_revoke_eviction_timeout` is a config option, not a perf counter. Replaced the command with `perf dump | jq '.mds.caps'` (confirmed counter) and added `session ls` for per-client cap visibility.

6. **`dump_subtrees` is not a valid MDS admin socket command.** The correct command is `get subtrees` (confirmed in MDSRank.cc source). Fixed the command.

## Review Notes
- The `cache status` admin socket command is valid but returns relatively minimal output (mempool info). The post's description ("shows current cache memory usage, inode counts by type, and trimming activity") slightly overstates what this command provides. Not changed since it is directionally correct.
- The post's recommended memory range of 2-8 GiB for MDS pods is reasonable general guidance, though specific workloads may require more.
- The default value of `mds_cache_memory_limit` is 4 GiB, which matches the example value used in the post.
