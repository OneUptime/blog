# How to Identify Root Cause of Ceph Performance Degradation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Performance, Troubleshooting, OSD

Description: Identify root causes of Ceph performance degradation by analyzing OSD latency, PG states, network throughput, and slow request logs systematically.

---

Performance degradation in Ceph is rarely caused by a single factor. This guide walks through a layered investigation to pinpoint whether the issue is in the disk, network, OSD process, or cluster topology.

## Step 1 - Check for Slow Requests

Slow requests are the first indicator of performance problems:

```bash
ceph health detail | grep "slow requests"
ceph daemon osd.0 dump_ops_in_flight
ceph daemon osd.0 dump_historic_ops
```

If you see many slow requests on one OSD, the issue is likely local to that OSD's disk or CPU.

## Step 2 - Examine OSD Latency

```bash
ceph osd perf
```

Look for `apply_latency_ms` and `commit_latency_ms` values. Anything above 50ms warrants investigation.

For historical data, query Prometheus:

```bash
# In Prometheus query
ceph_osd_apply_latency_ms{job="ceph"}
ceph_osd_commit_latency_ms{job="ceph"}
```

## Step 3 - Check Disk Health

High OSD latency often traces back to a degraded disk:

```bash
# Identify the device for OSD 3
ceph osd metadata 3 | grep -E "osd_data|bluestore_bdev_dev_node"

# Run SMART check on the device
smartctl -a /dev/sdb

# Check kernel I/O stats
iostat -xz /dev/sdb 1 10
```

Watch for high `await` values (over 20ms) and high `%util` approaching 100%.

## Step 4 - Check Network Performance

Ceph is extremely network-sensitive. Check OSD-to-OSD latency:

```bash
# From one OSD host to another
ping -c 100 osd-host-2 | tail -2

# Check for packet loss
mtr --report osd-host-2
```

Also check for network errors on the interface:

```bash
ip -s link show eth0
ethtool eth0 | grep -E "Speed|Duplex"
```

## Step 5 - Check PG Backfill and Recovery

Active backfill and recovery operations consume significant I/O bandwidth:

```bash
ceph status | grep -E "recovering|backfilling|degraded"
ceph pg stat

# Throttle recovery to reduce impact on production traffic
ceph config set osd osd_recovery_max_active 1
ceph config set osd osd_max_backfills 1
```

## Step 6 - Profile a Specific Pool

If a specific workload is slow, check pool-level stats:

```bash
rados bench -p rbd 30 write --no-cleanup
rados bench -p rbd 30 seq
```

Compare against your baseline to quantify the degradation.

## Summary

Ceph performance degradation is investigated by layering: start with slow request detection, then examine per-OSD latency, then disk health, then network, and finally PG recovery activity. Addressing the layer with the highest contribution first yields the most improvement. Always compare measurements against a known-good baseline to quantify the problem.
