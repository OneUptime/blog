# How to Use Keeper Map Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, KeeperMap, ClickHouse Keeper, Key-Value, Storage

Description: Learn how to use the ClickHouse KeeperMap table engine to store small key-value datasets in ClickHouse Keeper for consistent metadata storage.

---

The `KeeperMap` table engine stores data in ClickHouse Keeper (the ZooKeeper-compatible coordination service embedded in ClickHouse). It is designed for small, frequently updated metadata that needs strong consistency guarantees - think distributed counters, feature flags, or configuration values.

## When to Use KeeperMap

KeeperMap is appropriate for:
- Distributed counters that need consistency across replicas
- Feature flags or configuration values shared across cluster nodes
- Small lookup tables that change frequently and need immediate consistency
- Metadata used for distributed coordination

KeeperMap is NOT suitable for:
- Large datasets (Keeper has limited storage capacity)
- High-throughput writes
- Analytical queries

## Creating a KeeperMap Table

```sql
CREATE TABLE feature_flags (
    flag_name String,
    enabled UInt8,
    updated_at DateTime DEFAULT now()
)
ENGINE = KeeperMap('/clickhouse/feature_flags')
PRIMARY KEY flag_name;
```

The path `/clickhouse/feature_flags` is where data is stored in Keeper's ZNode tree.

## Basic Operations

```sql
-- Insert a feature flag
INSERT INTO feature_flags (flag_name, enabled)
VALUES ('dark_mode', 1), ('beta_ui', 0), ('new_checkout', 1);

-- Read all flags
SELECT * FROM feature_flags;

-- Update a flag (KeeperMap supports UPDATE via mutations)
INSERT INTO feature_flags (flag_name, enabled)
VALUES ('beta_ui', 1);  -- replaces existing value due to PRIMARY KEY

-- Delete a flag
DELETE FROM feature_flags WHERE flag_name = 'beta_ui';
```

## Distributed Counter Example

Use KeeperMap for a distributed counter that is consistent across all cluster nodes:

```sql
CREATE TABLE api_rate_counters (
    key String,
    count UInt64
)
ENGINE = KeeperMap('/clickhouse/rate_counters')
PRIMARY KEY key;

-- All cluster nodes see the same counter values
SELECT count FROM api_rate_counters WHERE key = 'api_user_123';
```

## Replication Behavior

KeeperMap tables are automatically consistent across all ClickHouse nodes in the cluster because Keeper handles the consensus. You do not need to specify replica paths or use `ON CLUSTER` for writes.

```sql
-- Write on node 1
INSERT INTO feature_flags VALUES ('new_feature', 1, now());

-- Immediately visible on node 2 (through Keeper)
SELECT * FROM feature_flags WHERE flag_name = 'new_feature';
```

## Limitations

- Maximum value size: 1 MB per row
- Maximum total storage: limited by Keeper's available memory and disk
- Write throughput: much lower than MergeTree tables
- Not suitable for analytical queries or large scans

## Checking Keeper Storage

```sql
-- View all KeeperMap paths
SELECT name, path, dataLength
FROM system.zookeeper
WHERE path = '/clickhouse/feature_flags';
```

## Summary

The KeeperMap engine provides strongly consistent key-value storage backed by ClickHouse Keeper, making it ideal for small metadata tables like feature flags, counters, and configuration values that need to be instantly consistent across all cluster nodes. For large datasets or analytical queries, use MergeTree engines instead.
