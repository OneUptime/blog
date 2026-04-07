# How to Troubleshoot BlueStore Slow Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, BlueStore, Performance, Troubleshooting

Description: Learn how to diagnose and resolve BlueStore slow operations in Ceph, from identifying slow op logs to tuning OSD configuration for better throughput.

---

## Understanding BlueStore Slow Operations

BlueStore is the default storage backend for Ceph OSDs. When operations take longer than expected, Ceph logs "slow ops" warnings. These can stem from hardware bottlenecks, misconfiguration, or resource contention.

### Step 1: Check the Ceph Health for Slow Ops

```bash
ceph health detail
```

Look for messages like:
```text
HEALTH_WARN 1 ops are blocked > 32 secs
```

### Step 2: Inspect OSD Slow Op Logs

Enable verbose logging temporarily on a specific OSD:

```bash
ceph tell osd.0 config set osd_op_log_threshold 5
ceph tell osd.0 config set debug_osd 5
```

Then check the OSD log:

```bash
kubectl -n rook-ceph logs rook-ceph-osd-0-<pod-suffix> | grep "slow request"
```

### Step 3: Review OSD Performance Counters

```bash
ceph osd perf
```

This shows apply and commit latency per OSD. High latency values (above 100ms) indicate a bottleneck.

### Step 4: Inspect BlueStore Device Stats

```bash
ceph daemon osd.0 perf dump | jq '.bluestore'
```

Look at:
- `bluestore_state_kv_queued_lat` - time waiting to write to RocksDB
- `bluestore_state_io_done_lat` - time for I/O to complete
- `bluestore_state_finishing_lat` - post-write cleanup time

### Step 5: Check Disk Queue Depth and Latency

```bash
iostat -x 1 5
```

If `await` is high (>10ms for SSD, >30ms for HDD), the disk is saturated.

### Step 6: Check for Memory Pressure

BlueStore uses a shared cache. If cache is being evicted aggressively, operations slow down.

```bash
ceph daemon osd.0 perf dump | jq '.bluestore.bluestore_cache_bytes'
```

Increase cache size if needed:

```bash
ceph config set osd bluestore_cache_size 4294967296
```

### Step 7: Verify RocksDB Compaction Health

```bash
ceph daemon osd.0 perf dump | jq '.rocksdb'
```

High `rocksdb_compact_queue_len` means compaction is falling behind writes, causing latency spikes.

### Step 8: Reduce Scrub and Recovery Impact

If slow ops correlate with scrubbing, limit scrub activity:

```bash
ceph config set osd osd_max_scrubs 1
ceph config set osd osd_scrub_begin_hour 22
ceph config set osd osd_scrub_end_hour 6
```

## Summary

BlueStore slow operations are usually caused by disk saturation, RocksDB compaction lag, memory pressure, or heavy background scrubbing. Use `ceph health detail`, `ceph osd perf`, and per-daemon perf dumps to isolate the root cause, then tune cache sizes and scrub schedules accordingly.
