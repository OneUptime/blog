# How to Implement Blue-Green Deployments for ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Blue-Green Deployment, DevOps, Migration, High Availability

Description: Learn how to implement blue-green deployments for ClickHouse to enable zero-downtime schema changes and version upgrades.

---

## Why Blue-Green for ClickHouse

Blue-green deployments minimize downtime by maintaining two identical environments - blue (current) and green (new). Traffic switches atomically between them. For ClickHouse, this pattern is especially useful for major schema changes, engine migrations, or version upgrades.

## Table Aliasing with Views

The simplest blue-green pattern uses views as a traffic routing layer:

```sql
-- Blue table (current production)
CREATE TABLE events_blue
(
    event_id    UUID,
    event_time  DateTime,
    user_id     UInt64,
    value       Float64
)
ENGINE = MergeTree()
ORDER BY (user_id, event_time);

-- View pointing to blue
CREATE VIEW events AS SELECT * FROM events_blue;
```

When ready to switch, rebuild the green table and swap the view:

```sql
-- Build green table with new schema
CREATE TABLE events_green
(
    event_id    UUID,
    event_time  DateTime,
    user_id     UInt64,
    value       Float64,
    region      LowCardinality(String) DEFAULT ''
)
ENGINE = MergeTree()
ORDER BY (user_id, event_time);

-- Backfill green from blue
INSERT INTO events_green SELECT *, '' AS region FROM events_blue;

-- Atomic cutover
CREATE OR REPLACE VIEW events AS SELECT * FROM events_green;
```

## EXCHANGE TABLES for Atomic Swap

ClickHouse supports atomic table exchange:

```sql
EXCHANGE TABLES events_blue AND events_green;
```

After the exchange, `events_blue` has the new schema and `events_green` holds the old data. Archive the old version:

```sql
RENAME TABLE events_green TO events_old;
```

## Dual-Write During Migration

To avoid data loss during the migration window, write to both tables:

```bash
# Application config toggles
WRITE_TO_BLUE=true
WRITE_TO_GREEN=true
READ_FROM=blue
```

Once green is fully caught up and validated, flip `READ_FROM=green` and disable blue writes.

## Version Upgrade Pattern

For ClickHouse version upgrades on a cluster, roll out one replica at a time:

```bash
# Drain replica
clickhouse-client --query "SYSTEM STOP MERGES"

# Upgrade ClickHouse binary
apt-get install clickhouse-server=24.x.x

# Restart and verify
systemctl restart clickhouse-server
clickhouse-client --query "SELECT version()"

# Re-enable merges
clickhouse-client --query "SYSTEM START MERGES"
```

## Monitoring During Cutover

Watch for replication lag and query errors during the switch:

```sql
SELECT
    hostname(),
    is_leader,
    absolute_delay
FROM system.replicas
WHERE table = 'events';
```

## Summary

Blue-green deployments for ClickHouse use view-based routing and the `EXCHANGE TABLES` command for atomic cutover. Dual-write windows ensure no data loss during migration, and rolling replica upgrades keep the cluster available. This pattern reduces deployment risk for schema changes and version upgrades.
