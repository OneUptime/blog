# How to Use Set Table Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Set Engine, Storage Engine, Filter, IN Clause

Description: Learn how to use the Set table engine in ClickHouse to maintain a persistent in-memory set of values for ultra-fast IN and NOT IN filter operations across queries.

---

The `Set` table engine stores a unique set of values in RAM, backed by a file on disk for persistence across restarts. Its sole purpose is to serve as the right-hand side of `IN` and `NOT IN` expressions. When ClickHouse evaluates `column IN (SELECT ... FROM set_table)`, it resolves the Set table into a hash set in memory, making the membership test O(1) per row. This is significantly faster than a subquery that re-scans a large MergeTree table.

## Creating a Set Table

```sql
CREATE TABLE blocked_users
(
    user_id UInt64
)
ENGINE = Set;
```

The column type must match the column you will compare with `IN`.

## Inserting Values

```sql
INSERT INTO blocked_users VALUES (101), (205), (399), (512), (1001);
```

Duplicate values are silently deduplicated - the Set engine only stores unique entries.

## Using IN With a Set Table

```sql
-- Filter out blocked users from a query
SELECT
    user_id,
    event_type,
    event_time
FROM user_events
WHERE event_time >= today()
  AND user_id NOT IN (SELECT user_id FROM blocked_users)
ORDER BY event_time DESC
LIMIT 20;
```

ClickHouse loads the `blocked_users` Set into a hash set once and then applies it to every row scanned from `user_events`.

## Allowlist Pattern

```sql
-- Only process events from premium users
CREATE TABLE premium_users
(
    user_id UInt64
)
ENGINE = Set;

INSERT INTO premium_users
SELECT user_id
FROM user_subscriptions
WHERE plan = 'premium' AND status = 'active';

-- Use in a report
SELECT
    toDate(event_time) AS event_date,
    count()            AS event_count,
    uniq(user_id)      AS unique_users
FROM user_events
WHERE user_id IN (SELECT user_id FROM premium_users)
GROUP BY event_date
ORDER BY event_date DESC
LIMIT 30;
```

## Multi-Column Set

A Set table can hold tuples for multi-column membership tests.

```sql
CREATE TABLE trusted_ip_ranges
(
    tenant_id  UInt32,
    ip_address String
)
ENGINE = Set;

INSERT INTO trusted_ip_ranges VALUES
    (1, '192.168.1.10'),
    (1, '192.168.1.11'),
    (2, '10.0.0.5');

-- Filter requests that come from a trusted IP for the given tenant
SELECT
    request_id,
    tenant_id,
    ip_address,
    endpoint,
    status_code
FROM api_requests
WHERE (tenant_id, ip_address) IN (SELECT tenant_id, ip_address FROM trusted_ip_ranges)
  AND request_time >= now() - INTERVAL 1 HOUR;
```

## Refreshing a Set Table

Because `Set` persists to disk, you can repopulate it without data loss on restart. Use `TRUNCATE` followed by a fresh `INSERT` to replace the contents.

```sql
-- Refresh the blocked user list from a source-of-truth table
TRUNCATE TABLE blocked_users;

INSERT INTO blocked_users
SELECT user_id
FROM account_flags
WHERE flag_type = 'blocked' AND is_active = 1;
```

## Checking Set Contents

The `Set` engine does not support `SELECT` queries at all - you cannot read data back from a Set table directly. To verify which values are in the set, keep a parallel copy in a regular MergeTree table, or check against a known value using `IN`.

```sql
-- Check whether a specific value exists in the set
SELECT (101) IN (SELECT user_id FROM blocked_users) AS is_blocked;
```

```text
is_blocked
1
```

## Combining Multiple Set Tables

```sql
-- Flag rows that match either blocklist
SELECT
    event_id,
    user_id,
    ip_address,
    event_type,
    CASE
        WHEN user_id     IN (SELECT user_id     FROM blocked_users)  THEN 'blocked_user'
        WHEN ip_address  IN (SELECT ip_address  FROM blocked_ips)    THEN 'blocked_ip'
        ELSE 'clean'
    END AS risk_label
FROM raw_events
WHERE event_date = today();
```

## Persistence Across Restarts

The `Set` engine writes its contents to numbered `.bin` files in the table directory. On server restart, these files are loaded back into RAM automatically.

```bash
# Confirm the persistence files exist
ls /var/lib/clickhouse/data/default/blocked_users/
```

```text
1.bin
```

## Performance Comparison

A `Set` table lookup is faster than a subquery against a MergeTree table for repeated lookups because:
- MergeTree subquery: scans column files, decompresses, builds a hash set on each query execution.
- Set table: the hash set is already in memory from the previous load; no scan required after initial load.

```sql
-- Set-based lookup (fast path)
SELECT count()
FROM user_events
WHERE user_id IN (SELECT user_id FROM blocked_users);

-- Equivalent but slower for large account_flags tables
SELECT count()
FROM user_events
WHERE user_id IN (
    SELECT user_id FROM account_flags WHERE flag_type = 'blocked' AND is_active = 1
);
```

## Limitations

- Only supports `IN` and `NOT IN` - you cannot do range scans or aggregations.
- The entire set must fit in RAM.
- No partitioning, replication, or distributed access.
- Schema changes require dropping and recreating the table.
- No `SELECT col FROM set_table` for full row retrieval.

## Summary

The `Set` engine provides a persistent, in-memory hash set optimized exclusively for `IN` and `NOT IN` membership tests. Load it with allowlists, blocklists, or any small collection of keys that needs fast lookup across large scans. Refresh it by truncating and re-inserting when the source data changes.
