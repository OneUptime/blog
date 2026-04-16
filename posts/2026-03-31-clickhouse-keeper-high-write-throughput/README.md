# How to Tune ClickHouse Keeper for High Write Throughput

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ClickHouse Keeper, Performance, Tuning, Operation

Description: Learn how to tune ClickHouse Keeper configuration, hardware, and batching settings to handle high write throughput without becoming a bottleneck for replication.

ClickHouse Keeper can become a bottleneck in high-throughput ClickHouse clusters. Every insert registers a new data part in Keeper, and every merge creates a log entry. At high insert rates, Keeper needs to process tens of thousands of operations per second. This guide covers the configuration, hardware, and batching changes that let Keeper keep up with heavy workloads.

## Understanding the Bottlenecks

Keeper's write path is:

1. Client sends a write request to the leader
2. Leader appends the entry to its Raft log (disk write)
3. Leader sends the entry to all followers
4. Followers append to their logs (disk write)
5. Followers acknowledge to the leader
6. Leader commits the entry and responds to the client

Step 2 and 4 are disk writes on the critical path. The Raft log must be flushed to disk before acknowledging. This means Keeper throughput is largely determined by disk IOPS and write latency.

## Hardware Recommendations

| Workload | Disk Type | Notes |
|---|---|---|
| Development | Any | No performance requirement |
| Light production | SSD | NVMe preferred |
| Heavy production | NVMe SSD | Dedicated disk for Keeper logs |
| Extreme throughput | NVMe with battery-backed write cache | Minimize flush latency |

Place the Raft log on a separate, dedicated disk from ClickHouse data:

```xml
<keeper_server>
    <!-- Use a fast NVMe for the log (sequential writes, latency-critical) -->
    <log_storage_path>/mnt/nvme-keeper/log</log_storage_path>

    <!-- Snapshots are larger, sequential reads/writes; can use a slower disk -->
    <snapshot_storage_path>/mnt/ssd-keeper/snapshots</snapshot_storage_path>
</keeper_server>
```

## Batching Writes

Keeper batches multiple operations into a single Raft log entry when they arrive within the same time window. Increasing the batch size improves throughput at the cost of slightly higher latency per operation:

```xml
<coordination_settings>
    <!-- Maximum number of operations to batch together -->
    <max_requests_batch_size>100</max_requests_batch_size>

    <!-- Maximum total size in bytes for a single batch -->
    <!-- Whichever limit (count or bytes) is reached first triggers the batch -->
    <max_requests_batch_bytes_size>102400</max_requests_batch_bytes_size>

    <!-- Maximum number of pending requests in the queue -->
    <max_request_queue_size>100000</max_request_queue_size>
</coordination_settings>
```

## Compression

Enable compression for both logs and snapshots to reduce disk I/O:

```xml
<coordination_settings>
    <compress_logs>true</compress_logs>
    <compress_snapshots_with_zstd_format>true</compress_snapshots_with_zstd_format>
</coordination_settings>
```

Compression reduces write amplification on disk at the cost of some CPU. On modern hardware with NVMe SSDs, the disk I/O savings outweigh the CPU cost significantly.

## Increasing Snapshot Distance

With high write throughput, Keeper creates snapshots very frequently if `snapshot_distance` is too small. Each snapshot is a full state serialize operation that can cause a pause:

```xml
<coordination_settings>
    <!-- Create a snapshot every 5 million entries instead of 1 million -->
    <snapshot_distance>5000000</snapshot_distance>

    <!-- Keep enough log entries for followers to catch up without a snapshot -->
    <reserved_log_items>2000000</reserved_log_items>
</coordination_settings>
```

The tradeoff: larger `snapshot_distance` means more log to replay on restart. Size this so restart time is acceptable (typically a few minutes of log replay at most).

## Reducing Insert Pressure on Keeper

The biggest lever for reducing Keeper load is to reduce how many Keeper operations ClickHouse generates. Most Keeper operations come from creating new data parts.

Reduce the number of parts ClickHouse creates by increasing the minimum insert size. The block size settings are part of the `default` user profile, while `max_bytes_to_merge_at_max_space_in_pool` is a MergeTree-level setting:

```xml
<!-- /etc/clickhouse-server/users.d/insert_block_size.xml -->
<clickhouse>
    <profiles>
        <default>
            <!-- Squash smaller blocks together before forming a part -->
            <min_insert_block_size_rows>1000000</min_insert_block_size_rows>
            <min_insert_block_size_bytes>268435456</min_insert_block_size_bytes>
        </default>
    </profiles>
</clickhouse>
```

```xml
<!-- /etc/clickhouse-server/config.d/merge_tree.xml -->
<clickhouse>
    <merge_tree>
        <!-- Allow large merges to reduce total part count -->
        <max_bytes_to_merge_at_max_space_in_pool>161061273600</max_bytes_to_merge_at_max_space_in_pool>
    </merge_tree>
</clickhouse>
```

Encourage application-side batching:

```sql
-- BAD: each insert creates a separate part and a Keeper entry
-- (called in a loop 10,000 times)
INSERT INTO events VALUES (now(), 1001, 'click', '{}');

-- GOOD: batch rows together
-- Single Keeper entry for all 10,000 rows
INSERT INTO events
SELECT * FROM input_batch;

-- Or use Buffer table to automatically batch small inserts
CREATE TABLE events_buffer AS events
ENGINE = Buffer(
    currentDatabase(),
    events,
    16,       -- 16 buffers
    10, 100,  -- flush after 10-100 seconds
    10000, 1000000,  -- flush after 10K-1M rows
    10000000, 1000000000  -- flush after 10MB-1GB
);
```

## Monitoring Keeper Performance

```bash
# Watch real-time stats
watch -n 2 'echo "stat" | nc keeper1.internal 2181'

# Key metrics to watch:
# Received: total operations received
# Sent: total operations sent back
# Latency min/avg/max: operation latency in ms
# Outstanding: operations waiting to be processed (should be near 0)
```

```bash
# Monitor with mntr (more detailed)
echo "mntr" | nc keeper1.internal 2181
```

Key metrics in `mntr` output:

```text
zk_avg_latency              -- average operation latency (ms)
zk_max_latency              -- maximum latency seen
zk_outstanding_requests     -- queue depth (should be ~0)
zk_packets_received         -- operations per second (approximate)
zk_packets_sent             -- responses per second
zk_num_alive_connections    -- ClickHouse nodes connected
```

## Alerting on Keeper Latency

```yaml
groups:
  - name: clickhouse_keeper_performance
    rules:
      - alert: KeeperHighLatency
        expr: ClickHouseAsyncMetrics_KeeperAvgLatency > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "ClickHouse Keeper avg latency > 100ms on {{ $labels.instance }}"

      - alert: KeeperOutstandingRequests
        expr: ClickHouseAsyncMetrics_KeeperOutstandingRequests > 1000
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "ClickHouse Keeper queue is backing up on {{ $labels.instance }}"
```

## OS-Level Tuning

```bash
# Increase the maximum number of open file descriptors
echo "clickhouse soft nofile 500000" >> /etc/security/limits.conf
echo "clickhouse hard nofile 500000" >> /etc/security/limits.conf

# Disable transparent huge pages (reduces jitter)
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag

# Use deadline or noop scheduler for NVMe
echo mq-deadline > /sys/block/nvme0n1/queue/scheduler

# Tune kernel network buffers for high-throughput inter-node communication
echo "net.core.rmem_max = 134217728" >> /etc/sysctl.conf
echo "net.core.wmem_max = 134217728" >> /etc/sysctl.conf
sysctl -p
```

## Benchmarking Keeper Throughput

Before production load, benchmark your Keeper setup:

```bash
# Use the built-in client to exercise basic operations
clickhouse-keeper-client \
    --host keeper1.internal \
    --port 2181

# Inside the client:
> create /benchmark_test "value"
> set /benchmark_test "updated_value"
> get /benchmark_test
```

A healthy Keeper cluster on NVMe SSDs should sustain 50,000-100,000 operations per second with sub-millisecond average latency. If you see higher latency or the outstanding queue building up, address the hardware or batching configuration before going to production.
