# Validation Summary: How to Fix BLUESTORE_NO_PER_POOL_OMAP Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (BlueStore, OMAP, OSD, RocksDB)
- Rook (Kubernetes Ceph operator)
- kubectl (Kubernetes CLI)

## Sources Consulted
- Ceph health-checks documentation (https://docs.ceph.com/en/reef/rados/operations/health-checks/)
- Ceph GitHub PR #32758 - automatic legacy omap to per-pool format conversion (https://github.com/ceph/ceph/pull/32758)
- Ceph GitHub PR #29292 - segregate omap keys by pool (https://github.com/ceph/ceph/pull/29292)
- Rook GitHub issue #5772 - BLUESTORE_NO_PER_POOL_OMAP after Octopus upgrade (https://github.com/rook/rook/issues/5772)
- Ceph CLI man page for `ceph osd` commands (https://docs.ceph.com/en/reef/man/8/ceph/)
- Ceph documentation on `set-require-min-compat-client` (https://ceph.io/en/news/blog/2017/new-luminous-upgrade-complete/)

## Issues Found
- **Incorrect command in "Accelerating Deep Scrubs" section**: The command `ceph osd set-require-min-compat-client luminous` was listed under the comment "Force scrub scheduling". This command actually sets the minimum compatible client version for the cluster and has nothing to do with scrub scheduling, deep scrubs, or per-pool OMAP migration. It was removed from the post. The remaining two commands in that section (`osd_max_scrubs` and `osd_scrub_min_interval`) are correct and sufficient for accelerating scrubs.

## Review Notes
- The version reference "Prior to Ceph Octopus (15.x)" is correct. While the underlying per-pool OMAP code landed during the Nautilus development cycle (PR #29292), the BLUESTORE_NO_PER_POOL_OMAP health check and automatic conversion shipped as part of Octopus (15.2.x) via PR #32758.
- The deep scrub approach to triggering OMAP migration is widely documented in community resources and Rook-specific guides, though the official Ceph documentation also mentions `ceph-bluestore-tool repair --path <osd-path>` as an alternative offline method. Both approaches are valid.
- All other CLI commands (`ceph health detail`, `ceph osd metadata`, `ceph osd deep-scrub`, `ceph config set/rm`) use correct syntax.
- The Rook toolbox kubectl commands are correct.
- The explanation of OMAP, its consumers (RGW, CephFS, RBD), and the benefits of per-pool OMAP are accurate.
