# How to Use COLUMNS Expression in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, COLUMNS Expression, SQL, Query

Description: A guide to using the COLUMNS expression in ClickHouse for pattern-based column selection, with practical examples for analytics and wide tables.

---

The `COLUMNS` expression in ClickHouse is a meta-column selector that matches one or more columns using a regular expression. It simplifies queries against wide tables and enables schema-flexible analytics.

## Basic Syntax

```sql
SELECT COLUMNS('pattern') FROM table_name;
```

The pattern is a regular expression matched against column names. All matching columns are expanded inline.

## Selecting All Columns Matching a Prefix

```sql
SELECT event_id, COLUMNS('attr_.*') FROM user_events LIMIT 10;
```

This fetches `event_id` plus every column that starts with `attr_`.

## Using COLUMNS in WHERE Clauses

`COLUMNS` is most powerful in SELECT, but you can also verify column existence:

```sql
SELECT name
FROM system.columns
WHERE table = 'user_events'
  AND match(name, 'attr_.*');
```

## Combining with Functions

Apply aggregate or scalar functions to each matched column using the `APPLY` modifier:

```sql
SELECT
    user_id,
    COLUMNS('score_.*') APPLY(max)
FROM leaderboard
GROUP BY user_id;
```

Writing `MAX(COLUMNS('score_.*'))` instead passes all matched columns as separate arguments to a single `MAX` call, which fails because `MAX` is unary. `APPLY(max)` expands to one `max()` per matched column.

## Real-World Example: Multi-Metric Dashboard

Suppose you have a `host_metrics` table with columns like `cpu_idle`, `cpu_user`, `cpu_system`, `mem_free`, `mem_used`:

```sql
SELECT
    toStartOfMinute(ts) AS minute,
    COLUMNS('cpu_.*') APPLY(avg),
    COLUMNS('mem_.*') APPLY(avg)
FROM host_metrics
WHERE ts >= now() - INTERVAL 30 MINUTE
GROUP BY minute
ORDER BY minute;
```

## COLUMNS with Type Filtering

You can restrict matches by type using `system.columns`:

```sql
SELECT name
FROM system.columns
WHERE table = 'events'
  AND match(name, 'ts_.*')
  AND type LIKE 'DateTime%';
```

Then use the resulting names in your query dynamically via client-side templating.

## Limitations

- `COLUMNS` must expand to at least one column, otherwise the query errors.
- Not all SQL contexts support `COLUMNS` - it works in SELECT and with some modifiers.
- Regex must be valid RE2 syntax.

## Summary

The `COLUMNS` expression makes ClickHouse queries concise and adaptable. It is especially valuable for wide event tables, multi-metric schemas, and dashboards that need to stay current as new columns are added.
