# Validation Summary: How to Plan for Recovery Time Based on Data Size

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Ceph OSD recovery and backfill subsystem
- Ceph CLI (`ceph df`, `ceph osd df`, `ceph status`, `ceph config set`)
- Python 3 (inline calculation scripts)

## Sources Consulted
- Ceph OSD Config Reference (Reef): https://docs.ceph.com/en/reef/rados/configuration/osd-config-ref/
- 45Drives Knowledge Base on Ceph Backfill & Recovery: https://knowledgebase.45drives.com/kb/kb450424-ceph-backfill-recovery/
- Ceph source code PR #41125 (mClock sleep override behavior): https://github.com/ceph/ceph/pull/41125

## Issues Found

### 1. Incorrect use of `osd_recovery_sleep` in aggressive tuning section

**What was wrong:** The aggressive recovery tuning block used `ceph config set osd osd_recovery_sleep 0` to disable recovery throttling. However, the generic `osd_recovery_sleep` defaults to `0`, and when it is `0`, the device-specific variants take precedence (`osd_recovery_sleep_hdd` defaults to `0.1`, `osd_recovery_sleep_ssd` defaults to `0`). Setting the generic to `0` is therefore a no-op — HDD OSDs would still sleep 0.1 seconds between recovery operations.

**What was changed:** Replaced `osd_recovery_sleep 0` with the device-specific `osd_recovery_sleep_hdd 0` and `osd_recovery_sleep_ssd 0`, which correctly disables recovery sleep for both device types. This is consistent with the conservative restore section which already uses the device-specific `osd_recovery_sleep_hdd 0.1`.

**Why:** Without this fix, a reader following the "aggressive recovery" instructions would not actually get faster recovery on HDD-backed OSDs, which are the most common case where recovery throttling matters.

## Review Notes
- The `osd_recovery_max_active` parameter also has device-specific variants (`osd_recovery_max_active_hdd` default 3, `osd_recovery_max_active_ssd` default 10). The blog uses the generic form with value 10, which correctly overrides device-specific defaults when set to a non-zero value. This is technically correct but readers should be aware of the device-specific variants.
- The conservative restore section sets `osd_recovery_max_active 3`, which matches the HDD default but would reduce SSD recovery concurrency from 10 to 3. This may be intentional for conservative mode.
- Recovery throughput estimates (HDD: 50-100 MB/s, SSD: 200-500 MB/s, NVMe: 500 MB/s-2 GB/s) are reasonable ballpark figures but vary significantly based on cluster configuration, network topology, and workload.
- The Python recovery ETA script correctly references `recovering_bytes_per_sec` and `degraded_objects` from the `ceph status --format json` output structure.
