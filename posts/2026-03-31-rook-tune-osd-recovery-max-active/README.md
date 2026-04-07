# How to Tune osd_recovery_max_active for Faster Recovery in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Recovery, Performance, OSD, Configuration

Description: Tune osd_recovery_max_active in Ceph to control concurrent recovery operations per OSD, balancing recovery speed against client I/O performance during degraded states.

---

## What osd_recovery_max_active Controls

`osd_recovery_max_active` sets the maximum number of active recovery operations each OSD can run at any given time. This controls recovery (re-replication of missing objects), which is separate from backfill operations controlled by `osd_max_backfills`. A higher value means faster recovery but more I/O competition with client operations.

Ceph Nautilus (14.2.0)+ separates this into `osd_recovery_max_active_hdd` and `osd_recovery_max_active_ssd` for device-specific tuning.

## Default Values and Their Limitations

```bash
# Check defaults
ceph config get osd osd_recovery_max_active
# Default: 0 (uses device-class-specific defaults)

ceph config get osd osd_recovery_max_active_hdd
# Default: 3

ceph config get osd osd_recovery_max_active_ssd
# Default: 10
```

With 3 concurrent recovery ops on HDD, recovery of a 4 TB OSD with each op averaging ~33 MB/s takes approximately 11 hours. Doubling to 6 ops (assuming the disk has headroom beyond 100 MB/s total) cuts this to roughly 5-6 hours.

## Calculating the Right Value

Consider these factors when choosing a value:

- **Disk throughput**: How many MB/s can the drive sustain?
- **Network bandwidth**: Is the cluster network the bottleneck?
- **Client sensitivity**: Can client operations tolerate higher latency?

Quick estimate formula:

```text
Recovery time (hours) = OSD capacity (GB) / (recovery_max_active * single_op_speed_MB/s * 3600 / 1024)
```

## Setting Recovery Parameters

For HDD-based clusters, moderate increase:

```bash
ceph config set osd osd_recovery_max_active_hdd 5
ceph config set osd osd_max_backfills 2
ceph config set osd osd_recovery_sleep_hdd 0.1
```

For NVMe-based clusters, higher values are safe:

```bash
ceph config set osd osd_recovery_max_active_ssd 20
ceph config set osd osd_max_backfills 8
ceph config set osd osd_recovery_sleep_ssd 0
```

## Adding Recovery Sleep to Reduce Client Impact

`osd_recovery_sleep` introduces a delay between recovery operations, throttling recovery and giving client I/O more CPU time:

```bash
# HDD - small sleep reduces interference
ceph config set osd osd_recovery_sleep_hdd 0.05

# SSD - minimal sleep still helps under load
ceph config set osd osd_recovery_sleep_ssd 0.01

# Disable sleep for maximum recovery speed (maintenance window)
ceph config set osd osd_recovery_sleep 0
```

## Monitoring Recovery Rate

Measure actual recovery throughput:

```bash
# Show overall recovery progress
ceph status | grep recovery

# Watch PG states change over time
watch -n 5 'ceph pg stat'

# Detailed recovery progress per OSD
for i in $(ceph osd ls); do
  echo "OSD $i:"; ceph daemon osd.$i perf dump | grep recovering_bytes
done
```

## Dynamic Adjustment Script

Use a script to switch between fast and slow recovery modes:

```bash
#!/bin/bash
MODE=${1:-normal}

if [ "$MODE" = "fast" ]; then
  echo "Enabling fast recovery mode..."
  ceph config set osd osd_recovery_max_active_hdd 6
  ceph config set osd osd_recovery_max_active_ssd 20
  ceph config set osd osd_max_backfills 4
  ceph config set osd osd_recovery_sleep 0
elif [ "$MODE" = "normal" ]; then
  echo "Restoring normal recovery mode..."
  ceph config set osd osd_recovery_max_active_hdd 3
  ceph config set osd osd_recovery_max_active_ssd 10
  ceph config set osd osd_max_backfills 1
  ceph config set osd osd_recovery_sleep_hdd 0.1
fi
echo "Done. Current settings:"
ceph config get osd osd_recovery_max_active_hdd
ceph config get osd osd_max_backfills
```

## Rook CephCluster Configuration

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephConfig:
    osd:
      osd_recovery_max_active_hdd: "5"
      osd_recovery_max_active_ssd: "15"
      osd_max_backfills: "2"
      osd_recovery_sleep_hdd: "0.05"
```

## Summary

`osd_recovery_max_active` governs how many recovery operations run concurrently per OSD. The device-specific variants (`_hdd` and `_ssd`) allow fine-grained control since SSDs can safely handle much higher concurrency than HDDs. Combining higher active counts with `osd_recovery_sleep` tuning provides a balanced approach that speeds recovery while limiting client performance degradation.
