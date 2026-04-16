# How to Configure ClickHouse Keeper Snapshots and Log Rotation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ClickHouse Keeper, Snapshot, Log Rotation, Operation

Description: Learn how to configure ClickHouse Keeper snapshot frequency, log rotation, and retention to control disk usage and ensure fast recovery after a restart.

ClickHouse Keeper uses a Raft consensus log to record every operation. Over time this log grows. Snapshots compact the log into a point-in-time state file so that old log entries can be deleted. Getting snapshot and log rotation settings right is important for two reasons: it controls how much disk space Keeper uses, and it determines how quickly Keeper can restart (a compact snapshot means less log to replay).

## How Snapshots Work

Keeper creates a snapshot every `snapshot_distance` log entries. A snapshot is a complete serialization of the Keeper state tree at a point in time. After a snapshot is created, all log entries before that snapshot are no longer needed and can be deleted. On restart, Keeper loads the most recent snapshot and replays only the log entries after it.

If `snapshot_distance` is too large, the log grows very large and restarts are slow. If it is too small, Keeper creates snapshots frequently, which uses CPU and I/O. The default is 100,000 entries, and 1,000,000 is a common starting point for busy clusters.

## Key Configuration Parameters

```xml
<!-- /etc/clickhouse-keeper/keeper_config.xml -->
<clickhouse>
    <keeper_server>
        <log_storage_path>/var/lib/clickhouse-keeper/log</log_storage_path>
        <snapshot_storage_path>/var/lib/clickhouse-keeper/snapshots</snapshot_storage_path>

        <coordination_settings>
            <!-- Create a snapshot every N log entries -->
            <snapshot_distance>1000000</snapshot_distance>

            <!-- Keep this many log entries even after snapshotting -->
            <!-- This allows lagging Raft followers to catch up without a full snapshot -->
            <reserved_log_items>1000000</reserved_log_items>

            <!-- How many log records to store in a single changelog file -->
            <rotate_log_storage_interval>100000</rotate_log_storage_interval>

            <!-- Compress snapshots using ZSTD -->
            <compress_snapshots_with_zstd_format>true</compress_snapshots_with_zstd_format>

            <!-- Compress Raft log segments -->
            <compress_logs>true</compress_logs>

            <!-- Keep this many snapshots on disk -->
            <!-- Older snapshots are deleted automatically -->
            <snapshots_to_keep>3</snapshots_to_keep>
        </coordination_settings>
    </keeper_server>
</clickhouse>
```

## Calculating the Right snapshot_distance

The right value depends on your write throughput. A useful formula:

```text
snapshot_distance = (writes_per_second) * (seconds_between_snapshots)
```

For example, if you insert 50,000 rows per second and want a snapshot every 10 minutes:

```text
snapshot_distance = 50000 * 600 = 30,000,000
```

But this creates very large snapshots. Most teams use a lower value and accept more frequent snapshots:

```text
snapshot_distance = 1,000,000  -- snapshot every 1M entries
```

## Checking Current Snapshot and Log State

Use the four-letter word commands to inspect Keeper state:

```bash
# Get detailed stats including snapshot info
echo "stat" | nc keeper1.internal 2181

# Sample output:
# Keeper version: v23.8.1.1
# Latency min/avg/max: 0/0/5
# Received: 12345
# Sent: 12345
# Connections: 8
# Outstanding: 0
# Zxid: 0x1234567
# Mode: leader
# Node count: 45678
```

```bash
# Monitor in real time
watch -n 5 'echo "stat" | nc keeper1.internal 2181'
```

Check the actual files on disk:

```bash
# List snapshot files
ls -lh /var/lib/clickhouse-keeper/snapshots/
# snapshot_1000000.bin.zstd
# snapshot_2000000.bin.zstd
# snapshot_3000000.bin.zstd

# List log segment files
ls -lh /var/lib/clickhouse-keeper/log/
# changelog_1_1000000.bin.zstd
# changelog_1000001_2000000.bin.zstd
```

## Reducing Disk Usage

If Keeper is using too much disk:

```xml
<coordination_settings>
    <!-- More frequent snapshots = smaller log retention needed -->
    <snapshot_distance>500000</snapshot_distance>

    <!-- Keep fewer reserved log items -->
    <reserved_log_items>500000</reserved_log_items>

    <!-- Keep only 2 snapshots on disk -->
    <snapshots_to_keep>2</snapshots_to_keep>

    <!-- Always compress -->
    <compress_snapshots_with_zstd_format>true</compress_snapshots_with_zstd_format>
    <compress_logs>true</compress_logs>
</coordination_settings>
```

With compression enabled, snapshot files are typically 3-10x smaller than uncompressed.

## Monitoring Disk Usage with a Script

```bash
#!/bin/bash
KEEPER_BASE="/var/lib/clickhouse-keeper"

echo "=== ClickHouse Keeper Disk Usage ==="
echo ""
echo "Snapshots:"
du -sh "${KEEPER_BASE}/snapshots/"
ls -lh "${KEEPER_BASE}/snapshots/" | tail -5

echo ""
echo "Raft Log:"
du -sh "${KEEPER_BASE}/log/"
ls -lh "${KEEPER_BASE}/log/" | tail -5

echo ""
echo "Total Keeper Data:"
du -sh "${KEEPER_BASE}/"
```

## Triggering a Manual Snapshot

Keeper creates snapshots automatically, but you can trigger one before planned maintenance to ensure a clean restart:

```bash
# Connect to Keeper using clickhouse-keeper-client
clickhouse-keeper-client \
    --host keeper1.internal \
    --port 2181

# Inside the client, issue the csnp four-letter-word command via flwc
> flwc csnp
# Returns the last committed log index of the scheduled snapshot
```

Or use the four-letter word command directly:

```bash
echo "csnp" | nc keeper1.internal 2181
```

## Configuring Log-Level Rotation

Keeper's own application log (not the Raft log) also needs rotation. Configure it in the `<logger>` section:

```xml
<clickhouse>
    <logger>
        <level>information</level>
        <log>/var/log/clickhouse-keeper/clickhouse-keeper.log</log>
        <errorlog>/var/log/clickhouse-keeper/clickhouse-keeper.err.log</errorlog>
        <!-- Rotate when the file reaches this size -->
        <size>500M</size>
        <!-- Keep this many rotated files -->
        <count>5</count>
        <!-- Compress rotated files -->
        <compress>true</compress>
    </logger>
</clickhouse>
```

## Log Rotation with logrotate

Use `logrotate` as an additional safeguard for the application logs:

```text
# /etc/logrotate.d/clickhouse-keeper
/var/log/clickhouse-keeper/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

The `copytruncate` option is important for ClickHouse Keeper because it does not need a `SIGHUP` to reopen the log file - it just truncates in place.

## Setting Up Alerts for Disk Usage

Add a Prometheus alert for Keeper disk usage:

```yaml
groups:
  - name: clickhouse_keeper_disk
    rules:
      - alert: KeeperSnapshotDirFull
        expr: |
          (
            node_filesystem_avail_bytes{mountpoint="/var/lib/clickhouse-keeper"}
            /
            node_filesystem_size_bytes{mountpoint="/var/lib/clickhouse-keeper"}
          ) < 0.20
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "ClickHouse Keeper disk usage above 80% on {{ $labels.instance }}"
```

Keeper will stop accepting writes if it runs out of disk space. Monitor this proactively.
