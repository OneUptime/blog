# How to Set max_execution_time in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Database, Configuration, Performance, Security

Description: Learn how to configure max_execution_time in ClickHouse to automatically cancel long-running queries, protect server resources, and enforce SLAs for different user groups.

---

ClickHouse can run analytical queries that process trillions of rows, and some queries genuinely need minutes to complete. But runaway queries from accidental full-table scans, missing WHERE clauses, or unbounded joins can monopolize CPU and I/O for hours, blocking other users. The `max_execution_time` setting automatically cancels any query that exceeds a configured duration.

## What max_execution_time Does

`max_execution_time` is the maximum number of seconds a query is allowed to run. When the limit is reached, ClickHouse raises an exception and cancels the query. The server logs the cancellation and the client receives an error.

A value of `0` (the default) means no limit - queries run until they finish or the connection is closed.

## Setting max_execution_time Per Query

```sql
-- Cancel query if it runs longer than 30 seconds
SELECT
    user_id,
    count() AS events,
    uniqExact(session_id) AS sessions,
    sum(revenue) AS total
FROM events
WHERE event_date >= today() - 365
GROUP BY user_id
ORDER BY total DESC
LIMIT 100
SETTINGS max_execution_time = 30;
```

The unit is seconds. Fractional seconds are supported:

```sql
-- Cancel after 2.5 seconds
SELECT count() FROM events SETTINGS max_execution_time = 2.5;
```

## Setting max_execution_time in User Profiles

Configure sensible defaults per user type in `/etc/clickhouse-server/users.xml` or a drop-in file:

```xml
<clickhouse>
    <profiles>

        <!-- Dashboard users: fast queries only, 15-second timeout -->
        <dashboard>
            <max_execution_time>15</max_execution_time>
            <readonly>1</readonly>
            <max_memory_usage>4294967296</max_memory_usage>
        </dashboard>

        <!-- API users: moderate timeout for programmatic access -->
        <api>
            <max_execution_time>60</max_execution_time>
            <max_memory_usage>8589934592</max_memory_usage>
        </api>

        <!-- Analysts: longer timeout for complex ad-hoc queries -->
        <analyst>
            <max_execution_time>300</max_execution_time>
            <max_memory_usage>21474836480</max_memory_usage>
        </analyst>

        <!-- ETL pipelines: very long timeout for batch operations -->
        <etl>
            <max_execution_time>7200</max_execution_time>
            <max_memory_usage>42949672960</max_memory_usage>
        </etl>

        <!-- No limit for server-internal operations -->
        <default>
            <max_execution_time>0</max_execution_time>
        </default>

    </profiles>
</clickhouse>
```

## Cancellation Behavior

When `max_execution_time` is reached, ClickHouse:
1. Raises `DB::Exception: Timeout exceeded: elapsed X seconds, maximum: Y`.
2. Cancels the query and releases all resources.
3. Logs the event to `/var/log/clickhouse-server/clickhouse-server.log`.
4. Records the cancelled query in `system.query_log` with `type = 'ExceptionWhileProcessing'`.

```text
Code: 159. DB::Exception: Timeout exceeded: elapsed 30.001 seconds, maximum: 30.
```

## Distinguishing Timeout from Other Errors

```sql
-- Find queries cancelled by timeout
SELECT
    query_id,
    user,
    event_time,
    query_duration_ms,
    exception_code,
    exception,
    left(query, 120) AS query_snippet
FROM system.query_log
WHERE type = 'ExceptionWhileProcessing'
  AND exception_code = 159  -- Timeout exceeded error code
  AND event_date = today()
ORDER BY event_time DESC
LIMIT 20;
```

```sql
-- Timeout rate per user over the past 7 days
SELECT
    user,
    countIf(exception_code = 159) AS timeout_count,
    count() AS total_queries,
    round(countIf(exception_code = 159) / count() * 100, 2) AS timeout_rate_pct
FROM system.query_log
WHERE type IN ('QueryFinish', 'ExceptionWhileProcessing')
  AND event_date >= today() - 7
GROUP BY user
ORDER BY timeout_count DESC;
```

## Timeout for INSERT Queries

The ClickHouse documentation notes that most query complexity restrictions apply primarily to SELECT queries. However, `max_execution_time` is commonly used with INSERT SELECT operations as well. For long-running INSERT SELECT queries, set a generous timeout in the ETL profile:

```sql
-- Long-running INSERT SELECT with explicit timeout
INSERT INTO events_archive
SELECT *
FROM events
WHERE event_date < today() - 365
SETTINGS max_execution_time = 3600;  -- 1 hour
```

## Timeout in HTTP Requests

When querying ClickHouse via HTTP, the execution timeout can be set as a URL parameter:

```bash
curl "http://localhost:8123/" \
    --data-urlencode "query=SELECT count() FROM events WHERE event_date >= today() - 365" \
    --data-urlencode "max_execution_time=30"
```

Or in the query string:

```bash
curl "http://localhost:8123/?query=SELECT+1&max_execution_time=10"
```

## Timeout vs. Connection Timeout

There are three distinct timeouts to be aware of:

| Setting | Controls |
|---|---|
| `max_execution_time` | Total wall-clock time the server spends executing the query |
| `receive_timeout` | Socket-level timeout for receiving data from the network (default 300 seconds) |
| `send_timeout` | Socket-level timeout for sending data to the network (default 300 seconds) |

For queries with large result sets, `receive_timeout` on the client side may need to be higher than `max_execution_time` on the server, or the client will close the connection before the server can return results:

```sql
SELECT count()
FROM large_table
SETTINGS
    max_execution_time = 60,
    receive_timeout = 90,
    send_timeout = 30;
```

## Handling Timeout Exceptions in Application Code

When building applications on top of ClickHouse, catch the timeout exception specifically:

```python
import clickhouse_connect

client = clickhouse_connect.get_client(host='localhost')

try:
    result = client.query(
        'SELECT count() FROM events WHERE event_date >= today() - 365',
        settings={'max_execution_time': 30}
    )
except Exception as e:
    if '159' in str(e) or 'Timeout exceeded' in str(e):
        print("Query timed out - consider a smaller date range or adding filters")
    else:
        raise
```

## Coordinating max_execution_time with Quotas

Quotas track cumulative `execution_time` across all queries over a time window. Set individual query timeouts via `max_execution_time` and overall user budgets via quotas:

```xml
<clickhouse>
    <quotas>
        <analyst_quota>
            <interval>
                <duration>3600</duration>
                <!-- Individual queries limited to 5 minutes by max_execution_time in profile -->
                <!-- Total analyst CPU time per hour: 30 minutes -->
                <execution_time>1800</execution_time>
                <queries>100</queries>
            </interval>
        </analyst_quota>
    </quotas>
</clickhouse>
```

## Finding Appropriate Timeout Values

A simple method:

1. Run a representative set of your slowest legitimate queries and note their p95 execution times.
2. Set `max_execution_time` in the relevant profile to 2-3x the p95 time.
3. Review `system.query_log` weekly for timeout events and adjust.

```sql
-- Find p95 execution time by user profile/type
SELECT
    user,
    quantile(0.95)(query_duration_ms) / 1000 AS p95_seconds,
    quantile(0.99)(query_duration_ms) / 1000 AS p99_seconds,
    max(query_duration_ms) / 1000 AS max_seconds
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_date >= today() - 30
GROUP BY user
ORDER BY p95_seconds DESC;
```

## Conclusion

`max_execution_time` is one of the most important safety settings in a multi-user ClickHouse deployment. Configure it in user profiles based on the expected query complexity for each user type: short timeouts for dashboard users, moderate timeouts for API consumers, and long timeouts for data engineers and ETL pipelines. Monitor cancellation events via `system.query_log` to fine-tune your limits and identify queries that need optimization.
