# How to Use any_join_distinct_right_table_keys in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Database, SQL, Query Optimization, Configuration

Description: Learn how any_join_distinct_right_table_keys works in ClickHouse to control duplicate handling in ANY JOIN semantics and produce correct results when joining against non-unique keys.

---

ClickHouse supports a non-standard `ANY` JOIN strictness that returns at most one matching row from the right table for each row in the left table. The `any_join_distinct_right_table_keys` setting toggles between the modern `ANY JOIN` semantics and a legacy behavior that is preserved for backward compatibility. Understanding this setting is important when migrating older ClickHouse code or interpreting results that differ between `ANY LEFT JOIN` and `ANY RIGHT JOIN`.

## What ANY JOIN Does

Standard SQL JOIN types (`INNER`, `LEFT`, `RIGHT`, `FULL`) return all matching rows. If the right table has 3 rows with the same key, a left row with that key will produce 3 output rows.

ClickHouse `ANY JOIN` returns at most one right-table row per left-table row. This is useful for dimension table lookups where you want exactly one enriching record per event, not a row explosion:

```sql
-- Standard LEFT JOIN: may produce multiple rows if users.user_id is not unique
SELECT e.event_type, u.user_name
FROM events AS e
LEFT JOIN users AS u ON e.user_id = u.user_id;

-- ANY LEFT JOIN: returns exactly one match per event row
SELECT e.event_type, u.user_name
FROM events AS e
ANY LEFT JOIN users AS u ON e.user_id = u.user_id;
```

## What any_join_distinct_right_table_keys Controls

This setting enables legacy ClickHouse server behavior in `ANY INNER|LEFT JOIN` operations:

| Value | Behavior |
|---|---|
| `0` (default) | Modern behavior. `t1 ANY LEFT JOIN t2` and `t2 ANY RIGHT JOIN t1` produce equal results. `ANY INNER JOIN` returns one row per key from both tables. |
| `1` | Legacy behavior. `t1 ANY LEFT JOIN t2` and `t2 ANY RIGHT JOIN t1` are *not* equal — a many-to-one left-to-right keys mapping is used. `ANY INNER JOIN` returns all rows from the left table (similar to `SEMI LEFT JOIN`). |

In both modes `ANY JOIN` still returns at most one right-table row per matched left key; the setting changes the symmetry guarantees and the `ANY INNER JOIN` semantics, not the deduplication strategy itself. The ClickHouse documentation recommends using this setting only for backward compatibility if your existing code depends on legacy `JOIN` behavior.

## Checking and Setting the Value

```sql
-- Check the current setting
SELECT value, changed
FROM system.settings
WHERE name = 'any_join_distinct_right_table_keys';

-- Set per query (enables legacy behavior for this query only)
SELECT
    e.user_id,
    e.event_type,
    u.user_name
FROM events AS e
ANY LEFT JOIN users AS u ON e.user_id = u.user_id
SETTINGS any_join_distinct_right_table_keys = 1;
```

In a user profile (only enable this if you need the legacy semantics):

```xml
<clickhouse>
    <profiles>
        <default>
            <any_join_distinct_right_table_keys>1</any_join_distinct_right_table_keys>
        </default>
    </profiles>
</clickhouse>
```

## Practical Examples

### Basic ANY LEFT JOIN

```sql
-- Return one user profile row per event (users may have multiple rows)
SELECT
    e.event_date,
    e.event_type,
    u.user_name,
    u.plan_type
FROM events AS e
ANY LEFT JOIN users AS u ON e.user_id = u.user_id
WHERE e.event_date = today();
```

### ANY INNER JOIN

```sql
-- Include only events for users that exist, one match per event
SELECT
    e.event_id,
    e.event_type,
    u.country
FROM events AS e
ANY INNER JOIN users AS u ON e.user_id = u.user_id
WHERE e.event_date >= today() - 7;
```

### Comparing ANY JOIN to INNER JOIN on Duplicated Right Keys

```sql
-- Setup: right table has duplicate keys
CREATE TABLE dim_products
(
    product_id  UInt64,
    product_name String,
    updated_at  DateTime
)
ENGINE = MergeTree
ORDER BY (product_id, updated_at);

INSERT INTO dim_products VALUES
    (1, 'Widget v1', '2024-01-01 00:00:00'),
    (1, 'Widget v2', '2024-06-01 00:00:00'),
    (2, 'Gadget',    '2024-01-01 00:00:00');

-- INNER JOIN: two rows for product_id=1
SELECT o.order_id, p.product_name
FROM orders AS o
INNER JOIN dim_products AS p ON o.product_id = p.product_id
WHERE o.product_id = 1;
-- Returns: (order_id_1, 'Widget v1'), (order_id_1, 'Widget v2')

-- ANY INNER JOIN: one row for product_id=1
SELECT o.order_id, p.product_name
FROM orders AS o
ANY INNER JOIN dim_products AS p ON o.product_id = p.product_id
WHERE o.product_id = 1;
-- Returns: (order_id_1, 'Widget v1') or (order_id_1, 'Widget v2') - one row
```

## ANY JOIN vs. Using DISTINCT in a Subquery

An alternative to `ANY JOIN` is to deduplicate the right table explicitly before joining:

```sql
-- Explicit deduplication using argMax
SELECT
    e.event_type,
    u.user_name
FROM events AS e
INNER JOIN (
    SELECT
        user_id,
        argMax(user_name, updated_at) AS user_name
    FROM users
    GROUP BY user_id
) AS u ON e.user_id = u.user_id;
```

The subquery approach using `argMax` is explicit about which row is kept (the one with the latest `updated_at`). `ANY JOIN` does not give you control over which duplicate is retained — it picks an arbitrary matching row.

Use the subquery approach when you need deterministic control over which duplicate row is used. Use `ANY JOIN` when any one match per key is acceptable.

## ANY JOIN with Join Tables Engine

The Join table engine stores data in memory pre-indexed for fast lookups. It is designed to work with `ANY JOIN`:

```sql
-- Create a Join table for fast lookups
CREATE TABLE user_lookup
(
    user_id   UInt64,
    user_name String,
    country   String
)
ENGINE = Join(ANY, LEFT, user_id);

-- Populate it
INSERT INTO user_lookup
SELECT user_id, user_name, country FROM users;

-- Fast ANY LEFT JOIN using the Join engine
SELECT
    e.event_type,
    joinGet('user_lookup', 'user_name', e.user_id) AS user_name,
    joinGet('user_lookup', 'country', e.user_id) AS country
FROM events AS e
WHERE e.event_date = today();
```

The Join table engine with `ANY` type automatically handles duplicate keys according to the insertion order: the first-inserted row per key is retained.

## Performance Implications

The two modes use different code paths for building the join hash map. The legacy mode (`= 1`) uses many-to-one left-to-right key mapping, while the modern mode (`= 0`) uses the symmetric implementation that makes `ANY LEFT JOIN` and `ANY RIGHT JOIN` produce equivalent results. Performance differences are usually small compared to the cost of materializing the right side, but you can measure the effect on a specific query:

```sql
-- Measure the effect of the setting on a specific query
SELECT count()
FROM events AS e
ANY LEFT JOIN large_dim_table AS d ON e.product_id = d.product_id
SETTINGS
    any_join_distinct_right_table_keys = 1,
    log_comment = 'any_join_legacy_on';
```

## When to Use This Setting

Enable `any_join_distinct_right_table_keys = 1` only when:

- You are migrating queries from an older ClickHouse deployment and need to preserve the exact result shape of the legacy `ANY INNER|LEFT JOIN` semantics.
- You have an existing query that depends on `ANY INNER JOIN` returning all left-table rows (the legacy `SEMI LEFT JOIN`-like behavior).

Leave it at the default `0` when:

- You are writing new queries — the modern behavior is symmetric (`t1 ANY LEFT JOIN t2` and `t2 ANY RIGHT JOIN t1` produce equal results) and is the recommended path going forward.
- You want consistent semantics across the `ANY LEFT`, `ANY RIGHT`, and `ANY INNER` variants.

## Conclusion

`any_join_distinct_right_table_keys` is a backward-compatibility switch for ClickHouse's `ANY INNER|LEFT JOIN` semantics. The default `0` enables the modern behavior where left/right `ANY JOIN`s are symmetric and `ANY INNER JOIN` returns one row per matched key. Setting it to `1` restores the legacy many-to-one mapping where `ANY INNER JOIN` behaves more like a `SEMI LEFT JOIN`. For full control over which duplicate row is kept on the right side, use `argMax` aggregation in a subquery instead of relying on `ANY JOIN` semantics.
