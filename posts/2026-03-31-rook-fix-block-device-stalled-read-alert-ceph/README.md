# How to Fix BLOCK_DEVICE_STALLED_READ_ALERT Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, BlueStore, Disk, Performance

Description: Learn how to diagnose and resolve the BLOCK_DEVICE_STALLED_READ_ALERT health check in Ceph when the main OSD block device reports slow or stalled read operations.

---

## Understanding BLOCK_DEVICE_STALLED_READ_ALERT

`BLOCK_DEVICE_STALLED_READ_ALERT` fires when BlueStore detects that read operations to the main OSD block device (the data device) are taking significantly longer than expected - or are completely stalled. This typically indicates hardware issues: a failing disk, a saturated I/O queue, or a poorly performing storage backend.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN block device stalled reads
[WRN] BLOCK_DEVICE_STALLED_READ_ALERT: osd.2 block device is experiencing stalled reads
    osd.2: 12 reads stalled > 30s in the last hour
```

## Measuring I/O Latency on the Affected OSD

Check I/O wait and latency at the OS level:

```bash
# Find the device for the OSD
ceph osd metadata 2 | python3 -m json.tool | grep bluestore_bdev_dev_node

# Monitor I/O stats
iostat -xz 1 10 /dev/sdX

# Check for I/O wait
top  # look for %wa (I/O wait)
sar -d 1 10
```

High `await` values (>50ms for HDD, >5ms for SSD) indicate slow disk performance.

## Checking BlueStore Latency Metrics

Get detailed BlueStore performance data:

```bash
ceph daemon osd.2 perf dump | python3 -m json.tool | grep -E "lat|stall|read"
```

Key metrics to examine:
- `bluestore_read_lat` - average read latency
- `bluestore_state_aio_wait_lat` - time waiting for async I/O
- `bluestore_submit_lat` - transaction submission latency

## Common Causes and Fixes

### Disk Failing or Degraded

Check SMART data:

```bash
smartctl -a /dev/sdX | grep -E "Reallocated|Pending|Uncorrectable|Error"
smartctl -t short /dev/sdX
```

If SMART reports errors, the disk needs replacement (see OSD replacement procedure).

### I/O Scheduler Suboptimal

Check and change the I/O scheduler:

```bash
# Check current scheduler
cat /sys/block/sdX/queue/scheduler

# For HDD - use mq-deadline
echo mq-deadline > /sys/block/sdX/queue/scheduler

# For NVMe/SSD - use none
echo none > /sys/block/sdX/queue/scheduler
```

Make persistent with udev:

```bash
cat > /etc/udev/rules.d/60-ceph-scheduler.rules << 'EOF'
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="1", ATTR{queue/scheduler}="mq-deadline"
ACTION=="add|change", KERNEL=="nvme[0-9]*n[0-9]*", ATTR{queue/scheduler}="none"
EOF
```

### Queue Depth Too Low

Increase the disk queue depth:

```bash
# Check current depth
cat /sys/block/sdX/queue/nr_requests

# Increase to 256 for HDD
echo 256 > /sys/block/sdX/queue/nr_requests

# Or 1024 for NVMe
echo 1024 > /sys/block/sdX/queue/nr_requests
```

### OSD Read Ahead Too High

Reduce read-ahead for random workloads:

```bash
# Check current read-ahead
blockdev --getra /dev/sdX

# Set 256KB for random I/O
blockdev --setra 512 /dev/sdX   # 512 = 256KB (units are 512-byte sectors)
```

## Adjusting Stalled Read Thresholds

If the hardware is slow but acceptable for your workload:

```bash
# Increase the stall warning lifetime window (seconds)
ceph config set osd bdev_stalled_read_warn_lifetime 120  # 2 minutes
```

## Monitoring Disk Latency

Set up continuous monitoring:

```yaml
- alert: CephOSDBlockDeviceSlowReads
  expr: ceph_health_detail{name="BLOCK_DEVICE_STALLED_READ_ALERT"} > 0
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "OSD {{ $labels.ceph_daemon }} block device has stalled reads"
```

## Summary

`BLOCK_DEVICE_STALLED_READ_ALERT` indicates the OSD's main data block device is producing slow or stalled reads. Diagnose with SMART tools and `iostat`. Fix I/O scheduler settings for the disk type, increase queue depth, and reduce read-ahead for random workloads. If SMART reports errors, replace the disk before a full failure. Monitor I/O latency continuously to catch degradation early.
