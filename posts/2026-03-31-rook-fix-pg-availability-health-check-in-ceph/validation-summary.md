# Validation Summary: How to Fix PG_AVAILABILITY Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Placement Groups (PGs)
- OSDs (Object Storage Daemons)
- CRUSH rules
- kubectl (Kubernetes CLI)

## Sources Consulted
- Ceph official documentation on health checks: https://docs.ceph.com/en/latest/rados/operations/health-checks/#pg-availability
- Ceph official documentation on pool settings (`min_size`, `size`, `nodelete`): https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph official documentation on PG commands (`pg repair`, `pg scrub`, `pg dump_stuck`): https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph official documentation on CRUSH rules: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Rook documentation on OSD management: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-osd-mgmt/

## Issues Found
1. **Step 4 - Incorrect command for allowing degraded I/O**: The original command `ceph osd pool set <pool-name> nodelete false` sets the `nodelete` pool flag, which controls whether a pool can be deleted. This has nothing to do with allowing degraded reads or writes. The text also referenced a non-existent `allow_degraded` pool parameter. There is no such pool flag in Ceph. The correct mechanism for allowing I/O when PGs are degraded is to reduce the pool's `min_size`. Fixed the command to `ceph osd pool set <pool-name> min_size 1` and updated the description to accurately explain the approach.

## Review Notes
- Step 4 (now fixed) and Step 5 both involve reducing `min_size`, which creates some overlap. Step 4 frames it as a temporary recovery measure, while Step 5 frames it as a last resort for permanent OSD loss. The distinction is reasonable in terms of escalation severity.
- The `ceph pg repair` and `ceph pg scrub` commands in Step 3 are valid troubleshooting tools, though for truly stuck inactive PGs, `ceph pg force-recovery <pg-id>` may also be worth mentioning in a future update.
- The `ceph osd crush rule create-replicated` command syntax is correct for creating a CRUSH rule with a host-level failure domain.
- All diagnostic commands (`ceph health detail`, `ceph pg stat`, `ceph pg dump_stuck`, `ceph osd tree`, `ceph osd stat`) are correct and current.
- The Rook/Kubernetes commands for managing OSD pods use correct label selectors and namespaces.
