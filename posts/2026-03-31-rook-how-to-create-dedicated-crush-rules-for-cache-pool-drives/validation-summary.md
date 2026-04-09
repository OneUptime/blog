# Validation Summary: How to Create Dedicated CRUSH Rules for Cache Pool Drives

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (CRUSH maps, device classes, cache tiering, pool management)
- Rook (CephBlockPool CRD)
- CRUSH rule syntax (replicated rules, device class filtering)
- crushtool (CRUSH map compilation/decompilation)

## Sources Consulted
- Ceph official documentation: CRUSH map management and device classes (https://docs.ceph.com/en/latest/rados/operations/crush-map/)
- Ceph official documentation: Cache tiering (https://docs.ceph.com/en/latest/rados/operations/cache-tiering/)
- Ceph official documentation: Pool operations (https://docs.ceph.com/en/latest/rados/operations/pools/)
- Ceph CLI reference: `ceph osd crush` subcommands, `ceph osd pool` subcommands, `ceph osd tier` subcommands
- Rook documentation: CephBlockPool CRD spec (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)

## Issues Found
1. **Step 5 - Verify Placement**: The command `ceph pg dump | grep ssd-cache-pool | awk '{print $14}' | tr ',' '\n' | sort -u` is incorrect. `ceph pg dump` outputs PG IDs in numeric format (`pool_id.pg_hex`, e.g., `1.0`), not pool names, so grepping for `ssd-cache-pool` would match nothing. Replaced with `ceph pg ls-by-pool ssd-cache-pool`, which is the correct command for listing PGs belonging to a specific pool by name and displays the acting/up OSD sets.

## Review Notes
- Cache tiering has been deprecated/discouraged since Ceph Nautilus (v14.x). The official Ceph documentation recommends against using cache tiering for most workloads. The commands in this post are still technically correct and functional, but readers should be aware that cache tiering is no longer a recommended practice in modern Ceph deployments.
- If an OSD already has a device class assigned, `ceph osd crush set-device-class` will fail. Users would need to first run `ceph osd crush rm-device-class <osd-id>` before reassigning. The post doesn't mention this, which could cause confusion for users with pre-existing device class assignments.
- The `nvme` device class is auto-detected by Ceph on NVMe devices, so manual assignment is only needed when auto-detection fails (same as for `hdd` and `ssd`).
