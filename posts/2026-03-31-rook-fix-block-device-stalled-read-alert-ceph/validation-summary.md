# Validation Summary: How to Fix BLOCK_DEVICE_STALLED_READ_ALERT Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (distributed storage)
- Rook (Ceph operator for Kubernetes)
- BlueStore (Ceph OSD backend)
- Linux I/O subsystem (schedulers, queue depth, read-ahead)
- SMART disk diagnostics
- Prometheus alerting

## Sources Consulted
- Ceph Health Checks documentation: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph BlueStore source (perf counters): https://github.com/ceph/ceph/blob/main/src/os/bluestore/BlueStore.h
- Ceph Prometheus MGR module: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/prometheus/module.py
- Ceph OSD metadata fields: https://docs.ceph.com/en/latest/rados/operations/
- Linux NVMe device naming conventions (kernel documentation)
- Linux udev rules documentation

## Issues Found

1. **Incorrect `ceph osd metadata` grep field**: The post used `grep devname` but there is no `devname` field in `ceph osd metadata` output. Changed to `grep bluestore_bdev_dev_node`, which is the correct field name for the OSD block device path.

2. **Wrong BlueStore perf counter name**: `bluestore_txc_submit_lat` is not a real BlueStore perf counter. Changed to `bluestore_submit_lat`, which is the actual counter defined as `l_bluestore_submit_lat` in BlueStore.h.

3. **NVMe udev rule matches controller, not block device**: The pattern `KERNEL=="nvme[0-9]"` matches NVMe controller character devices (`/dev/nvme0`), not the block devices (`/dev/nvme0n1`). Controller devices have no block queue attributes. Changed to `KERNEL=="nvme[0-9]*n[0-9]*"` to correctly match NVMe block devices.

4. **Wrong config option for stalled read threshold**: `bluestore_slow_ops_warn_lifetime` controls the `BLUESTORE_SLOW_OP_ALERT` health check, not `BLOCK_DEVICE_STALLED_READ_ALERT`. Changed to `bdev_stalled_read_warn_lifetime`, which is the correct option that controls the time window for the stalled read health check.

5. **Non-existent Prometheus metric**: `ceph_daemon_health_metrics` is not exported by the Ceph MGR prometheus module. Changed to `ceph_health_detail`, which is the actual metric that exposes individual health check states with `name` and `severity` labels.

## Review Notes
- The `BLOCK_DEVICE_STALLED_READ_ALERT` health check is a real Ceph health check, along with related checks `WAL_DEVICE_STALLED_READ_ALERT` and `DB_DEVICE_STALLED_READ_ALERT`.
- The I/O scheduler recommendations (mq-deadline for HDD, none for NVMe/SSD) align with current Ceph best practices.
- The latency thresholds cited (>50ms for HDD, >5ms for SSD) are reasonable diagnostic heuristics.
- The read-ahead calculation (512 sectors x 512 bytes = 256KB) is correctly explained.
