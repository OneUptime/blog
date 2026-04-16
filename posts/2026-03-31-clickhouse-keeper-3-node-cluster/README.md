# How to Set Up a 3-Node ClickHouse Keeper Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ClickHouse Keeper, Cluster, High Availability, Operation

Description: Complete step-by-step guide to deploying a production-ready 3-node ClickHouse Keeper cluster, from installation through health verification and monitoring.

A 3-node ClickHouse Keeper cluster is the minimum recommended configuration for production. It tolerates one node failure while maintaining a quorum of two nodes. This guide covers every step from installing the binary to verifying the cluster is production-ready.

## Architecture

```text
keeper1.internal  -- Keeper node (may be leader or follower)
keeper2.internal  -- Keeper node (may be leader or follower)
keeper3.internal  -- Keeper node (may be leader or follower)

ch1.internal  -- ClickHouse server (connects to all 3 Keeper nodes)
ch2.internal  -- ClickHouse server (connects to all 3 Keeper nodes)
```

The Keeper nodes should be on different physical hosts and ideally in different availability zones. The ClickHouse servers are separate from the Keeper nodes in production.

## Network Requirements

Open these ports in your firewall:

```text
keeper -> keeper: TCP 9444 (Raft inter-node communication)
clickhouse -> keeper: TCP 2181 (ZooKeeper-compatible client protocol)
```

Verify connectivity before deploying:

```bash
# From keeper1, verify Raft ports are reachable on peers
nc -zv keeper2.internal 9444 && echo "OK"
nc -zv keeper3.internal 9444 && echo "OK"

# From ClickHouse nodes, verify client port is reachable
nc -zv keeper1.internal 2181 && echo "OK"
nc -zv keeper2.internal 2181 && echo "OK"
nc -zv keeper3.internal 2181 && echo "OK"
```

## Step 1: Install ClickHouse Keeper on All Three Nodes

```bash
# Install the ClickHouse package (includes clickhouse-keeper)
apt-get install -y apt-transport-https ca-certificates dirmngr
GNUPGHOME=$(mktemp -d)
GNUPGHOME="$GNUPGHOME" gpg --no-default-keyring \
    --keyring /usr/share/keyrings/clickhouse-keyring.gpg \
    --keyserver hkp://keyserver.ubuntu.com:80 \
    --recv-keys 8919F6BD2B48D754

echo "deb [signed-by=/usr/share/keyrings/clickhouse-keyring.gpg] \
    https://packages.clickhouse.com/deb stable main" \
    > /etc/apt/sources.list.d/clickhouse.list

apt-get update
apt-get install -y clickhouse-keeper

# Verify installation
clickhouse-keeper --version
```

## Step 2: Create Directories

```bash
# Run on all three Keeper nodes
mkdir -p /var/lib/clickhouse-keeper/log
mkdir -p /var/lib/clickhouse-keeper/snapshots
mkdir -p /var/log/clickhouse-keeper

chown -R clickhouse:clickhouse \
    /var/lib/clickhouse-keeper \
    /var/log/clickhouse-keeper
```

## Step 3: Create Configuration Files

Create `/etc/clickhouse-keeper/keeper_config.xml` on each node. The only difference between nodes is `<server_id>`.

**keeper1.internal** (`server_id = 1`):

```xml
<clickhouse>
    <logger>
        <level>information</level>
        <log>/var/log/clickhouse-keeper/clickhouse-keeper.log</log>
        <errorlog>/var/log/clickhouse-keeper/clickhouse-keeper.err.log</errorlog>
        <size>500M</size>
        <count>5</count>
        <compress>true</compress>
    </logger>

    <listen_host>0.0.0.0</listen_host>

    <keeper_server>
        <tcp_port>2181</tcp_port>
        <server_id>1</server_id>

        <log_storage_path>/var/lib/clickhouse-keeper/log</log_storage_path>
        <snapshot_storage_path>/var/lib/clickhouse-keeper/snapshots</snapshot_storage_path>

        <coordination_settings>
            <operation_timeout_ms>10000</operation_timeout_ms>
            <min_session_timeout_ms>10000</min_session_timeout_ms>
            <session_timeout_ms>30000</session_timeout_ms>
            <dead_session_check_period_ms>500</dead_session_check_period_ms>
            <heart_beat_interval_ms>500</heart_beat_interval_ms>
            <election_timeout_lower_bound_ms>1000</election_timeout_lower_bound_ms>
            <election_timeout_upper_bound_ms>2000</election_timeout_upper_bound_ms>
            <reserved_log_items>1000000</reserved_log_items>
            <snapshot_distance>1000000</snapshot_distance>
            <auto_forwarding>true</auto_forwarding>
            <shutdown_timeout>5000</shutdown_timeout>
            <startup_timeout>30000</startup_timeout>
            <raft_logs_level>information</raft_logs_level>
            <compress_logs>true</compress_logs>
            <compress_snapshots_with_zstd_format>true</compress_snapshots_with_zstd_format>
            <snapshots_to_keep>3</snapshots_to_keep>
        </coordination_settings>

        <raft_configuration>
            <server>
                <id>1</id>
                <hostname>keeper1.internal</hostname>
                <port>9444</port>
            </server>
            <server>
                <id>2</id>
                <hostname>keeper2.internal</hostname>
                <port>9444</port>
            </server>
            <server>
                <id>3</id>
                <hostname>keeper3.internal</hostname>
                <port>9444</port>
            </server>
        </raft_configuration>
    </keeper_server>
</clickhouse>
```

For **keeper2.internal**: change `<server_id>2</server_id>`.
For **keeper3.internal**: change `<server_id>3</server_id>`.

## Step 4: Start the Cluster

Start Keeper on all three nodes at roughly the same time (within a few seconds):

```bash
# On all three nodes simultaneously
systemctl start clickhouse-keeper
systemctl enable clickhouse-keeper
```

The first startup triggers a Raft election. Wait 5-10 seconds, then check which node became leader:

```bash
for h in keeper1 keeper2 keeper3; do
    echo -n "${h}: "
    echo "stat" | nc ${h}.internal 2181 2>/dev/null | grep Mode || echo "not ready"
done
```

Expected output:

```text
keeper1: Mode: follower
keeper2: Mode: leader
keeper3: Mode: follower
```

## Step 5: Verify the Ensemble

```bash
# Verify all nodes are healthy
for h in keeper1 keeper2 keeper3; do
    result=$(echo "ruok" | nc ${h}.internal 2181 2>/dev/null)
    echo "${h}: ${result}"
done
# Expected: each node returns "imok"

# Check node count (should be the same on all three nodes)
for h in keeper1 keeper2 keeper3; do
    count=$(echo "mntr" | nc ${h}.internal 2181 | grep zk_znode_count | awk '{print $2}')
    echo "${h}: znode_count=${count}"
done
# Counts should be identical (or differ by at most a few entries)
```

## Step 6: Configure ClickHouse to Use the Keeper Cluster

On all ClickHouse nodes, create `/etc/clickhouse-server/config.d/keeper.xml`:

```xml
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

Reload ClickHouse config:

```bash
systemctl reload clickhouse-server
```

Verify the connection from ClickHouse:

```sql
SELECT * FROM system.zookeeper_connection;
-- Should show a connected session
```

## Step 7: Validate Replication End-to-End

```sql
-- Create a replicated test table
CREATE TABLE IF NOT EXISTS keeper_test ON CLUSTER production_cluster
(
    id    UInt64,
    ts    DateTime,
    value String
)
ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/keeper_test',
    '{replica}'
)
ORDER BY id;

-- Insert on one replica
INSERT INTO keeper_test VALUES (1, now(), 'hello from keeper');

-- Read from all replicas (should all show the row)
SELECT * FROM clusterAllReplicas('production_cluster', currentDatabase(), keeper_test);

-- Clean up
DROP TABLE keeper_test ON CLUSTER production_cluster;
```

## Ongoing Monitoring

Set up a cron job to check cluster health every minute:

```bash
#!/bin/bash
# /usr/local/bin/check-keeper.sh

HEALTHY=0
for h in keeper1.internal keeper2.internal keeper3.internal; do
    result=$(echo "ruok" | nc "$h" 2181 2>/dev/null)
    if [ "$result" = "imok" ]; then
        HEALTHY=$((HEALTHY + 1))
    fi
done

if [ "$HEALTHY" -lt 2 ]; then
    echo "CRITICAL: Only ${HEALTHY}/3 Keeper nodes are healthy"
    exit 2
elif [ "$HEALTHY" -lt 3 ]; then
    echo "WARNING: Only ${HEALTHY}/3 Keeper nodes are healthy"
    exit 1
else
    echo "OK: All 3 Keeper nodes are healthy"
    exit 0
fi
```

```bash
chmod +x /usr/local/bin/check-keeper.sh
echo "* * * * * root /usr/local/bin/check-keeper.sh >> /var/log/keeper-health.log 2>&1" \
    >> /etc/crontab
```
