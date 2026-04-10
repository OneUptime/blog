# Validation Summary: How to Analyze Ceph OSD Slow Request Logs

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Ceph OSD (Object Storage Daemon)
- BlueStore (Ceph storage backend)
- kubectl (Kubernetes CLI)
- Prometheus / PromQL
- iostat (Linux disk I/O monitoring)

## Sources Consulted
- Ceph official documentation on OSD configuration options (`osd_op_complaint_time`): https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph official documentation on `ceph tell` vs `ceph daemon` admin socket commands: https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/
- Ceph official documentation on `dump_ops_in_flight`: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-osd/
- Rook documentation on toolbox deployment: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Ceph Prometheus exporter metric names: https://docs.ceph.com/en/latest/mgr/prometheus/

## Issues Found

### 1. Incorrect timestamp in example slow request log
- **What was wrong:** The example log showed `received at 2024-01-15T09:53:15` for a request that was 30.123 seconds old at `2024-01-15T10:23:45`. The "received at" time was ~30 minutes before the log time instead of ~30 seconds.
- **What was changed:** Corrected to `received at 2024-01-15T10:23:15`, which is consistent with a 30-second-old request.
- **Why:** The original timestamp would confuse readers trying to understand slow request log format, since the math didn't add up.

### 2. Used `ceph daemon` instead of `ceph tell` from tools pod (3 occurrences)
- **What was wrong:** The post used `ceph daemon osd.2 dump_ops_in_flight` and `ceph daemon osd.2 perf dump` executed from `deploy/rook-ceph-tools`. The `ceph daemon` command connects via the local admin socket (`/var/run/ceph/...`), which only exists on the pod running that specific OSD. The tools pod does not have access to OSD admin sockets.
- **What was changed:** Replaced `ceph daemon` with `ceph tell` in all three occurrences (two commands and one summary reference). `ceph tell` sends the command to the OSD via the monitor, so it works from any pod with cluster access.
- **Why:** Running `ceph daemon osd.2 ...` from the tools pod would fail with an error like "unable to get conf option admin_socket" or "No such file or directory". This would block readers following the guide.

## Review Notes
- The `iostat` command may not be available inside OSD pods depending on the Rook image. Readers may need to run it on the host node or install `sysstat` in the pod. The command itself is correct.
- The PromQL query calculates average OSD read latency, which is useful for detecting performance degradation but does not directly count slow ops. The description "Track slow ops" is slightly imprecise but the query is valid and relevant to the troubleshooting workflow.
- The `awk` field positions in the log parsing commands depend on the exact Ceph log format, which can vary between Ceph versions. This is acceptable for a guide but readers should verify field positions against their actual logs.
- The default value of `osd_op_complaint_time` (30 seconds) is correct as of Ceph Reef/Squid.
