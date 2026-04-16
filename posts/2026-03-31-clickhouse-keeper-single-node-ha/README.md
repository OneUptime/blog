# How to Use ClickHouse Keeper for Single-Node HA

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ClickHouse Keeper, Single Node, High Availability, Configuration

Description: Learn how to configure embedded ClickHouse Keeper on a single node for development, testing, or small production setups that still need replicated tables.

A common misconception is that ClickHouse replication requires multiple servers. You can run `ReplicatedMergeTree` tables on a single node by using embedded ClickHouse Keeper. This is useful for development environments, CI/CD pipelines, and small production setups where you want to use replicated table engines (for consistency with production schema) without running a full cluster.

## When to Use Single-Node Keeper

Use embedded Keeper for:

- Development and testing with production-identical schemas
- CI/CD pipelines that test replication logic
- Small production workloads where a second server is cost-prohibitive
- Migrations: running a single node while setting up a second replica

Do NOT use single-node Keeper as your only HA strategy for production data. A single Keeper node means a single point of failure. If Keeper fails, all your replicated tables go read-only.

## Embedded Keeper Configuration

Add Keeper configuration directly to your ClickHouse server config. Create `/etc/clickhouse-server/config.d/keeper_embedded.xml`:

```xml
<clickhouse>
    <!-- Run Keeper inside the ClickHouse server process -->
    <keeper_server>
        <!-- Use a different port from the standard 2181 to avoid
             conflicts if ZooKeeper is installed on the same machine -->
        <tcp_port>9181</tcp_port>

        <!-- Unique ID for this single node (always 1 in single-node mode) -->
        <server_id>1</server_id>

        <!-- Store coordination data alongside ClickHouse data -->
        <log_storage_path>/var/lib/clickhouse/coordination/log</log_storage_path>
        <snapshot_storage_path>/var/lib/clickhouse/coordination/snapshots</snapshot_storage_path>

        <coordination_settings>
            <operation_timeout_ms>10000</operation_timeout_ms>
            <min_session_timeout_ms>10000</min_session_timeout_ms>
            <session_timeout_ms>30000</session_timeout_ms>
            <dead_session_check_period_ms>500</dead_session_check_period_ms>
            <heart_beat_interval_ms>500</heart_beat_interval_ms>
            <election_timeout_lower_bound_ms>1000</election_timeout_lower_bound_ms>
            <election_timeout_upper_bound_ms>2000</election_timeout_upper_bound_ms>
            <reserved_log_items>100000</reserved_log_items>

            <!-- Smaller snapshot distance for single-node (less data to replay) -->
            <snapshot_distance>100000</snapshot_distance>

            <auto_forwarding>true</auto_forwarding>
            <shutdown_timeout>5000</shutdown_timeout>
            <startup_timeout>30000</startup_timeout>
            <raft_logs_level>warning</raft_logs_level>
            <compress_logs>true</compress_logs>
            <compress_snapshots_with_zstd_format>true</compress_snapshots_with_zstd_format>
        </coordination_settings>

        <!-- Single-node Raft cluster - only this server -->
        <raft_configuration>
            <server>
                <id>1</id>
                <hostname>127.0.0.1</hostname>
                <port>9444</port>
            </server>
        </raft_configuration>
    </keeper_server>

    <!-- Point ClickHouse at its own embedded Keeper -->
    <zookeeper>
        <node>
            <host>127.0.0.1</host>
            <port>9181</port>
        </node>
        <session_timeout_ms>30000</session_timeout_ms>
        <operation_timeout_ms>10000</operation_timeout_ms>
        <root>/clickhouse</root>
    </zookeeper>
</clickhouse>
```

## Creating the Coordination Directory

```bash
mkdir -p /var/lib/clickhouse/coordination/log
mkdir -p /var/lib/clickhouse/coordination/snapshots
chown -R clickhouse:clickhouse /var/lib/clickhouse/coordination/
```

## Starting and Verifying

```bash
# Restart ClickHouse to load the new Keeper config
systemctl restart clickhouse-server

# Verify Keeper started
journalctl -u clickhouse-server | grep -i "keeper\|coordination" | head -20

# Test the Keeper port
echo "ruok" | nc 127.0.0.1 9181
# Returns: imok

echo "stat" | nc 127.0.0.1 9181 | grep Mode
# Returns: Mode: leader  (single node is always the leader)
```

Verify ClickHouse is connected:

```sql
SELECT * FROM system.zookeeper_connection;
-- Should show a connected session to 127.0.0.1:9181
```

## Creating a Single-Node Replicated Table

With embedded Keeper running, you can create `ReplicatedMergeTree` tables:

```sql
-- The macros must be set, even on a single node
-- /etc/clickhouse-server/config.d/macros.xml
```

```xml
<clickhouse>
    <macros>
        <shard>01</shard>
        <replica>localhost</replica>
    </macros>
</clickhouse>
```

```sql
CREATE TABLE events
(
    event_date  Date,
    event_time  DateTime,
    user_id     UInt64,
    event_type  LowCardinality(String),
    properties  String
)
ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/events',
    '{replica}'
)
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_type, event_date, user_id);

-- Insert test data
INSERT INTO events VALUES (today(), now(), 1, 'test', '{}');

-- Verify
SELECT * FROM events;

-- Check replica status (shows as healthy single-replica setup)
SELECT
    database,
    table,
    is_readonly,
    absolute_delay,
    total_replicas,
    active_replicas
FROM system.replicas
WHERE table = 'events';
```

## Expanding to a Multi-Node Cluster Later

One advantage of using embedded Keeper with `ReplicatedMergeTree` from the start is that migrating to a real cluster is straightforward. The table schema does not change - only the Keeper connection and cluster config need to change.

When you add a second server:

1. Deploy a 3-node external Keeper cluster
2. Migrate the Keeper data by copying the snapshot and log files from the embedded Keeper into the new cluster's leader (or start fresh if you can afford to reload data)
3. Update `zookeeper.xml` on all ClickHouse nodes to point to the external Keeper cluster
4. Add the second ClickHouse server to `cluster.xml`
5. Create the same tables on the new server - they will automatically sync data from the first server

The `ReplicatedMergeTree` DDL stays identical throughout. This is why using replicated engines from day one is a good practice even on single-node setups.

## Resource Usage

Embedded Keeper adds minimal overhead on a single node:

```text
Memory:    50-200 MB typical (depends on tree size)
CPU:       <1% at typical ClickHouse single-node write rates
Disk:      Same as external Keeper (logs + snapshots)
```

For a single-node development setup, this overhead is negligible. For a production single-node with very high insert rates, consider running Keeper as a standalone process to isolate any resource contention.

## Monitoring Embedded Keeper

```sql
-- Check Keeper connection from ClickHouse perspective
SELECT * FROM system.zookeeper_connection;

-- Browse the Keeper data tree
SELECT name, dataLength, numChildren
FROM system.zookeeper
WHERE path = '/clickhouse'
ORDER BY name;

-- Check replica health
SELECT
    table,
    is_readonly,
    absolute_delay,
    queue_size
FROM system.replicas;
```
