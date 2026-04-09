# Validation Summary: How to Run Ceph Health Checks

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Kubernetes (kubectl CLI)
- Rook Ceph Toolbox (rook-ceph-tools deployment)

## Sources Consulted
- Ceph official documentation: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph CLI reference: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph OSD management docs: https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/
- Rook Ceph Toolbox docs: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found
- **Line 81: Incorrect description of `ceph osd status` output** — The text stated "Get per-OSD status with device class and utilization." However, `ceph osd status` does not display device class information. It shows id, host, used, avail, wr ops, wr data, rd ops, rd data, and state. Device class is shown by `ceph osd tree`. Changed "with device class and utilization" to "with host and utilization" to match the actual command output (which was correctly shown in the example table below it).

## Review Notes
- All Ceph CLI commands (`ceph health`, `ceph health detail`, `ceph status`, `ceph quorum_status`, `ceph mon stat`, `ceph osd stat`, `ceph osd status`, `ceph osd perf`, `ceph pg stat`, `ceph pg dump_stuck`, `ceph df`, `ceph df detail`, `ceph osd df tree`, `ceph osd pool stats`, `ceph -w`) are valid and current.
- The three health states (HEALTH_OK, HEALTH_WARN, HEALTH_ERR) are correct.
- The `ceph health detail` example output format with `[WRN]` codes is accurate for modern Ceph (Nautilus and later).
- The kubectl exec pattern using `deploy/rook-ceph-tools` is the standard Rook toolbox access method.
- The automated health check script is syntactically correct and functional.
- The `ceph pg dump_stuck` command without arguments defaults to listing PGs stuck inactive for 300+ seconds, which is reasonable for a general health check context.
