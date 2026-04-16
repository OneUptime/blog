# How to Configure ClickHouse Keeper (Native ZooKeeper Replacement)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ClickHouse Keeper, ZooKeeper, Configuration, High Availability

Description: Learn how to configure ClickHouse Keeper as a drop-in replacement for ZooKeeper, including server setup, client config, and a 3-node ensemble for production use.

ClickHouse Keeper is a built-in coordination service that replaces ZooKeeper. It implements the same client protocol that ZooKeeper uses, which means no changes are needed to your ClickHouse replication configuration. Keeper is written in C++ and runs either as a standalone process or embedded within the ClickHouse server process. It is simpler to operate than ZooKeeper because it uses the same binary and tooling as ClickHouse itself.

## Deployment Options

ClickHouse Keeper can run in two ways:

1. **Embedded mode**: Inside the ClickHouse server process (suitable for development or single-node HA)
2. **Standalone mode**: As a separate `clickhouse-keeper` process (recommended for production)

For production, standalone mode is better because the Keeper process is isolated from ClickHouse query load and can be placed on dedicated nodes.

## Standalone Keeper Configuration

Create the config file for a 3-node Keeper ensemble. Place this file on each Keeper node at `/etc/clickhouse-keeper/keeper_config.xml`:

```xml
<!-- /etc/clickhouse-keeper/keeper_config.xml on keeper1.internal -->
<clickhouse>
    <logger>
        <level>information</level>
        <log>/var/log/clickhouse-keeper/clickhouse-keeper.log</log>
        <errorlog>/var/log/clickhouse-keeper/clickhouse-keeper.err.log</errorlog>
        <size>1000M</size>
        <count>10</count>
    </logger>

    <listen_host>0.0.0.0</listen_host>

    <keeper_server>
        <!-- Port for client connections (ZooKeeper-compatible) -->
        <tcp_port>2181</tcp_port>

        <!-- Unique ID for this Keeper node (1, 2, or 3) -->
        <server_id>1</server_id>

        <!-- Where to store Raft logs and snapshots -->
        <log_storage_path>/var/lib/clickhouse-keeper/log</log_storage_path>
        <snapshot_storage_path>/var/lib/clickhouse-keeper/snapshots</snapshot_storage_path>

        <coordination_settings>
            <!-- Timeout for a single client operation in milliseconds -->
            <operation_timeout_ms>10000</operation_timeout_ms>
            <min_session_timeout_ms>10000</min_session_timeout_ms>
            <session_timeout_ms>30000</session_timeout_ms>
            <dead_session_check_period_ms>500</dead_session_check_period_ms>
            <heart_beat_interval_ms>500</heart_beat_interval_ms>
            <election_timeout_lower_bound_ms>1000</election_timeout_lower_bound_ms>
            <election_timeout_upper_bound_ms>2000</election_timeout_upper_bound_ms>

            <!-- How many log entries to keep before compacting to a snapshot -->
            <reserved_log_items>1000000</reserved_log_items>
            <snapshot_distance>1000000</snapshot_distance>

            <!-- Auto-forward client writes to the leader -->
            <auto_forwarding>true</auto_forwarding>

            <!-- Shutdown wait time -->
            <shutdown_timeout>5000</shutdown_timeout>

            <!-- Startup sync timeout -->
            <startup_timeout>30000</startup_timeout>

            <!-- Raft log level: trace, debug, information, warning, error -->
            <raft_logs_level>information</raft_logs_level>

            <!-- Max number of entries to rotate per snapshot -->
            <rotate_log_storage_interval>100000</rotate_log_storage_interval>

            <!-- Compress snapshots and logs -->
            <compress_snapshots_with_zstd_format>true</compress_snapshots_with_zstd_format>
            <compress_logs>true</compress_logs>
        </coordination_settings>

        <!-- The Raft cluster members -->
        <raft_configuration>
            <server>
                <id>1</id>
                <hostname>keeper1.internal</hostname>
                <port>9234</port>
            </server>
            <server>
                <id>2</id>
                <hostname>keeper2.internal</hostname>
                <port>9234</port>
            </server>
            <server>
                <id>3</id>
                <hostname>keeper3.internal</hostname>
                <port>9234</port>
            </server>
        </raft_configuration>
    </keeper_server>
</clickhouse>
```

On `keeper2.internal`, change only `<server_id>2</server_id>`. On `keeper3.internal`, change only `<server_id>3</server_id>`. Everything else stays the same.

## Starting Keeper

```bash
# Create required directories
mkdir -p /var/lib/clickhouse-keeper/log
mkdir -p /var/lib/clickhouse-keeper/snapshots
mkdir -p /var/log/clickhouse-keeper
chown -R clickhouse:clickhouse /var/lib/clickhouse-keeper /var/log/clickhouse-keeper

# Start Keeper (standalone binary)
systemctl start clickhouse-keeper
systemctl enable clickhouse-keeper

# Or start via the main ClickHouse binary
clickhouse keeper --config /etc/clickhouse-keeper/keeper_config.xml --daemon
```

## Verifying the Ensemble is Healthy

Use the four-letter word commands (same as ZooKeeper):

```bash
# Check server status and which node is the leader
echo "stat" | nc keeper1.internal 2181
echo "stat" | nc keeper2.internal 2181
echo "stat" | nc keeper3.internal 2181

# Check if the server is healthy
echo "ruok" | nc keeper1.internal 2181
# Returns: imok

# Get server configuration
echo "conf" | nc keeper1.internal 2181

# Get leader information (zk_server_state field shows leader/follower)
echo "mntr" | nc keeper1.internal 2181
```

## Configuring ClickHouse to Use Keeper

In your ClickHouse server config, point the `<zookeeper>` section to Keeper instead of ZooKeeper. The config is identical - Keeper speaks the same protocol:

```xml
<!-- /etc/clickhouse-server/config.d/keeper.xml -->
<clickhouse>
    <zookeeper>
        <node>
            <host>keeper1.internal</host>
            <port>2181</port>
        </node>
        <node>
            <host>keeper2.internal</host>
            <port>2181</port>
        </node>
        <node>
            <host>keeper3.internal</host>
            <port>2181</port>
        </node>
        <session_timeout_ms>30000</session_timeout_ms>
        <operation_timeout_ms>10000</operation_timeout_ms>
        <root>/clickhouse</root>
    </zookeeper>
</clickhouse>
```

## Embedded Keeper (Development and Testing)

For development or single-node setups, run Keeper embedded in the ClickHouse server process:

```xml
<!-- /etc/clickhouse-server/config.d/keeper_embedded.xml -->
<clickhouse>
    <keeper_server>
        <tcp_port>9181</tcp_port>
        <server_id>1</server_id>
        <log_storage_path>/var/lib/clickhouse/coordination/log</log_storage_path>
        <snapshot_storage_path>/var/lib/clickhouse/coordination/snapshots</snapshot_storage_path>

        <coordination_settings>
            <operation_timeout_ms>10000</operation_timeout_ms>
            <session_timeout_ms>30000</session_timeout_ms>
            <raft_logs_level>warning</raft_logs_level>
        </coordination_settings>

        <!-- Single node Raft cluster -->
        <raft_configuration>
            <server>
                <id>1</id>
                <hostname>localhost</hostname>
                <port>9234</port>
            </server>
        </raft_configuration>
    </keeper_server>

    <!-- Point ClickHouse at its own embedded Keeper -->
    <zookeeper>
        <node>
            <host>localhost</host>
            <port>9181</port>
        </node>
    </zookeeper>
</clickhouse>
```

## Checking Keeper Status from ClickHouse

ClickHouse exposes Keeper status through system tables:

```sql
-- Check Keeper connection status
SELECT * FROM system.zookeeper_connection;

-- Browse the Keeper data tree
SELECT name, value, dataLength, numChildren
FROM system.zookeeper
WHERE path = '/clickhouse'
ORDER BY name;

-- Inspect recent Keeper requests/responses from this server's perspective
SELECT type, event_time, address, port, session_id, xid, has_watch, op_num, path
FROM system.zookeeper_log
ORDER BY event_time DESC
LIMIT 20;
```

## Port Reference

```text
2181  -- ZooKeeper-compatible client port (what ClickHouse connects to)
9234  -- Raft inter-server port (Keeper nodes communicate on this)
9181  -- ClickHouse Keeper's native default client port (used in embedded mode here to avoid the ZooKeeper port)
```

Always open both ports in your firewall: 2181 for ClickHouse clients and 9234 for Keeper-to-Keeper Raft communication.
