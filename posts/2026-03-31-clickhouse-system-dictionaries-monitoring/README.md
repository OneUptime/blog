# How to Use system.dictionaries to Monitor Dictionaries in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, system.dictionaries, Dictionary, Monitoring, External Data, System Table

Description: Use system.dictionaries to monitor dictionary load status, memory usage, element counts, and last update timestamps for all dictionaries in ClickHouse.

---

ClickHouse dictionaries are in-memory key-value structures loaded from external sources (databases, files, HTTP endpoints). The `system.dictionaries` table lets you monitor their state - whether they loaded successfully, how much memory they consume, and when they were last refreshed.

## What is system.dictionaries?

`system.dictionaries` contains one row per dictionary defined in ClickHouse (both XML-configured and SQL-defined). Key columns:

- `database`, `name` - dictionary identity
- `status` - load status: `NOT_LOADED`, `LOADED`, `FAILED`, `LOADING`, `LOADED_AND_RELOADING`, `FAILED_AND_RELOADING`, `NOT_EXIST`
- `origin` - configuration file or SQL
- `type` - dictionary structure type (Flat, Hashed, RangeHashed, etc.)
- `source` - source description
- `bytes_allocated` - memory consumed
- `element_count` - number of keys loaded
- `loading_start_time`, `last_successful_update_time` - timing
- `load_factor` - hash table fill ratio
- `last_exception` - error message if loading failed

## Basic Status Query

```sql
SELECT
    database,
    name,
    status,
    element_count,
    formatReadableSize(bytes_allocated) AS memory_used,
    last_successful_update_time,
    last_exception
FROM system.dictionaries
ORDER BY database, name;
```

## Finding Failed Dictionaries

```sql
SELECT
    database,
    name,
    status,
    last_exception,
    loading_start_time
FROM system.dictionaries
WHERE status IN ('FAILED', 'FAILED_AND_RELOADING')
ORDER BY loading_start_time DESC;
```

## Memory Usage by Dictionary

```sql
SELECT
    database,
    name,
    element_count,
    formatReadableSize(bytes_allocated)  AS memory,
    type
FROM system.dictionaries
WHERE status = 'LOADED'
ORDER BY bytes_allocated DESC;
```

## Checking Staleness

Dictionary data can become stale if updates are delayed. Check last update times:

```sql
SELECT
    database,
    name,
    last_successful_update_time,
    dateDiff('minute', last_successful_update_time, now()) AS minutes_since_update
FROM system.dictionaries
WHERE status = 'LOADED'
ORDER BY minutes_since_update DESC;
```

Alert when `minutes_since_update` exceeds the dictionary's configured `lifetime`.

## Manually Reloading a Dictionary

If a dictionary is in `FAILED` state or you want fresh data immediately:

```sql
SYSTEM RELOAD DICTIONARY mydb.country_codes;
```

Or reload all dictionaries:

```sql
SYSTEM RELOAD DICTIONARIES;
```

## Source Types in system.dictionaries

```sql
SELECT
    source,
    count()  AS dict_count,
    sum(element_count) AS total_elements
FROM system.dictionaries
WHERE status = 'LOADED'
GROUP BY source
ORDER BY dict_count DESC;
```

This shows whether your dictionaries are sourced from MySQL, PostgreSQL, HTTP, ClickHouse, or files.

## Summary

`system.dictionaries` provides essential operational visibility into dictionary load status and health in ClickHouse. Monitor it for failed dictionaries, memory consumption, and update staleness. Use `SYSTEM RELOAD DICTIONARY` to force refresh when needed, and set up alerts when dictionaries enter a failed state.
