# How to Use Dynamic Column Selection in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Dynamic Column, Query Optimization, SQL

Description: Learn how to use dynamic column selection in ClickHouse to write flexible queries that adapt to schema changes without rewriting SQL.

---

ClickHouse provides powerful syntax for selecting columns dynamically, letting you write queries that match patterns rather than enumerating every column name. This is especially useful when working with wide tables that have many similar columns.

## The COLUMNS Expression

The `COLUMNS` expression is the core tool for dynamic column selection. It accepts a regular expression and matches all columns whose names match the pattern.

```sql
SELECT COLUMNS('^metric_') FROM system_metrics LIMIT 5;
```

This selects every column whose name starts with `metric_` without naming each one explicitly. The regex is applied unanchored by default, so use `^` when you specifically want a prefix match.

## Matching by Pattern

You can use full regular expression syntax to match columns:

```sql
SELECT COLUMNS('^(cpu|mem|disk)_usage$') FROM host_stats;
```

This matches exactly `cpu_usage`, `mem_usage`, and `disk_usage`.

## Combining with Aggregate Functions

Dynamic column selection works with aggregate functions via the `APPLY` modifier, making it easy to compute statistics across many columns at once. Each matched column becomes its own aggregated result:

```sql
SELECT
    host,
    COLUMNS('bytes_.*') APPLY(sum)
FROM network_stats
GROUP BY host;
```

## Using COLUMNS with APPLY

The `APPLY` modifier lets you apply a function to every matched column:

```sql
SELECT COLUMNS('value_.*') APPLY(round) FROM measurements;
```

This rounds every `value_*` column without listing them individually.

## Excluding Columns with EXCEPT

You can exclude specific columns from a wildcard match:

```sql
SELECT * EXCEPT (internal_id, created_at) FROM events;
```

This is useful when you want almost all columns but need to drop a few.

## Practical Use Case: Schema-Agnostic Reporting

When your table schema evolves and new metric columns are added regularly, dynamic selection avoids constant query updates:

```sql
SELECT
    timestamp,
    host,
    COLUMNS('p\d+_latency_ms') APPLY(max)
FROM latency_data
WHERE timestamp >= now() - INTERVAL 1 HOUR
GROUP BY timestamp, host;
```

Any new `p99_latency_ms`, `p999_latency_ms`, or similar columns are automatically included.

## Checking Which Columns Match

To verify which columns will be selected, query `system.columns`:

```sql
SELECT name
FROM system.columns
WHERE table = 'measurements'
  AND database = 'analytics'
  AND match(name, 'value_.*');
```

## Summary

Dynamic column selection in ClickHouse using `COLUMNS`, `EXCEPT`, `APPLY`, and regular expressions lets you write resilient queries that handle wide or evolving schemas gracefully. This reduces maintenance overhead and makes analytical queries more flexible.
