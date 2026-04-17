# How to Use ALTER TABLE MODIFY ORDER BY in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, DDL, ALTER TABLE, ORDER BY, Primary Key

Description: Learn how to change the ORDER BY key of a ClickHouse MergeTree table, understand its constraints, and see how it affects query performance and data.

---

The `ORDER BY` clause of a MergeTree table defines its primary sort key - the physical order in which data is stored in each part. Choosing the right sort key is one of the most impactful decisions when designing a ClickHouse schema. `ALTER TABLE MODIFY ORDER BY` lets you update this key on an existing table, but with important constraints that differ from ordinary column changes.

## Basic Syntax

```sql
ALTER TABLE table_name
    MODIFY ORDER BY (column1, column2, ...);
```

Example - adding a column to an existing sort key:

```sql
-- Original table ordered by (event_date)
ALTER TABLE events
    MODIFY ORDER BY (event_date, user_id);
```

## Constraints on MODIFY ORDER BY

ClickHouse imposes strict rules on what the new ORDER BY key can contain:

1. **You cannot add expressions containing existing columns to the sorting key.** The only columns that can be added are those created by an `ADD COLUMN` command in the same `ALTER` query, and those columns must not have a default value. This restriction preserves the invariant that rows within each data part are ordered by the sorting key expression without having to rewrite existing data.
2. **The new key can only extend the existing key; it cannot remove or reorder the leading key columns.** For standard MergeTree where ORDER BY and PRIMARY KEY are identical, the ORDER BY can be extended while the PRIMARY KEY remains unchanged.
3. **New key columns must not be Nullable** (unless `allow_nullable_key` is enabled at table creation).

Workflow for adding a new column to the sort key - add the column and modify the ORDER BY in a single `ALTER` query, with no default value on the new column:

```sql
ALTER TABLE events
    ADD COLUMN region LowCardinality(String),
    MODIFY ORDER BY (event_date, region, user_id);
```

## How Existing Data Is Affected

`MODIFY ORDER BY` takes effect immediately for all new data parts written after the change. Existing parts retain their old sort order. The new sort order is enforced only after existing parts are merged into new parts as part of the background merge process.

To trigger a merge and apply the new order immediately (useful in development):

```sql
OPTIMIZE TABLE events FINAL;
```

In production, rely on background merges rather than forcing `OPTIMIZE FINAL` on large tables, as it can be resource-intensive.

## Relationship Between ORDER BY and PRIMARY KEY

In MergeTree tables, the `PRIMARY KEY` is a prefix of `ORDER BY`. `MODIFY ORDER BY` changes only the sorting key; the primary key remains the same:

```sql
-- Extend ORDER BY while keeping the smaller PRIMARY KEY for index granularity
ALTER TABLE events
    MODIFY ORDER BY (event_date, region, user_id);

-- The PRIMARY KEY remains whatever it was before this ALTER
```

ClickHouse does not provide an `ALTER TABLE ... MODIFY PRIMARY KEY` command. Changing the primary key itself requires creating a new table with the desired `PRIMARY KEY`, inserting the data with `INSERT SELECT`, and renaming the tables.

## When to Use MODIFY ORDER BY

- **Improving filter performance** on a column that was not in the original sort key.
- **Optimizing range queries** by adding a time or ID column to reduce the scan range.
- **Fixing a schema design mistake** discovered after initial data load.

Example: a table originally sorted only by date, but most queries also filter by `service_name`:

```sql
ALTER TABLE logs
    ADD COLUMN service_name LowCardinality(String),
    MODIFY ORDER BY (log_date, service_name, severity);
```

After background merges complete, queries filtering on `service_name` will benefit from the sort order.

## Verifying the New ORDER BY

Confirm the sort key change was applied:

```sql
SELECT
    name,
    engine,
    sorting_key,
    primary_key
FROM system.tables
WHERE name = 'events' AND database = 'default';
```

## Performance Considerations

- Changing ORDER BY does not rewrite data immediately; query performance improves gradually as parts merge.
- On very large tables, triggering `OPTIMIZE TABLE ... FINAL` will read and rewrite all data - plan capacity accordingly.
- A well-chosen ORDER BY reduces the amount of data scanned per query far more effectively than secondary indexes.
- Adding low-cardinality columns near the front of the key provides better skip-index behavior than high-cardinality columns.

## Summary

`ALTER TABLE MODIFY ORDER BY` extends the primary sort key of a MergeTree table without immediately rewriting data. Columns added to the key must be new columns created in the same `ALTER` query via `ADD COLUMN` without a default value, and Nullable columns are not permitted. Existing parts adopt the new order only after background merges rewrite them. Use `system.tables` to verify the updated key, and plan around the gradual rollout of the new sort order on existing data.
