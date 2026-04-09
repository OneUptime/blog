# Validation Summary: How to Profile Rook-Ceph Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage)
- Kubernetes (kubectl exec, kubectl debug)
- rados bench (Ceph benchmarking tool)
- jq (JSON filtering)
- sysstat / sar (node-level network monitoring)

## Sources Consulted
- Ceph Perf Counters documentation: https://docs.ceph.com/en/reef/dev/perf_counters/
- Ceph Troubleshooting OSDs documentation: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-osd/
- Ceph iostat MGR module documentation: https://docs.ceph.com/en/quincy/mgr/iostat/
- Ceph BlueStore Configuration Reference: https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/
- Ceph Monitoring OSDs and PGs: https://docs.ceph.com/en/reef/rados/operations/monitoring-osd-pg/
- Ceph Monitoring a Cluster: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph source code (perf counter registration and admin socket commands)
- Ceph PR #13019 (dump_slow_ops command): https://github.com/ceph/ceph/pull/13019

## Issues Found

1. **Incorrect perf counter name `op_rlatency` (line 67):** The jq filter used `.osd.op_rlatency` which is not a valid Ceph perf counter name. The correct counter is `.osd.op_r_latency` (with underscore between `r` and `latency`). Fixed to `.osd.op_r_latency`.

2. **Misleading `commit_latency_ms` description (line 24):** The post described `commit_latency_ms` as "(journal commit)". This terminology is from the FileStore era. Modern Ceph defaults to BlueStore, which has no separate journal. In BlueStore, `commit_latency_ms` and `apply_latency_ms` are effectively identical. Updated the description to "(transaction commit)" and added a clarifying note about BlueStore behavior.

3. **Incorrect `ceph iostat` syntax (line 39):** The post used `ceph iostat 5` but the correct syntax requires the `-p` flag for the period argument: `ceph iostat -p 5`. Fixed to use the correct flag.

4. **`ceph osd stat` misrepresented as network utilization check (lines 115-119):** The section "Checking Network Utilization" used `ceph osd stat` which only shows OSD count and up/down/in/out status — it provides no network utilization data. Removed this command and replaced the section intro with guidance to check node-level network stats directly using the `sar` command that follows, and a note that high OSD latencies from `ceph osd perf` can indicate network saturation.

## Review Notes
- The `dump_slow_ops` command (line 109) is a valid admin socket command that shows currently in-flight slow operations. For historical slow operation analysis, `dump_historic_slow_ops` may be more comprehensive. Both are valid; the post's usage is acceptable for its context.
- The `sar -n DEV` command on line 125 requires the `sysstat` package to be installed on the Kubernetes node. Since the command uses `chroot /host`, it runs against the host filesystem — `sar` must be available on the node OS, not in the debug container image.
- The `ceph iostat` command requires the iostat MGR module to be enabled (`ceph mgr module enable iostat`). The post does not mention this prerequisite.
- The pipe (`|`) to `jq` in the `kubectl exec` commands is interpreted by the local shell, so `jq` must be installed on the operator's machine (not inside the toolbox container). This works correctly but may surprise users who don't have `jq` installed locally.
