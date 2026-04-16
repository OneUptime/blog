# How to Install ClickHouse Keeper from Scratch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Keeper, Installation, ZooKeeper, Coordination

Description: Step-by-step guide to installing and configuring ClickHouse Keeper as a standalone coordination service, replacing ZooKeeper in your ClickHouse cluster.

---

ClickHouse Keeper is a coordination service compatible with the ZooKeeper protocol but built specifically for ClickHouse. It has lower resource requirements and simpler operation than ZooKeeper. This guide covers a fresh installation from scratch.

## Why Use ClickHouse Keeper

ClickHouse Keeper offers several advantages over ZooKeeper:
- Built into the ClickHouse binary - no separate Java process
- Lower memory usage
- Faster recovery after leader election
- Native Raft consensus implementation

## Installation Options

Keeper can run as part of the ClickHouse server process or as a standalone binary. For production, use standalone Keeper nodes separate from your data nodes.

Install the `clickhouse-keeper` package:

```bash
sudo apt-get install -y clickhouse-keeper
```

Or run Keeper inside the ClickHouse server by enabling it in the server config.

## Standalone Keeper Configuration

Create `/etc/clickhouse-keeper/keeper_config.xml`:

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
        </coordination_settings>

        <raft_configuration>
            <server>
                <id>1</id>
                <hostname>keeper-node-01</hostname>
                <port>9234</port>
            </server>
            <server>
                <id>2</id>
                <hostname>keeper-node-02</hostname>
                <port>9234</port>
            </server>
            <server>
                <id>3</id>
                <hostname>keeper-node-03</hostname>
                <port>9234</port>
            </server>
        </raft_configuration>
    </keeper_server>
</clickhouse>
```

Repeat on each Keeper node, changing `server_id` to match the node's ID in `raft_configuration`.

## Create Required Directories

```bash
sudo mkdir -p /var/lib/clickhouse/coordination/log
sudo mkdir -p /var/lib/clickhouse/coordination/snapshots
sudo chown -R clickhouse:clickhouse /var/lib/clickhouse/coordination
```

## Start ClickHouse Keeper

```bash
sudo systemctl enable clickhouse-keeper
sudo systemctl start clickhouse-keeper
sudo systemctl status clickhouse-keeper
```

## Verify the Cluster is Running

Send the four-letter-word (4lw) commands directly to the TCP port using `nc`:

```bash
echo ruok | nc localhost 9181
# Expected output: imok

echo mntr | nc localhost 9181
```

Check that leader election completed:

```bash
echo stat | nc localhost 9181 | grep "Mode"
# Should show: Mode: leader (on one node) and Mode: follower (on others)
```

## Connect ClickHouse Server to Keeper

Update your ClickHouse server `config.xml` to point to Keeper instead of ZooKeeper:

```xml
<zookeeper>
    <node><host>keeper-node-01</host><port>9181</port></node>
    <node><host>keeper-node-02</host><port>9181</port></node>
    <node><host>keeper-node-03</host><port>9181</port></node>
</zookeeper>
```

Restart ClickHouse server after updating the config.

## Summary

Installing ClickHouse Keeper involves deploying the `clickhouse-keeper` package on 3 or more nodes, configuring the Raft cluster with unique server IDs, creating storage directories, and starting the service. Verify health with `ruok` and `stat` commands, then update your ClickHouse server config to point to the new Keeper cluster.
