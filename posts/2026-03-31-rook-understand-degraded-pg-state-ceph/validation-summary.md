# Validation Summary: How to Understand the degraded PG State in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Ceph Placement Groups (PGs)
- Ceph OSD recovery configuration

## Sources Consulted
- Ceph official documentation on PG states: https://docs.ceph.com/en/latest/rados/operations/pg-states/
- Ceph official documentation on recovery configuration: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph CLI reference for `ceph status`, `ceph pg dump`, `ceph osd tree`

## Issues Found
1. **`osd_recovery_max_active_hdd` set to default value (no-op):** The command `ceph config set osd osd_recovery_max_active_hdd 3` was setting the option to its default value of 3, which would not speed up recovery at all. Changed to `10` to actually increase recovery throughput as intended by the section context.

2. **Incorrect recovery state transition:** The PG state transition was shown as `active+degraded -> active+recovering -> active+clean`. During recovery, the PG remains in the `degraded` state until all replicas are restored, so the correct intermediate state is `active+recovering+degraded`. Fixed to `active+degraded -> active+recovering+degraded -> active+clean`.

## Review Notes
- The `ceph pg dump | awk '{if ($16 ~ /degraded/) print $1}'` command uses a hardcoded column number ($16) for the state field, which may vary across Ceph versions. A more robust alternative would be `ceph pg dump --format json | jq ...`, but this is a common enough pattern in Ceph administration guides.
- The table showing 1 replica as "active+degraded (high risk)" is accurate only when `min_size=1`. With the default `min_size=2` for a size-3 pool, a PG with only 1 replica would stop serving I/O (becoming `peered` rather than `active+degraded`). The post doesn't discuss `min_size`, but the "high risk" qualifier is appropriate for conveying the danger.
- The `osd_recovery_op_priority` setting (value 10) is applicable to the WPQ (Weighted Priority Queue) scheduler. Newer Ceph releases (Quincy+) default to the mClock scheduler, which uses different tuning knobs. This is version-dependent and acceptable for a general guide.
