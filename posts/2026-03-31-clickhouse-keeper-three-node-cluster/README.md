# How to Configure ClickHouse Keeper for Three-Node Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Keeper, Three-Node, Cluster, High Availability

Description: Configure a production-ready three-node ClickHouse Keeper cluster with Raft consensus, providing fault tolerance if one node fails.

---

A three-node ClickHouse Keeper cluster is the minimum configuration for fault tolerance. With three nodes, the cluster can survive the failure of one node and maintain quorum. This guide walks through a complete three-node setup.

## Why Three Nodes

Raft consensus requires a majority quorum to operate. Three nodes provide:
- Fault tolerance for 1 node failure (2 of 3 still form quorum)
- Leader election capability
- No split-brain risk due to odd node count

## Node Configuration

Each node needs a unique `server_id` and the same `raft_configuration` listing all three nodes.

**Node 1 - `/etc/clickhouse-keeper/keeper_config.xml`:**

```xml
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
            <rotate_log_storage_interval>100000</rotate_log_storage_interval>
        </coordination_settings>
        <raft_configuration>
            <server>
                <id>1</id>
                <hostname>keeper-01.internal</hostname>
                <port>9234</port>
            </server>
            <server>
                <id>2</id>
                <hostname>keeper-02.internal</hostname>
                <port>9234</port>
            </server>
            <server>
                <id>3</id>
                <hostname>keeper-03.internal</hostname>
                <port>9234</port>
            </server>
        </raft_configuration>
    </keeper_server>
</clickhouse>
```

Copy this file to nodes 2 and 3, changing only `server_id` to `2` and `3` respectively.

## Firewall Rules

Open the required ports between all three Keeper nodes:

```bash
# TCP port for client connections (ClickHouse servers connect here)
sudo ufw allow 9181/tcp

# TCP port for Raft inter-node communication
sudo ufw allow 9234/tcp
```

## Starting the Cluster

Start Keeper on all three nodes. The nodes will elect a leader automatically:

```bash
# Start on all three nodes
sudo systemctl start clickhouse-keeper
```

Check each node's role:

```bash
echo stat | nc localhost 9181 | grep Mode
```

One node should report `Mode: leader` and the others `Mode: follower`.

## Verify Cluster Health

Use the four-letter commands (sent via `nc` or `telnet` on the client port):

```bash
# Check all nodes are alive
for host in keeper-01 keeper-02 keeper-03; do
    echo -n "$host: "
    echo ruok | nc $host 9181
done

# Get detailed metrics
echo mntr | nc localhost 9181
```

Key metrics from `mntr`:

```text
zk_avg_latency          - average request latency
zk_max_latency          - maximum request latency
zk_num_alive_connections - connected ClickHouse servers
zk_outstanding_requests - queued requests
zk_server_state         - leader or follower
zk_znode_count          - total znode count
```

## Testing Fault Tolerance

Stop one node and verify the cluster continues:

```bash
sudo systemctl stop clickhouse-keeper  # on keeper-02

# Verify remaining nodes still have quorum
echo ruok | nc keeper-01 9181
# Should return: imok

# Verify ClickHouse server still works
clickhouse-client --query "SELECT count() FROM system.replicas"
```

## Summary

A three-node ClickHouse Keeper cluster requires unique server IDs on each node with identical Raft configuration pointing to all three nodes. Ports 9181 (client) and 9234 (Raft) must be open between nodes. Use `ruok` and `mntr` commands to verify health, and confirm that losing one node still allows the remaining two to maintain quorum.
