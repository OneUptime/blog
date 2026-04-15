# How to Use Query Complexity Settings in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Query, Complexity, Setting, Resource Management

Description: Learn how to use ClickHouse query complexity settings to limit memory, execution time, and row counts to protect cluster resources from runaway queries.

---

ClickHouse provides a rich set of query complexity settings that act as guardrails for queries. These settings prevent individual queries from consuming excessive memory, running indefinitely, or scanning billions of rows without limit. Proper configuration protects cluster stability, especially in multi-tenant environments.

## Key Complexity Settings

### Limiting Execution Time

```sql
-- Cancel query after 30 seconds
SET max_execution_time = 30;
```

### Limiting Memory Usage

```sql
-- Limit a single query to 4 GB
SET max_memory_usage = 4294967296;

-- Denominator for overcommit ratio; ClickHouse kills the most overcommitted query when memory is exceeded
SET memory_overcommit_ratio_denominator = 1073741824;
```

### Limiting Rows and Bytes Read

```sql
-- Stop after reading 500 million rows
SET max_rows_to_read = 500000000;

-- Stop after reading 10 GB of uncompressed data
SET max_bytes_to_read = 10737418240;

-- Return partial results instead of throwing an error
SET read_overflow_mode = 'break';
```

The `overflow_mode` options are:
- `throw` - raise an exception (default for most settings)
- `break` - return partial results without error

## Setting Limits Per User Profile

It's better to configure limits in user profiles so they apply consistently rather than relying on clients to set them:

```xml
<profiles>
  <analyst>
    <max_execution_time>60</max_execution_time>
    <max_memory_usage>8589934592</max_memory_usage>
    <max_rows_to_read>1000000000</max_rows_to_read>
    <read_overflow_mode>throw</read_overflow_mode>
  </analyst>

  <dashboard>
    <max_execution_time>10</max_execution_time>
    <max_memory_usage>2147483648</max_memory_usage>
    <max_rows_to_read>100000000</max_rows_to_read>
    <read_overflow_mode>break</read_overflow_mode>
  </dashboard>
</profiles>
```

## Limiting Result Set Size

Prevent massive result sets from overwhelming the client:

```sql
-- Return at most 1 million rows in a result
SET max_result_rows = 1000000;

-- Return at most 100 MB of result data
SET max_result_bytes = 104857600;

-- Break instead of error when result exceeds limit
SET result_overflow_mode = 'break';
```

## Limiting JOIN Complexity

```sql
-- Limit the right-hand side of a JOIN to 100 million rows
SET max_rows_in_join = 100000000;

-- Limit memory for the JOIN hash table
SET max_bytes_in_join = 2147483648;

SET join_overflow_mode = 'throw';
```

## Checking Which Queries Are Hitting Limits

```sql
SELECT
    query_id,
    user,
    query_duration_ms,
    read_rows,
    memory_usage,
    exception
FROM system.query_log
WHERE exception != ''
    AND event_date = today()
ORDER BY query_duration_ms DESC
LIMIT 20;
```

## Applying Limits at the Quota Level

For rate-based enforcement across multiple queries:

```sql
CREATE QUOTA analyst_quota
    FOR INTERVAL 1 HOUR MAX queries = 1000, MAX read_rows = 100000000000
    TO analyst_role;
```

## Summary

ClickHouse query complexity settings provide granular control over resource consumption at the query, profile, and quota level. Start by defining sensible defaults in user profiles for your workload types, set `overflow_mode` to `break` for dashboard queries that should return partial results gracefully, and monitor `system.query_log` to identify which limits are being hit in production.
