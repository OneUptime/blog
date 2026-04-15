# How to Use normalizeQuery() and normalizedQueryHash() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, String Function, Query Analysis, Observability, SQL

Description: Learn how normalizeQuery() strips literals from SQL strings to produce query templates, and how normalizedQueryHash() groups them for performance analysis.

---

When you instrument a database with query logging, each unique combination of literal values produces a distinct query string even when the query structure is identical. Comparing thousands of variations of `SELECT * FROM orders WHERE id = 1` versus `SELECT * FROM orders WHERE id = 2` is unhelpful for performance analysis. ClickHouse's `normalizeQuery()` function solves this by replacing all literals with placeholders, reducing any query to its structural template. `normalizedQueryHash()` goes a step further and returns a numeric hash of the normalized form, making GROUP BY operations extremely fast.

## Function Signatures

```text
normalizeQuery(query_string)        -- returns String: normalized query template
normalizedQueryHash(query_string)   -- returns UInt64: hash of normalized query
```

`normalizeQuery` replaces:
- Numeric literals with `?`
- String literals with `?`
- Arrays of literals with `[?..]`

The function is purely a string transformation. It does not parse the query for validity.

## Basic Normalization

The following example demonstrates how different literal values collapse to the same template.

```sql
SELECT
    query,
    normalizeQuery(query) AS template
FROM (
    SELECT arrayJoin([
        'SELECT * FROM orders WHERE id = 1',
        'SELECT * FROM orders WHERE id = 999',
        'SELECT * FROM users WHERE email = ''alice@example.com''',
        'SELECT * FROM users WHERE email = ''bob@example.com''',
        'SELECT id FROM events WHERE ts > 1711900800 AND status = ''active'''
    ]) AS query
)
```

```text
query                                                    | template
---------------------------------------------------------+----------------------------------------------
SELECT * FROM orders WHERE id = 1                        | SELECT * FROM orders WHERE id = ?
SELECT * FROM orders WHERE id = 999                      | SELECT * FROM orders WHERE id = ?
SELECT * FROM users WHERE email = 'alice@example.com'    | SELECT * FROM users WHERE email = ?
SELECT * FROM users WHERE email = 'bob@example.com'      | SELECT * FROM users WHERE email = ?
SELECT id FROM events WHERE ts > 1711900800 AND status = 'active' | SELECT id FROM events WHERE ts > ? AND status = ?
```

## Grouping Query Patterns from system.query_log

The primary use case is aggregating the ClickHouse `system.query_log` table to identify the most frequently executed query shapes and their average durations.

```sql
SELECT
    normalizeQuery(query)       AS query_template,
    count()                     AS executions,
    avg(query_duration_ms)      AS avg_duration_ms,
    max(query_duration_ms)      AS max_duration_ms,
    sum(read_rows)              AS total_rows_read
FROM system.query_log
WHERE
    type = 'QueryFinish'
    AND event_date >= today() - 7
GROUP BY query_template
ORDER BY executions DESC
LIMIT 20
```

This query surfaces the most common query patterns in the past week along with their performance characteristics, without being distracted by differing literal values.

## Using normalizedQueryHash for Faster Grouping

When the query log is large, hashing the normalized query before grouping is faster than grouping on the raw string. `normalizedQueryHash` returns a `UInt64` which ClickHouse groups very efficiently.

```sql
SELECT
    normalizedQueryHash(query)  AS query_hash,
    normalizeQuery(any(query))  AS query_template,
    count()                     AS executions,
    avg(query_duration_ms)      AS avg_duration_ms
FROM system.query_log
WHERE
    type = 'QueryFinish'
    AND event_date = today()
GROUP BY query_hash
ORDER BY executions DESC
LIMIT 20
```

`any(query)` picks one representative raw query string so you can still display a human-readable template alongside the hash.

## Finding Slow Query Templates

Combine normalization with percentile functions to identify query templates with a high p99 latency.

```sql
SELECT
    normalizeQuery(query)                   AS query_template,
    count()                                 AS executions,
    quantile(0.50)(query_duration_ms)       AS p50_ms,
    quantile(0.95)(query_duration_ms)       AS p95_ms,
    quantile(0.99)(query_duration_ms)       AS p99_ms
FROM system.query_log
WHERE
    type = 'QueryFinish'
    AND event_date >= today() - 1
GROUP BY query_template
HAVING executions > 10
ORDER BY p99_ms DESC
LIMIT 20
```

## Comparing Query Patterns Across Time Windows

Normalized queries make it easy to track whether the execution count of a specific query template has changed between two periods.

```sql
SELECT
    query_template,
    countIf(event_date = today() - 1) AS yesterday_count,
    countIf(event_date = today())     AS today_count,
    today_count - yesterday_count     AS delta
FROM (
    SELECT
        event_date,
        normalizeQuery(query) AS query_template
    FROM system.query_log
    WHERE
        type = 'QueryFinish'
        AND event_date >= today() - 1
)
GROUP BY query_template
ORDER BY abs(delta) DESC
LIMIT 20
```

## Normalizing Queries Stored in Your Own Tables

`normalizeQuery` is not limited to `system.query_log`. If your application stores audit queries in its own table you can normalize them the same way.

```sql
SELECT
    user_id,
    normalizeQuery(raw_sql)     AS template,
    count()                     AS calls,
    max(executed_at)            AS last_seen
FROM audit_queries
WHERE executed_at >= now() - INTERVAL 24 HOUR
GROUP BY user_id, template
ORDER BY calls DESC
LIMIT 50
```

## Summary

`normalizeQuery()` replaces all literals in a SQL query string with `?` placeholders, producing a structural template that groups identical query patterns regardless of their literal values. `normalizedQueryHash()` returns a `UInt64` hash of this template for fast GROUP BY operations. Together they are the foundation of query performance analysis workflows in ClickHouse, letting you aggregate execution counts, latencies, and resource usage by query shape rather than by exact query text.
