# How to Use clickhouse-keeper-converter Utility

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, clickhouse-keeper-converter, ZooKeeper, ClickHouse Keeper, Migration

Description: Learn how to use clickhouse-keeper-converter to migrate ZooKeeper snapshots to ClickHouse Keeper format when transitioning away from ZooKeeper.

---

`clickhouse-keeper-converter` converts ZooKeeper data snapshots into the ClickHouse Keeper native format. It is the key tool when migrating from ZooKeeper to the built-in ClickHouse Keeper coordination service.

## Why Migrate from ZooKeeper to ClickHouse Keeper

- Eliminates a separate ZooKeeper cluster dependency
- Reduces operational overhead
- ClickHouse Keeper uses the Raft protocol with better ClickHouse integration
- Supports the same ZooKeeper API, so no application changes needed

## Installation

Ships with ClickHouse 22.4+:

```bash
which clickhouse-keeper-converter
# /usr/bin/clickhouse-keeper-converter
```

## Prerequisites

Before converting, take a snapshot of your ZooKeeper data:

```bash
# Trigger a snapshot on ZooKeeper
echo stat | nc localhost 2181 | grep Mode
# In ZooKeeper admin: snapshot creation is automatic
```

ZooKeeper snapshots are stored in the `dataDir` configured in `zoo.cfg`, typically:

```text
/var/lib/zookeeper/data/version-2/snapshot.*
```

## Running the Conversion

```bash
clickhouse-keeper-converter \
  --zookeeper-logs-dir /var/lib/zookeeper/data/version-2/ \
  --zookeeper-snapshots-dir /var/lib/zookeeper/data/version-2/ \
  --output-dir /var/lib/clickhouse/coordination/snapshots/
```

## Verifying the Output

```bash
ls -lh /var/lib/clickhouse/coordination/snapshots/
# snapshot_*.bin files should appear
```

## Configuring ClickHouse Keeper

After conversion, configure ClickHouse Keeper in `config.xml`:

```xml
<keeper_server>
    <tcp_port>2181</tcp_port>
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
            <hostname>ch-keeper-01</hostname>
            <port>9444</port>
        </server>
    </raft_configuration>
</keeper_server>
```

## Post-Migration Verification

```bash
# Check Keeper is accepting connections
echo ruok | nc localhost 2181
# Expected: imok

# Verify ClickHouse nodes reconnected
clickhouse-client --query "SELECT * FROM system.zookeeper WHERE path = '/'"
```

## Summary

`clickhouse-keeper-converter` makes ZooKeeper-to-Keeper migration straightforward by converting existing snapshots rather than requiring a cold start. Combined with Keeper's Raft-based coordination, it simplifies ClickHouse cluster management significantly.
