# How to Set max_threads in ClickHouse for Parallel Query Execution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Database, Performance, Configuration, Query Optimization

Description: Learn how to configure max_threads in ClickHouse to control query parallelism, balance CPU usage across concurrent queries, and prevent individual queries from monopolizing server resources.

---

ClickHouse is built for parallel execution. A single query can use all available CPU cores by default, scanning multiple parts and columns simultaneously. The `max_threads` setting controls the maximum number of threads a single query may use. Tuning it lets you balance throughput for individual queries against fairness across concurrent users.

## What max_threads Controls

`max_threads` sets the upper bound on the thread pool size used to execute a single query. This includes:

- Reading and decompressing column data in parallel across CPU cores.
- Parallel aggregation of partial results from multiple threads.
- Parallel sorting.
- Parallel processing of parts within a partition.

Setting `max_threads = 0` (the default) tells ClickHouse to automatically use the number of physical CPU cores available on the server.

## Checking the Current Value

```sql
-- Check current effective value (0 means all cores)
SELECT value, changed
FROM system.settings
WHERE name = 'max_threads';

-- Show max_threads value in vertical format (0 indicates auto-detection of physical cores)
SELECT value
FROM system.settings
WHERE name = 'max_threads'
FORMAT Vertical;
```

## Setting max_threads Per Query

```sql
-- Limit this query to 4 threads
SELECT
    event_date,
    event_type,
    count() AS cnt,
    uniqExact(user_id) AS unique_users
FROM events
WHERE event_date >= today() - 7
GROUP BY event_date, event_type
ORDER BY event_date, cnt DESC
SETTINGS max_threads = 4;
```

## Setting max_threads in User Profiles

For a multi-user ClickHouse server, restricting threads per profile prevents any single user from monopolizing all CPU cores during concurrent query bursts:

```xml
<clickhouse>
    <profiles>

        <!-- Default: allow up to 8 threads per query -->
        <default>
            <max_threads>8</max_threads>
        </default>

        <!-- Dashboard/BI users: restrict to 4 threads so dashboards do not crowd out other queries -->
        <dashboard>
            <max_threads>4</max_threads>
            <max_memory_usage>4294967296</max_memory_usage>
        </dashboard>

        <!-- Data engineers: allow up to 32 threads for heavy ad-hoc queries -->
        <engineer>
            <max_threads>32</max_threads>
        </engineer>

        <!-- ETL pipelines: full parallelism for batch work -->
        <etl>
            <max_threads>0</max_threads>  <!-- 0 = all available cores -->
        </etl>

    </profiles>
</clickhouse>
```

## Relationship with Other Parallelism Settings

`max_threads` works together with several related settings:

### max_insert_threads

Controls parallelism for INSERT SELECT operations separately from SELECT queries:

```sql
-- Use 8 threads for this INSERT SELECT
INSERT INTO events_archive
SELECT * FROM events WHERE event_date < today() - 365
SETTINGS max_insert_threads = 8;
```

### max_streams_to_max_threads_ratio

Allows ClickHouse to create more read streams than threads, improving scheduling flexibility:

```xml
<clickhouse>
    <profiles>
        <default>
            <max_threads>8</max_threads>
            <!-- Create up to 2x as many read streams as threads -->
            <max_streams_to_max_threads_ratio>2</max_streams_to_max_threads_ratio>
        </default>
    </profiles>
</clickhouse>
```

### use_hedged_requests

For distributed queries, hedged requests send the same request to multiple replicas and use the first response:

```sql
SELECT count()
FROM distributed_events
SETTINGS
    max_threads = 8,
    use_hedged_requests = 1;
```

## Monitoring Thread Usage

```sql
-- Current thread usage per running query
SELECT
    query_id,
    user,
    elapsed,
    thread_ids,
    length(thread_ids) AS thread_count,
    left(query, 80) AS query_snippet
FROM system.processes
ORDER BY thread_count DESC;
```

```sql
-- Historical thread counts from query log
SELECT
    query_id,
    user,
    query_duration_ms,
    Settings['max_threads'] AS configured_max_threads,
    ProfileEvents['RealTimeMicroseconds'] / 1e6 AS real_seconds,
    ProfileEvents['OSCPUVirtualTimeMicroseconds'] / 1e6 AS cpu_seconds,
    round(ProfileEvents['OSCPUVirtualTimeMicroseconds'] / ProfileEvents['RealTimeMicroseconds'], 2) AS parallelism_ratio
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_date = today()
ORDER BY query_duration_ms DESC
LIMIT 20;
```

A `parallelism_ratio` close to `max_threads` means the query is effectively using all allocated threads. A ratio much lower than `max_threads` means the query is I/O-bound or the data volume is too small to benefit from more threads.

## Sizing max_threads Based on Workload

| Scenario | Recommended max_threads |
|---|---|
| Single-user server, analytical | 0 (all cores) |
| Multi-user BI dashboard server | 4-8 per user |
| Mixed OLAP + ingestion server | 8-16 for queries, 4-8 for ingestion |
| Microservice with small queries | 2-4 |
| Batch ETL jobs | 0 (all cores) |

A useful formula for multi-user servers: set `max_threads` to `total_cpu_cores / expected_concurrent_queries`. For a 32-core server with 8 typical concurrent users, set `max_threads = 4` in the shared profile.

## Tuning Read Buffer Size

When using multiple threads, each thread allocates its own read buffer. The `max_read_buffer_size` setting controls the size of the buffer used for each filesystem read operation:

```sql
-- Increase per-thread read buffer size for better I/O throughput
SELECT count()
FROM events
SETTINGS
    max_threads = 8,
    max_read_buffer_size = 10485760;  -- 10 MiB read buffer per thread
```

## Setting max_threads via HTTP Interface

When sending queries via the HTTP interface (Grafana, custom scripts):

```bash
curl "http://localhost:8123/?max_threads=4" \
    --data-urlencode "query=SELECT count() FROM events"
```

## Effect on Memory Usage

More threads means more concurrent data buffers in memory. If you increase `max_threads` to use more cores, also consider increasing `max_memory_usage` proportionally:

```sql
SELECT count(), sum(revenue)
FROM large_fact_table
SETTINGS
    max_threads = 32,
    max_memory_usage = 21474836480;  -- 20 GiB to accommodate 32 read buffers
```

## Conclusion

`max_threads` is the primary knob for controlling per-query CPU parallelism in ClickHouse. Leave it at 0 (all cores) for single-user analytical servers, and set explicit per-profile limits for multi-user environments to ensure fair resource sharing. Monitor actual thread utilization via `system.processes` and `system.query_log` to confirm that your configured thread count translates to effective parallelism for your query and data size.
