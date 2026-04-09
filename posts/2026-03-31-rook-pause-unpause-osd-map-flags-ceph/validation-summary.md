# Validation Summary: How to Use the pause and unpause OSD Map Flags in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (distributed storage system)
- Ceph OSD map flags (pause, norecover, nobackfill, noscrub)
- CRUSH rules
- Ceph CLI (`ceph osd set`, `ceph osd unset`, `ceph osd dump`, `ceph osd crush rule`, `ceph osd pool set`)

## Sources Consulted
- Ceph official documentation: OSD map flags and health checks (https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/)
- Ceph source code: `osd_types.h` for flag definitions (`CEPH_OSDMAP_PAUSERD`, `CEPH_OSDMAP_PAUSEWR`) (https://github.com/ceph/ceph/blob/main/src/osd/osd_types.h)
- Ceph source code: `MonCommands.h` for CLI command signatures (https://github.com/ceph/ceph/blob/main/src/mon/MonCommands.h)
- Ceph official documentation: CRUSH map operations (https://docs.ceph.com/en/latest/rados/operations/crush-map/)
- Mirantis documentation: Ceph cluster shutdown procedures (https://docs.mirantis.com/mcp/q4-18/mcp-operations-guide/openstack-operations/ceph-operations/shut-down-ceph-cluster.html)
- ceph-users mailing list: OSD pause flag discussions (https://lists.ceph.io/hyperkitty/list/ceph-users@ceph.io/)

## Issues Found

1. **Incorrect flag names in `ceph osd dump` output**: The post claimed `ceph osd dump | grep flags` would show `flags pause`. In reality, `ceph osd set pause` sets two separate flags (`pauserd` and `pausewr`), so the output shows `flags pauserd,pausewr`. Fixed the comment to reflect the correct output.

2. **Incorrect health warning format**: The post showed `HEALTH_WARN: paused flag(s) set`. The actual Ceph health output shows `HEALTH_WARN pauserd,pausewr flag(s) set` (no colon, and individual flag names). Fixed to match real Ceph output.

3. **Incorrect monitoring command (`ceph osd stat`)**: The post claimed `ceph osd stat` would show in-progress operations. This command actually shows OSD count information (e.g., "3 osds: 3 up, 3 in"), not I/O stats. Replaced with `ceph status` which shows cluster I/O rates in its output.

4. **Invalid monitoring command (`ceph tell osd.* status | grep "in_progress"`)**: The `status` admin-socket command does not contain an `in_progress` field related to client I/O. Replaced with `ceph tell osd.* dump_ops_in_flight`, which is the documented way to check for in-flight operations on OSDs.

5. **Grammatical error in summary**: "should be unpause immediately" was corrected to "should be unpaused immediately".

## Review Notes
- The `noscrub` description as "Stops light scrubbing only" is acceptable but slightly informal. The official terminology is "periodic scrub" vs "deep scrub". The distinction is technically correct as stated.
- The post correctly notes that `pause` is a cluster-wide operation and that monitors/managers/OSDs continue running. This is accurate.
- The CRUSH rule command `ceph osd crush rule create-replicated new_rule default host` uses correct syntax per the Ceph MonCommands definition.
- The post could benefit from mentioning that `pauserd` and `pausewr` can be set independently (e.g., `ceph osd set pauserd` to block only reads), but this is an enhancement rather than a correction.
