# Validation Summary: How to Fix PG_RECOVERY_FULL Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl)
- RBD (RADOS Block Device)
- RADOS (Reliable Autonomic Distributed Object Store)

## Sources Consulted
- Ceph Health Checks Documentation: https://docs.ceph.com/en/reef/rados/operations/health-checks/
- Ceph Source Code — PGMap.cc (health check definitions): https://github.com/ceph/ceph/blob/main/src/mon/PGMap.cc
- Ceph Source Code — OSDMap.cc (osd df output format): https://github.com/ceph/ceph/blob/main/src/osd/OSDMap.cc
- Ceph Source Code — PeeringState.cc (recovery_toofull retry logic): https://github.com/ceph/ceph/blob/main/src/osd/PeeringState.cc
- Ceph Troubleshooting OSDs: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-osd/
- Ceph Monitoring OSDs and PGs: https://docs.ceph.com/en/reef/rados/operations/monitoring-osd-pg/
- Ceph PR #28204 (health status severity for recovery_toofull): https://github.com/ceph/ceph/pull/28204

## Issues Found

1. **Incorrect example health output message text**: The example output showed `"Recovery is blocked because the cluster is full"` with detail `"OSD(s) are too full to perform recovery"`. The actual Ceph message format is `"Full OSDs blocking recovery: N pg(s) recovery_toofull"` with detail lines listing specific PGs and their states. Fixed to match actual Ceph output.

2. **Wrong sort column in `ceph osd df` command**: The command `ceph osd df | sort -k6 -n -r | head -10` sorted by column 6 (RAW USE), not %USE. In modern Ceph (Quincy/Reef/Squid), %USE is column 11. Changed `-k6` to `-k11` to correctly sort by utilization percentage, which is more appropriate for identifying which OSDs are closest to full.

3. **Misleading Step 5 — "Manually Trigger Recovery"**: The original step implied that running `ceph osd unset norecover` and `ceph osd unset nobackfill` was required to resume recovery after adding capacity. In reality, Ceph automatically retries recovery after `osd_recovery_retry_interval` once OSDs drop below the full threshold. The `norecover`/`nobackfill` flags are separate global flags that an administrator sets manually — they are not automatically set when PGs enter the `recovery_toofull` state. Rewrote the step to clarify that these commands are only needed if the flags were previously set manually.

## Review Notes
- The `sort -k11` column number is accurate for modern Ceph versions (Quincy, Reef, Squid). Older versions (pre-Quincy) had fewer columns in `ceph osd df` output (no DATA/OMAP/META split), where %USE was at a different column position. Readers on older Ceph versions should verify the column layout with `ceph osd df | head -1`.
- Setting `full_ratio` to 0.97 is extremely aggressive and risks data loss if OSDs fill completely. The post correctly labels this as an "emergency measure," which is appropriate framing.
- The CephCluster CR example with `useAllNodes: true` and `useAllDevices: true` is a minimal snippet. In production, operators typically use more specific storage configuration. This is fine for illustration purposes.
- The description of `PG_RECOVERY_FULL` being triggered at the `backfillfull_ratio` threshold is approximately correct — Ceph blocks recovery when target OSDs exceed this ratio to prevent them from becoming completely full.
