# How to Configure ClickHouse Keeper Snapshots and Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Keeper, Snapshot, Log, Replication, Configuration

Description: Learn how to configure ClickHouse Keeper snapshot intervals, log retention, and storage paths to ensure reliable metadata persistence and efficient recovery.

---

## What Are Keeper Snapshots and Logs

ClickHouse Keeper (the built-in ZooKeeper replacement) maintains cluster metadata, replication state, and distributed coordination data. It uses a combination of:

- **Snapshots**: Full point-in-time copies of the Keeper state
- **Logs**: Sequential change records applied on top of the latest snapshot

Together, they allow Keeper to recover quickly after restart and replicas to catch up after downtime.

## Basic Keeper Configuration in config.xml

```xml
<keeper_server>
    <tcp_port>9181</tcp_port>
    <server_id>1</server_id>

    <log_storage_path>/var/lib/clickhouse/coordination/log</log_storage_path>
    <snapshot_storage_path>/var/lib/clickhouse/coordination/snapshots</snapshot_storage_path>

    <coordination_settings>
        <operation_timeout_ms>10000</operation_timeout_ms>
        <session_timeout_ms>30000</session_timeout_ms>
        <heart_beat_interval_ms>500</heart_beat_interval_ms>
        <dead_session_check_period_ms>500</dead_session_check_period_ms>
        <raft_logs_level>warning</raft_logs_level>
    </coordination_settings>

    <raft_configuration>
        <server>
            <id>1</id>
            <hostname>clickhouse-keeper-1</hostname>
            <port>9234</port>
        </server>
        <server>
            <id>2</id>
            <hostname>clickhouse-keeper-2</hostname>
            <port>9234</port>
        </server>
        <server>
            <id>3</id>
            <hostname>clickhouse-keeper-3</hostname>
            <port>9234</port>
        </server>
    </raft_configuration>
</keeper_server>
```

## Configuring Snapshot Frequency

Control how often snapshots are taken:

```xml
<keeper_server>
    <coordination_settings>
        <!-- Take a snapshot every 100,000 log entries -->
        <snapshot_distance>100000</snapshot_distance>

        <!-- Max snapshots to keep on disk -->
        <snapshots_to_keep>3</snapshots_to_keep>
    </coordination_settings>
</keeper_server>
```

## Configuring Log Retention

```xml
<keeper_server>
    <coordination_settings>
        <!-- Reserve at least this many log entries after snapshotting -->
        <reserved_log_items>1000000</reserved_log_items>

        <!-- Number of log records before rotating to a new log file -->
        <rotate_log_storage_interval>100000</rotate_log_storage_interval>
    </coordination_settings>
</keeper_server>
```

## Separating Snapshot and Log Directories

For production, put snapshots and logs on different disks:

```xml
<keeper_server>
    <log_storage_path>/nvme/clickhouse/keeper/log</log_storage_path>
    <snapshot_storage_path>/ssd/clickhouse/keeper/snapshots</snapshot_storage_path>
</keeper_server>
```

This prevents slow snapshot writes from blocking log appends.

## Checking Current Keeper State

```bash
# Use the Keeper 4-letter commands
echo "stat" | nc localhost 9181
echo "mntr" | nc localhost 9181
echo "ruok" | nc localhost 9181
```

Or query via ClickHouse SQL:

```sql
-- List the top-level Keeper paths
SELECT * FROM system.zookeeper WHERE path = '/';

-- Inspect Keeper connection details
SELECT * FROM system.zookeeper_connection;
```

## Listing Snapshots and Logs

```bash
# Check snapshot files
ls -lh /var/lib/clickhouse/coordination/snapshots/

# Check log files
ls -lh /var/lib/clickhouse/coordination/log/
```

## Manually Triggering a Snapshot

```bash
echo "csnp" | nc localhost 9181
```

This is useful before a planned maintenance window.

## Monitoring Keeper Log Lag

```sql
-- Check how far behind replicas are
SELECT
    database,
    table,
    replica_name,
    log_max_index,
    log_pointer,
    log_max_index - log_pointer AS lag
FROM system.replicas
WHERE log_max_index - log_pointer > 0
ORDER BY lag DESC;
```

## Recovering from Snapshot

If a Keeper node loses data, it can recover from the latest snapshot on restart:

```bash
# Ensure the snapshot and log directories are intact
ls -lh /var/lib/clickhouse/coordination/snapshots/
ls -lh /var/lib/clickhouse/coordination/log/

# Restart Keeper - it will automatically load the latest snapshot + logs
systemctl restart clickhouse-server
```

## Summary

ClickHouse Keeper relies on snapshots and logs to persist cluster state reliably. Configure `snapshot_distance` to control snapshot frequency, `snapshots_to_keep` to manage disk usage, and `reserved_log_items` to ensure log coverage for recovering replicas. In production, separate snapshot and log storage paths onto different disks to isolate I/O and enable faster recovery.
