# Validation Summary: How to Understand HEALTH_WARN vs HEALTH_ERR States in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (health monitoring, OSD and PG management)
- Rook (Ceph operator for Kubernetes)
- Prometheus (alerting on Ceph health metrics)
- Kubernetes (kubectl for Rook toolbox access)

## Sources Consulted
- Ceph official health checks documentation: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph source code (`src/mon/PGMap.cc`) for health check severity definitions
- Ceph Prometheus module source (`src/pybind/mgr/prometheus/module.py`) for `ceph_health_status` metric values
- Rook toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found
1. **`PG_DEGRADED` shown as ERR-level check**: The HEALTH_ERR example displayed `[ERR] PG_DEGRADED`, but `PG_DEGRADED` is a WARN-level health check in Ceph (confirmed via source code and Prometheus module docs). Changed to `[WRN] PG_DEGRADED`.

2. **`PG_STUCK_UNCLEAN` is not a real Ceph health check code**: The example used `[ERR] PG_STUCK_UNCLEAN: 15 pgs stuck unclean`, but `PG_STUCK_UNCLEAN` does not exist as a Ceph health check. The concept of "stuck unclean" PGs is valid (used in `ceph pg dump_stuck unclean`), but it is not a health check code. Replaced with `[ERR] PG_AVAILABILITY: 15 pgs not active`, which is the correct ERR-level health check for PGs that are not serving I/O.

3. **Updated detail messages**: Adjusted the PG detail lines in the HEALTH_ERR example to match realistic `ceph health detail` output format for the corrected health check codes.

## Review Notes
- All CLI commands (`ceph health`, `ceph health detail`, `ceph status`, `ceph osd stat`, `ceph pg stat`, `ceph pg dump_stuck`) are correct.
- The Rook toolbox access command is correct per official Rook documentation.
- The `ceph_health_status` Prometheus metric values (0=OK, 1=WARN, 2=ERR) are correct per Ceph source code.
- The Prometheus alert rules are syntactically valid YAML and use reasonable `for` durations.
- The Key Differences table provides accurate general characterizations of WARN vs ERR states.
