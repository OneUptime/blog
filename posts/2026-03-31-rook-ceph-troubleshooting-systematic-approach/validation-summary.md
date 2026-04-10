# Validation Summary: How to Approach Ceph Troubleshooting Systematically

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (CLI commands: status, osd, pg, rados, daemon admin socket)
- Rook (mentioned in tags; commands are general Ceph CLI)
- smartmontools (smartctl)
- systemd journalctl
- Prometheus / Ceph Dashboard (mentioned as metrics sources)

## Sources Consulted
- Ceph official documentation: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph admin socket / perf counters documentation: https://docs.ceph.com/en/latest/dev/perf_counters/
- Ceph OSD perf dump counter names (BlueStore): https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- rados bench documentation: https://docs.ceph.com/en/latest/man/8/rados/
- smartmontools documentation: https://www.smartmontools.org/

## Issues Found
- **`apply_latency` counter name in perf dump grep (Step 4):** The original command `ceph daemon osd.0 perf dump | python3 -m json.tool | grep -E "op_latency|apply_latency"` used `apply_latency` in the grep pattern. The counter `apply_latency` does not exist in the admin socket `perf dump` output. That name (`apply_latency_ms`) appears in `ceph osd perf` (monitor-aggregated view), which is a different data source. In the admin socket perf dump, the relevant counters are `op_latency` and `op_process_latency`. Fixed the grep pattern to `grep -E "op_latency|op_process_latency"`.

## Review Notes
- The `journalctl -u ceph-osd@0` command is correct for bare-metal Ceph deployments but does not apply to Rook/Kubernetes environments where OSD processes run in containers. In Rook contexts, `kubectl logs` on the OSD pod would be the equivalent. Since the post is a general Ceph troubleshooting guide this is acceptable, but readers using Rook should be aware.
- The `rados bench -p rbd` command assumes a pool named `rbd` exists. In Rook deployments, pools are created with custom names. This is fine for illustrative purposes.
- The grep pattern `grep -i "down\|out"` in Step 2 is broad and may match unrelated strings like "timeout" or "layout". A word-boundary match would be more precise, but this is a minor usability note, not an error.
