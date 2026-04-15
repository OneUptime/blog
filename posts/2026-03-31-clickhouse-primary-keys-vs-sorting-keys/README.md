# How to Use Primary Keys vs Sorting Keys in MergeTree Tables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MergeTree, Primary Key, Sorting Key, ORDER BY, Schema Design, Performance

Description: Learn the difference between primary keys and sorting keys in ClickHouse MergeTree tables and how to use a shorter primary key with a longer ORDER BY for performance.

---

In ClickHouse MergeTree tables, the `ORDER BY` clause defines the **sorting key** - the physical row order on disk. The `PRIMARY KEY` clause defines the **primary index** - a sparse index built over a prefix of the sorting key. These two concepts are distinct but related, and understanding their relationship lets you optimize both storage ordering and index precision.

## Default Behavior: PRIMARY KEY = ORDER BY

When you specify only `ORDER BY`, the primary key defaults to the same columns:

```sql
CREATE TABLE events (
    ts       DateTime,
    user_id  UInt64,
    event    String
) ENGINE = MergeTree
ORDER BY (ts, user_id);
-- PRIMARY KEY implicitly = (ts, user_id)
```

## Explicit PRIMARY KEY vs ORDER BY

You can specify a PRIMARY KEY that is a strict prefix of the ORDER BY:

```sql
CREATE TABLE events (
    ts       DateTime,
    user_id  UInt64,
    session_id UInt64,
    event    String
) ENGINE = MergeTree
ORDER BY (ts, user_id, session_id)
PRIMARY KEY (ts, user_id);
```

Here:
- Data is physically sorted by `(ts, user_id, session_id)` - enabling efficient lookups on any prefix.
- The sparse index covers only `(ts, user_id)` - smaller index entries per mark, less memory, faster index scans.

## Why Use a Shorter Primary Key?

The primary index (sparse index) stores one mark per `index_granularity` rows. A shorter key means:
- Smaller index size in memory.
- Faster mark selection for time-range and user-range queries.
- The full sorting key still provides data locality for columns beyond the primary key, improving read efficiency for filters on those columns.

## Practical Example: Time-Series with User and Session

```sql
CREATE TABLE clickstream (
    ts         DateTime,
    user_id    UInt32,
    session_id UInt64,
    page_url   String,
    duration   UInt16
) ENGINE = MergeTree
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, user_id, session_id)
PRIMARY KEY (ts, user_id);
```

Queries filtering on `(ts, user_id)` use the primary index efficiently. Queries additionally filtering on `session_id` benefit from the sort order without extra index overhead.

## Restrictions

- PRIMARY KEY must be a prefix of ORDER BY.
- PRIMARY KEY columns must be a subset of ORDER BY columns in the same order.
- ReplacingMergeTree, SummingMergeTree, etc. deduplicate/merge by the full ORDER BY key.

```sql
-- Invalid: PRIMARY KEY contains column not in ORDER BY prefix position
ORDER BY (ts, user_id)
PRIMARY KEY (user_id)  -- Error: not a prefix
```

## Checking Key Definitions

```sql
SELECT sorting_key, primary_key
FROM system.tables
WHERE name = 'clickstream';
```

```text
sorting_key                     primary_key
ts, user_id, session_id         ts, user_id
```

## When to Use Equal PRIMARY KEY and ORDER BY

For simple tables with few ordering columns, keeping them equal is fine and simpler to reason about:

```sql
CREATE TABLE user_logins (
    user_id  UInt64,
    login_at DateTime
) ENGINE = MergeTree
ORDER BY (user_id, login_at);
```

## When to Use a Shorter PRIMARY KEY

Use a shorter primary key when:
- The ORDER BY has 3+ columns but most queries filter on only the first 2.
- You want to reduce primary index memory footprint.
- The additional ORDER BY columns are needed for correct deduplication (ReplacingMergeTree) but not for index efficiency.

## Summary

In ClickHouse MergeTree, `ORDER BY` defines physical sort order (sorting key) and `PRIMARY KEY` defines the sparse index prefix. By specifying a PRIMARY KEY shorter than ORDER BY, you reduce index memory while keeping full sort-based data locality. The sorting key governs deduplication in variant engines; the primary key governs mark-based query skipping.
