# How to Use REPLACE Column Modifier in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, REPLACE Modifier, Column Modifier, SQL, Query

Description: Learn how the REPLACE column modifier in ClickHouse lets you substitute column expressions in wildcard selections while preserving column names.

---

The `REPLACE` column modifier in ClickHouse lets you override the value of one or more columns in a `SELECT *` or `COLUMNS` expansion, while keeping the original column name in the output. This is useful for inline transformations without rewriting the entire column list.

## Basic Syntax

```sql
SELECT * REPLACE (expression AS column_name) FROM table;
```

The column named `column_name` will return the result of `expression` instead of the stored value.

## Simple Example: Unit Conversion

Convert bytes to megabytes inline:

```sql
SELECT * REPLACE (bytes_sent / 1048576.0 AS bytes_sent) FROM transfer_log;
```

The output column is still called `bytes_sent`, but it now contains the value in MB.

## Multiple REPLACE Clauses

```sql
SELECT * REPLACE (
    round(cpu_pct, 1) AS cpu_pct,
    round(mem_pct, 1) AS mem_pct
) FROM host_stats;
```

## REPLACE for Obfuscation

Mask sensitive fields during a SELECT without removing them:

```sql
SELECT * REPLACE (
    SHA256(email) AS email,
    '***' AS phone
) FROM user_data;
```

## Combining REPLACE and EXCEPT

You can use `REPLACE` and `EXCEPT` together:

```sql
SELECT * EXCEPT (raw_json) REPLACE (toFloat64(score) AS score) FROM events;
```

## REPLACE with COLUMNS

You can use `REPLACE` with `COLUMNS` to replace specific matched columns:

```sql
SELECT COLUMNS('ts_.*') REPLACE (toUnixTimestamp(ts_created) AS ts_created)
FROM event_log;
```

Note: each replacement in the `REPLACE` clause must reference a specific column name that matches the `COLUMNS` pattern. To apply the same transformation to all matched columns uniformly, use the `APPLY` modifier instead: `SELECT COLUMNS('ts_.*') APPLY(x -> toUnixTimestamp(x)) FROM event_log`.

## Practical Use Case: Timestamp Normalization

If some columns store timestamps in different timezones, normalize them inline:

```sql
SELECT * REPLACE (
    toTimeZone(created_at, 'UTC') AS created_at,
    toTimeZone(updated_at, 'UTC') AS updated_at
) FROM global_orders;
```

## Summary

The `REPLACE` modifier provides a clean way to transform specific columns in wildcard selections without rewriting the full column list. It pairs well with `EXCEPT` and `COLUMNS` to build concise, expressive queries in ClickHouse.
