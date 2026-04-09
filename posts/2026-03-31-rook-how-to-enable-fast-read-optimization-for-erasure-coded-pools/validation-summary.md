# Validation Summary: How to Enable Fast Read Optimization for Erasure Coded Pools

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (erasure coded pools, `fast_read` pool parameter)
- Rook (CephBlockPool CRD, toolbox)
- rados bench (benchmarking tool)
- Kubernetes (kubectl for Rook toolbox access)

## Sources Consulted
- Ceph Pools documentation: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph Erasure Code Profiles documentation: https://docs.ceph.com/en/reef/rados/operations/erasure-code-profile/
- Ceph Jerasure Erasure Code Plugin documentation: https://docs.ceph.com/en/latest/rados/operations/erasure-code-jerasure/
- rados man page: https://docs.ceph.com/en/latest/man/8/rados/
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Netdata Ceph plugin issue tracking osd_perf JSON structure change (Nautilus+): https://github.com/netdata/netdata/issues/8247

## Issues Found

1. **`rados bench` with `-b` flag in rand mode**: The `-b 4M` (block size) option was used with `rados bench` in `rand` (random read) mode in three places. Per the rados man page, the `-b` option is only valid in write mode. Removed `-b 4M` from all `rados bench ... rand` commands.

2. **`ceph osd perf` JSON structure outdated for modern Ceph**: The Python snippet parsing `ceph osd perf --format json` output used `data.get('osd_perf_infos', [])`, which assumes `osd_perf_infos` is at the root level. This was only correct for Ceph versions prior to Nautilus (14.2). In Nautilus and later (which includes all currently supported Ceph releases), the `osd_perf_infos` array is nested under `osdstats`. Fixed to `data.get('osdstats', {}).get('osd_perf_infos', [])`.

## Review Notes
- The `ceph osd pool create` command uses explicit PG/PGP counts (`128 128`), which is the older syntax. Modern Ceph (Nautilus+) supports PG autoscaling, making explicit PG counts optional. This is not incorrect but readers on newer Ceph versions may not need to specify PG counts.
- The `rados bench ... rand` commands assume objects have already been written to the pool. A note about running `rados bench -p <pool> 60 write --no-cleanup` first would help readers who are new to rados bench, but this is an omission rather than a technical error.
- All Ceph CLI commands, pool parameter names, erasure code profile settings, and Rook CRD fields are verified as correct.
