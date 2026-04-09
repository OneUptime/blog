# Validation Summary: How to Monitor a Ceph Cluster with ceph status

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- kubectl (Kubernetes CLI)
- Prometheus (metrics monitoring)

## Sources Consulted
- Ceph official documentation: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph OSD performance documentation: https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/
- Ceph PG states documentation: https://docs.ceph.com/en/latest/rados/operations/pg-states/
- Ceph Manager Prometheus module: https://docs.ceph.com/en/latest/mgr/prometheus/
- Rook toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found
- **Incorrect description for `ceph osd perf`**: The post described this command as showing "current read/write throughput and IOPS." In reality, `ceph osd perf` displays per-OSD commit latency and apply latency metrics, not throughput or IOPS. Changed the description to "Check per-OSD commit and apply latency" to accurately reflect the command's output.

## Review Notes
- All `kubectl exec` commands correctly target the `rook-ceph-tools` deployment in the `rook-ceph` namespace, which is the standard Rook toolbox setup.
- The three health states (`HEALTH_OK`, `HEALTH_WARN`, `HEALTH_ERR`) are accurately described.
- All Ceph CLI commands (`ceph -s`, `ceph health detail`, `ceph mon stat`, `ceph quorum_status`, `ceph osd stat`, `ceph osd tree`, `ceph df`, `ceph df detail`, `rados df`) are valid and correctly used.
- The PG state descriptions (active+degraded, active+recovering, peering, stale) are accurate.
- The example `ceph -s` output format is realistic and matches actual Ceph output structure.
- The Prometheus module enable command is correct, though in Rook-managed clusters this module is typically enabled automatically via the CephCluster custom resource.
- The `watch -n 5 ceph -s` approach works but readers should be aware that `ceph -w` provides a built-in event-streaming alternative (though it serves a different purpose -- showing events rather than repeating full status).
