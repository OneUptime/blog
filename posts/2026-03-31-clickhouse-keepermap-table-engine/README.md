# How to Use KeeperMap Table Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, KeeperMap, Table Engine, ClickHouse Keeper, Distributed State

Description: Learn how the KeeperMap table engine in ClickHouse uses ClickHouse Keeper as a consistent key-value store for distributed coordination and configuration.

---

The KeeperMap table engine stores data in ClickHouse Keeper (or ZooKeeper), providing a strongly consistent, replicated key-value store accessible via SQL. Unlike other table engines, KeeperMap prioritizes consistency over throughput - it is not designed for high-volume analytics but for storing small amounts of configuration or coordination state across distributed systems.

## Prerequisites

KeeperMap requires ClickHouse Keeper (or ZooKeeper) to be configured. In a standard ClickHouse installation with Keeper enabled, you can verify with:

```sql
SELECT * FROM system.zookeeper WHERE path = '/';
```

## Creating a KeeperMap Table

```sql
CREATE TABLE feature_flags
(
    flag_name String,
    enabled   UInt8,
    updated_at DateTime DEFAULT now()
)
ENGINE = KeeperMap('/clickhouse/feature_flags')
PRIMARY KEY flag_name;
```

The path argument (`/clickhouse/feature_flags`) is the ZNode path in Keeper where data is stored. All nodes in the cluster share this path, so the table is globally consistent.

## Basic Operations

KeeperMap supports INSERT, SELECT, DELETE, and UPDATE (via `ALTER TABLE ... UPDATE`). INSERT on an existing primary key overwrites the existing value by default, giving upsert semantics (set `keeper_map_strict_mode=1` to make duplicate keys raise an exception instead):

```sql
-- Insert feature flags
INSERT INTO feature_flags (flag_name, enabled) VALUES
    ('dark_mode', 1),
    ('beta_search', 0),
    ('new_checkout', 1);

-- Query flags
SELECT flag_name, enabled FROM feature_flags;

-- Check a specific flag
SELECT enabled FROM feature_flags WHERE flag_name = 'dark_mode';

-- Disable a flag (INSERT overwrites the existing row)
INSERT INTO feature_flags (flag_name, enabled) VALUES ('dark_mode', 0);

-- Or update in place
ALTER TABLE feature_flags UPDATE enabled = 0 WHERE flag_name = 'dark_mode';
```

## Use Cases

### Distributed Configuration

KeeperMap is well suited for storing configuration that all ClickHouse nodes should see consistently - rate limits, experiment assignments, or maintenance flags:

```sql
CREATE TABLE cluster_config
(
    config_key   String,
    config_value String
)
ENGINE = KeeperMap('/clickhouse/cluster_config')
PRIMARY KEY config_key;

INSERT INTO cluster_config VALUES
    ('max_query_size_mb', '512'),
    ('maintenance_window', 'false');
```

### Distributed Coordination

Because Keeper provides linearizable reads and writes, KeeperMap can be used for lightweight distributed locking or task assignment coordination between ClickHouse instances.

## Limitations

KeeperMap has important constraints to be aware of:

- Low throughput - Keeper is not designed for high-write workloads. Keep writes under a few hundred per second.
- Small data only - Store configuration, flags, or small lookup tables. Do not store millions of rows.
- Inefficient for analytics - aggregations and non-key filters work, but any query that is not an equality/IN lookup on the primary key falls back to a full scan of all keys.
- Primary key required - Every table must have a PRIMARY KEY defined (exactly one column, serialized as the ZNode name).

```sql
-- This will be very slow and is not recommended
INSERT INTO feature_flags SELECT ... FROM large_table; -- avoid
```

## Monitoring KeeperMap

You can inspect the underlying Keeper znodes directly:

```sql
SELECT
    name,
    value,
    czxid,
    mzxid,
    ctime,
    mtime
FROM system.zookeeper
WHERE path = '/clickhouse/feature_flags';
```

## Summary

The KeeperMap table engine provides a SQL interface to ClickHouse Keeper's consistent key-value storage. It is ideal for feature flags, cluster configuration, and lightweight distributed coordination where consistency matters more than throughput. Keep datasets small and write rates low to stay within Keeper's design parameters.
