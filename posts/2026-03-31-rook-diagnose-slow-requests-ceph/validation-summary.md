# Validation Summary: How to Diagnose Slow Requests in Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Ceph OSD (Object Storage Daemon)
- Ceph Prometheus MGR module
- iostat / mtr (Linux diagnostic tools)

## Sources Consulted
- Ceph Troubleshooting OSDs documentation — https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-osd/
- Ceph Perf Counters developer documentation — https://docs.ceph.com/en/reef/dev/perf_counters/
- Ceph Logging and Debugging documentation — https://docs.ceph.com/en/latest/rados/troubleshooting/log-and-debug/
- Ceph Configuration reference — https://docs.ceph.com/en/latest/rados/configuration/ceph-conf/
- Ceph Prometheus MGR module documentation — https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph Prometheus module source code — https://github.com/ceph/ceph/blob/main/src/pybind/mgr/prometheus/module.py

## Issues Found

1. **Incorrect command `ceph tell osd.4 ops`**: `ops` is not a valid subcommand for `ceph tell`. The correct command to list in-flight operations is `ceph daemon osd.4 dump_ops_in_flight`, which must be run on the OSD host via the admin socket. Fixed command and added note about running on the OSD host. Also updated the summary paragraph to reference the corrected command.

2. **Wrong perf counter field `avgcount` presented as latency**: The `avgcount` field in `op_w_latency` is the operation count, not the average latency. There is no `avgtime` field in `perf dump` output; average latency must be computed as `sum / avgcount`. Fixed the Python snippet to compute and display the correct value. Also changed `ceph tell osd.4 perf dump` to `ceph daemon osd.4 perf dump` for consistency since perf dump is an admin socket command.

3. **Prometheus metric names missing `_ms` suffix**: The Ceph MGR Prometheus module exposes `ceph_osd_apply_latency_ms` and `ceph_osd_commit_latency_ms`, not `ceph_osd_apply_latency` and `ceph_osd_commit_latency`. Fixed the grep patterns.

4. **Deprecated `injectargs` for runtime config changes**: Replaced `ceph tell osd.4 injectargs --debug-osd 5` with the modern `ceph tell osd.4 config set debug_osd 5`. Also changed the reset value from `0` (which disables all logging) to `1/5` (the default OSD debug level).

## Review Notes
- The section title "Blacklisting Slow OSDs Temporarily" uses the term colloquially. Ceph has a specific "blocklist" feature (formerly "blacklist") for blocking client access, which is different from marking an OSD out. The section content is correct (it uses `ceph osd out/in`), but the title could cause confusion with Ceph's blocklist feature.
- The log file path `/var/log/ceph/ceph-osd.4.log` is correct for traditional deployments but would differ in containerized/Rook deployments where `kubectl logs` is typically used instead. Since the post is tagged with Rook, readers using Rook should be aware of this.
- The example JSON output for `dump_ops_in_flight` is simplified/illustrative compared to actual output, which is acceptable since it is labeled "Example output."
- The post recommends alerting on P99 commit latency above 50ms, which is a reasonable threshold but may need tuning depending on the storage media (NVMe vs HDD) and workload characteristics.
