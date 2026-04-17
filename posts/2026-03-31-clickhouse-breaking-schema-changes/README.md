# How to Handle Breaking Schema Changes in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Schema Migration, Breaking Change, Backward Compatibility, Production

Description: Learn strategies for handling breaking ClickHouse schema changes safely, including column renames, type changes, and table restructuring with zero data loss.

---

Breaking schema changes in ClickHouse - renaming columns, changing types, restructuring tables - require careful coordination between database and application deployments to avoid data loss or query failures.

## What Makes a Schema Change Breaking

- Renaming a column that existing queries reference
- Changing a column type in an incompatible way (e.g., String to UInt64)
- Dropping a column still read by application code
- Changing ORDER BY key (requires table recreation)
- Changing partition key (requires data migration)

## Strategy 1: Expand-Contract for Column Renames

ClickHouse 20.4+ supports RENAME COLUMN, but the application must be updated before the rename:

```sql
-- Phase 1: Add new column (backward compatible)
ALTER TABLE events ADD COLUMN user_uuid UUID DEFAULT generateUUIDv4();

-- Phase 2: Backfill
ALTER TABLE events UPDATE user_uuid = toUUID(user_id) WHERE 1;

-- Phase 3: Update application to read/write user_uuid
-- Deploy new application version

-- Phase 4: Drop old column (after all queries updated)
ALTER TABLE events DROP COLUMN user_id;
```

## Strategy 2: Column Type Migration

Changing String to a numeric type requires a temporary column:

```sql
-- Add new typed column
ALTER TABLE events ADD COLUMN value_f64 Float64 DEFAULT 0;

-- Backfill with conversion
ALTER TABLE events UPDATE value_f64 = toFloat64OrZero(value_str) WHERE 1;

-- Monitor mutation progress
SELECT mutation_id, is_done, parts_to_do FROM system.mutations WHERE table = 'events';

-- After mutation completes and application updated:
ALTER TABLE events DROP COLUMN value_str;
ALTER TABLE events RENAME COLUMN value_f64 TO value_str;
```

## Strategy 3: Table Restructuring via Shadow Table

When ORDER BY or ENGINE needs to change, create a new table:

```sql
-- Create new table with updated structure
CREATE TABLE events_v2 (
    ts       DateTime,
    user_id  String,
    event    LowCardinality(String)
)
ENGINE = MergeTree()
ORDER BY (event, user_id, ts)
PARTITION BY toYYYYMM(ts);

-- Copy data
INSERT INTO events_v2 SELECT ts, user_id, event_type AS event FROM events;

-- Atomic swap using EXCHANGE (ClickHouse 20.5+, requires Atomic database engine)
EXCHANGE TABLES events AND events_v2;

-- Drop old structure
DROP TABLE events_v2;
```

## Feature Flags for Phased Rollouts

Use feature flags to control which column/schema version the application uses:

```python
if feature_flags.get('use_user_uuid'):
    col = 'user_uuid'
else:
    col = 'user_id'

query = f"SELECT {col}, count() FROM events GROUP BY {col}"
```

## Checklist for Breaking Changes

```text
[ ] Write forward and backward migration scripts
[ ] Test rollback locally before production
[ ] Deploy application changes before dropping old columns
[ ] Monitor mutations after applying ALTER UPDATE/DELETE
[ ] Verify new queries work correctly in staging
[ ] Schedule change during low-traffic window if data-heavy
```

## Summary

Breaking schema changes in ClickHouse require sequential expand-contract steps, shadow table patterns for structural changes, and application deployments coordinated with database changes. Planning rollback procedures before starting is essential.
