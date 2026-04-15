# How to Use max_rows_to_group_by Setting in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, max_rows_to_group_by, GROUP BY, Resource Control, Setting, Aggregation

Description: Use max_rows_to_group_by to cap the number of unique keys in a GROUP BY aggregation and prevent memory exhaustion from high-cardinality groupings.

---

High-cardinality GROUP BY queries can consume enormous amounts of memory in ClickHouse as the aggregation hash table grows. The `max_rows_to_group_by` setting caps how many unique GROUP BY keys are tracked before applying the overflow behavior defined by `group_by_overflow_mode`.

## What is max_rows_to_group_by?

`max_rows_to_group_by` is an integer setting (default: `0`, meaning unlimited) that sets the maximum number of unique keys allowed in a GROUP BY aggregation. When the number of unique keys in the hash table exceeds this limit, ClickHouse applies the `group_by_overflow_mode` strategy.

## Basic Usage

Set a limit on distinct groups:

```sql
SELECT user_id, count() AS events
FROM user_events
GROUP BY user_id
SETTINGS
    max_rows_to_group_by    = 1000000,
    group_by_overflow_mode  = 'throw';
```

If the query would produce more than 1 million distinct `user_id` values, it throws `Limit for number of rows to GROUP BY exceeded`.

## Pairing with group_by_overflow_mode

The `max_rows_to_group_by` setting is only meaningful when combined with `group_by_overflow_mode`. Options are:

- `throw` - raises an exception (safe default for production)
- `break` - stops processing and returns partial aggregation results
- `any` - continues aggregation for keys already in the set but stops adding new keys beyond the limit (approximate results)

```sql
-- Return approximate top results when cardinality is too high
SELECT
    url,
    uniq(user_id)  AS unique_users,
    count()        AS hits
FROM pageviews
GROUP BY url
ORDER BY hits DESC
LIMIT 100
SETTINGS
    max_rows_to_group_by   = 500000,
    group_by_overflow_mode = 'any';
```

## Checking Current Group Cardinality

Before applying limits, estimate cardinality:

```sql
SELECT uniq(user_id) AS distinct_users
FROM user_events
WHERE ts >= today() - 7;
```

Use this to set `max_rows_to_group_by` slightly above the expected cardinality for normal operations, so the limit only fires during anomalous queries.

## Setting Defaults per User Profile

Apply the limit to all queries for a user role:

```sql
ALTER USER analyst
    SETTINGS
        max_rows_to_group_by   = 10000000   MAX 50000000,
        group_by_overflow_mode = 'throw';
```

## Monitoring Limit Breaches

When `throw` mode fires, it appears in `system.query_log` as an exception:

```sql
SELECT
    query_id,
    exception,
    query
FROM system.query_log
WHERE type = 'ExceptionBeforeStart'
   OR (type = 'ExceptionWhileProcessing' AND exception LIKE '%GROUP BY%')
ORDER BY event_time DESC
LIMIT 10;
```

## When to Use This Setting

This setting is most valuable when:

- Exposing ClickHouse to end users or BI tools that may run unbounded GROUP BY queries
- Protecting shared clusters from memory exhaustion caused by high-cardinality aggregations
- Setting up query governor policies for multi-tenant deployments

For internal analytical workloads where cardinality is known and bounded, leaving the setting at `0` (unlimited) is acceptable.

## Summary

`max_rows_to_group_by` provides a memory guard for GROUP BY queries in ClickHouse. Combine it with `group_by_overflow_mode = 'throw'` for strict protection or `'any'` for approximate results. Calibrate the limit based on expected cardinality from your data, and use user profiles to apply limits consistently across your team.
