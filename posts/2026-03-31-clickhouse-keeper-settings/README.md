# How to Configure ClickHouse Keeper Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ClickHouse Keeper, Configuration, Replication, Distributed System

Description: Learn how to configure ClickHouse Keeper, the built-in coordination service that replaces ZooKeeper for managing replicated tables in ClickHouse clusters.

---

ClickHouse Keeper is the native coordination service built into ClickHouse, designed as a drop-in replacement for Apache ZooKeeper. It manages distributed metadata for replicated tables, distributed DDL, and leader election. Proper configuration of Keeper is essential for cluster reliability.

## Keeper Configuration in keeper_config.xml

ClickHouse Keeper can run as an embedded service inside the ClickHouse server process or as a standalone process. For embedded mode, add the `keeper_server` section to `config.xml` or a file in `config.d/`:

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
        <hostname>clickhouse-01</hostname>
        <port>9234</port>
      </server>
      <server>
        <id>2</id>
        <hostname>clickhouse-02</hostname>
        <port>9234</port>
      </server>
      <server>
        <id>3</id>
        <hostname>clickhouse-03</hostname>
        <port>9234</port>
      </server>
    </raft_configuration>
  </keeper_server>
</clickhouse>
```

## Key Configuration Parameters

**`server_id`:** Each Keeper node in the cluster must have a unique integer ID. This must match an entry in the `raft_configuration` section.

**`tcp_port`:** The port that Keeper listens on for client connections. Clients use the ZooKeeper protocol on this port.

**`operation_timeout_ms`:** How long a client waits for a Keeper operation to complete. Increase this if you observe timeout errors during heavy coordination loads.

**`session_timeout_ms`:** How long Keeper keeps a client session alive after losing contact. If a ClickHouse node crashes, other nodes wait this duration before assuming its session is gone.

**`raft_logs_level`:** Controls verbosity of Raft protocol logging. Use `warning` in production to reduce log noise; use `trace` only for debugging.

## Pointing ClickHouse to Keeper

After configuring Keeper, update the `zookeeper` section in `config.xml` to point to Keeper's port:

```xml
<clickhouse>
  <zookeeper>
    <node>
      <host>clickhouse-01</host>
      <port>9181</port>
    </node>
    <node>
      <host>clickhouse-02</host>
      <port>9181</port>
    </node>
    <node>
      <host>clickhouse-03</host>
      <port>9181</port>
    </node>
  </zookeeper>
</clickhouse>
```

## Monitoring Keeper Health

```sql
SELECT *
FROM system.zookeeper_connection;
```

```sql
SELECT *
FROM system.zookeeper
WHERE path = '/';
```

You can also use the four-letter word commands over `nc`:

```bash
echo ruok | nc clickhouse-01 9181
echo mntr | nc clickhouse-01 9181
```

## Snapshot and Log Retention

Keeper periodically takes snapshots to compact its Raft log. Configure snapshot behavior:

```xml
<coordination_settings>
  <rotate_log_storage_interval>100000</rotate_log_storage_interval>
  <reserved_log_items>100000</reserved_log_items>
  <snapshot_distance>100000</snapshot_distance>
</coordination_settings>
```

Ensure the `log_storage_path` and `snapshot_storage_path` directories have sufficient disk space - loss of either can require cluster recovery.

## Summary

ClickHouse Keeper provides a purpose-built coordination layer for ClickHouse replication without the operational overhead of a separate ZooKeeper cluster. Configure it with a unique `server_id` per node, appropriate timeout values, and proper Raft membership, then monitor it through `system.zookeeper_connection` and the built-in four-letter word protocol.
