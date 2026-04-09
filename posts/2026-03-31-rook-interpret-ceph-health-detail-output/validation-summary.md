# Validation Summary: How to Interpret ceph health detail Output

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Ceph (health monitoring, OSD management, PG diagnostics)
- Rook (Ceph operator for Kubernetes)
- kubectl (Kubernetes CLI)
- jq (JSON processing)

## Sources Consulted
- Ceph official health checks documentation: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph source code (`src/mon/PGMap.cc`, `src/osd/OSDMap.cc`, `src/mon/AuthMonitor.cc`) for health check code definitions and severities
- Ceph troubleshooting documentation: https://docs.ceph.com/en/reef/rados/troubleshooting/troubleshooting-mon/
- Rook documentation for toolbox pod usage

## Issues Found

1. **`PG_UNAVAIL` is not a real Ceph health check code.** Changed to `PG_AVAILABILITY`, which is the actual code defined in `src/mon/PGMap.cc`. Updated the severity from ERR to WRN and the description to "Some placement groups cannot serve reads or writes" to match the actual health check behavior.

2. **`PG_DEGRADED` severity listed as "WRN/ERR" is incorrect.** `PG_DEGRADED` is always `HEALTH_WARN` in the Ceph source code (hardcoded in `src/mon/PGMap.cc`). Changed to "WRN".

3. **`AUTH_BAD_CAPS` severity listed as "WRN" is incorrect.** The actual severity is `HEALTH_ERR` as defined in `src/mon/AuthMonitor.cc`. Changed to "ERR".

## Review Notes
- The `ceph time-sync-status` command was verified as valid (available since Ceph Luminous release).
- The `ceph pg dump_stuck` command syntax with comma-separated states is correct.
- The JSON output structure shown is accurate for modern Ceph (Nautilus and later).
- The Rook toolbox pod command and Kubernetes workflow examples are correct for standard Rook deployments. The OSD pod label selector `app=rook-ceph-osd` is valid, though `ceph-osd-id=4` could be used for more precise filtering.
