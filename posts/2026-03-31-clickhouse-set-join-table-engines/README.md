# How to Use Set and Join Table Engines in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Set Engine, Join Engine, Table Engine, Query Optimization

Description: Learn how to use the Set and Join table engines in ClickHouse to store data in memory for fast IN checks and join operations.

---

The Set and Join table engines in ClickHouse are special-purpose in-memory engines designed to accelerate specific query patterns. Unlike MergeTree-based engines, these engines hold data entirely in RAM and serve as lookup structures rather than primary storage.

## The Set Table Engine

The Set engine stores a set of unique values in memory. It is designed for use in the right-hand side of `IN` expressions. Once populated, you can use the table in `WHERE col IN set_table` clauses with near-zero lookup cost. Note that you cannot `SELECT` from a Set table directly - it can only be used on the right side of `IN`.

```sql
CREATE TABLE allowed_user_ids
(
    user_id UInt64
)
ENGINE = Set;

INSERT INTO allowed_user_ids VALUES (101), (202), (303);

SELECT * FROM events
WHERE user_id IN allowed_user_ids;
```

The Set engine persists data to disk between restarts (in the table directory), so it survives server restarts. However, it is not designed for large datasets - keep it under a few million rows for predictable memory usage.

### When to Use the Set Engine

- Allowlists and denylists (IP addresses, user IDs, account numbers)
- Configuration-driven filtering where the filter set changes infrequently
- Replacing large `IN (val1, val2, ...)` literals with a managed table

## The Join Table Engine

The Join engine stores data as a pre-built hash table in memory for use in JOIN operations. It offers significantly faster join performance compared to ad-hoc joins on large tables, because the hash table is built once and reused across queries.

```sql
CREATE TABLE user_profiles
(
    user_id UInt64,
    username String,
    country String
)
ENGINE = Join(ANY, LEFT, user_id);

INSERT INTO user_profiles VALUES
    (1, 'alice', 'US'),
    (2, 'bob', 'UK'),
    (3, 'charlie', 'DE');

SELECT
    e.event_name,
    p.username,
    p.country
FROM events AS e
ANY LEFT JOIN user_profiles AS p USING (user_id);
```

The first argument to `Join(strictness, type, keys)` defines the join behavior:
- `ANY` returns one matching row; `ALL` returns all matches
- `LEFT`, `INNER`, `RIGHT` define the join type
- The key columns must match what is used in the JOIN clause

### Persistence and Limitations

Like Set, the Join engine persists its hash table to disk but loads it into memory on startup. Key limitations:

- The engine is not suitable as a general analytics table
- You cannot use `ALTER TABLE ... UPDATE` - use `ALTER TABLE ... DELETE` for row removal, or truncate and reload for bulk changes
- Memory usage can be large for wide tables with many rows

```sql
-- Reload the join table
TRUNCATE TABLE user_profiles;
INSERT INTO user_profiles SELECT user_id, username, country FROM source_table;
```

## Comparing Set and Join Engines

| Feature | Set | Join |
|---|---|---|
| Use case | IN expressions | JOIN operations |
| Key type | One or more columns | One or more columns |
| Returns | Boolean membership | Row data |
| Memory | Low (just keys) | Higher (keys + values) |

## Summary

The Set and Join table engines are niche but powerful tools for ClickHouse query optimization. Use Set when you need fast membership checks in `IN` clauses, and Join when you want pre-materialized hash tables for repeated join operations. Both engines persist to disk and reload on restart, making them practical for semi-static reference data.
