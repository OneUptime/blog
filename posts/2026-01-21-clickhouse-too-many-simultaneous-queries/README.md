# How to Fix Too Many Simultaneous Queries in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Troubleshooting, Concurrency, Connection Limits, Query Queuing, Performance, Database, Operations

Description: A troubleshooting guide for resolving Too Many Simultaneous Queries errors in ClickHouse, covering connection limits, query queuing, user quotas, and strategies for high-concurrency workloads.

---

The "Too many simultaneous queries" error occurs when ClickHouse reaches its concurrent query limit. This guide explains how to diagnose the issue and implement solutions for high-concurrency workloads.

## Understanding the Error

### Error Messages

```
DB::Exception: Too many simultaneous queries. Maximum: 100.

DB::Exception: Too many simultaneous queries for user 'analyst'.
Maximum: 50, waiting queries: 25.
```

### Query Limit Hierarchy

```
Server Limit (max_concurrent_queries)
    └── User Limit (max_concurrent_queries_for_user)
        └── Priority Limits
            └── Query Queue
```

## Diagnosing the Problem

### Check Current Query Load

```sql
-- Current running queries
SELECT
    user,
    count() AS queries,
    sum(elapsed) AS total_elapsed,
    avg(elapsed) AS avg_elapsed
FROM system.processes
GROUP BY user
ORDER BY queries DESC;

-- Detailed query list
SELECT
    query_id,
    user,
    elapsed,
    read_rows,
    formatReadableSize(memory_usage) AS memory,
    query
FROM system.processes
ORDER BY elapsed DESC;
```

### Check Server Limits

```sql
-- Server-wide settings
SELECT
    name,
    value
FROM system.settings
WHERE name LIKE '%concurrent%'
   OR name LIKE '%connection%';

-- User-specific limits
SELECT
    user_name,
    max_concurrent_queries_for_user
FROM system.users;
```

### Query Patterns Analysis

```sql
-- Queries per minute (last hour)
SELECT
    toStartOfMinute(query_start_time) AS minute,
    count() AS queries,
    countIf(type = 'QueryStart') AS started,
    countIf(type = 'QueryFinish') AS finished
FROM system.query_log
WHERE event_time >= now() - INTERVAL 1 HOUR
GROUP BY minute
ORDER BY minute DESC;

-- Peak concurrency estimation
SELECT
    toStartOfSecond(query_start_time) AS second,
    count() AS concurrent_queries
FROM system.query_log
WHERE type = 'QueryStart'
  AND event_date = today()
GROUP BY second
ORDER BY concurrent_queries DESC
LIMIT 20;
```

## Immediate Fixes

### Increase Server Limits

```xml
<!-- /etc/clickhouse-server/config.d/connections.xml -->
<clickhouse>
    <!-- Maximum concurrent queries -->
    <max_concurrent_queries>200</max_concurrent_queries>

    <!-- Maximum concurrent queries from single user -->
    <max_concurrent_queries_for_user>50</max_concurrent_queries_for_user>

    <!-- Maximum connections -->
    <max_connections>4096</max_connections>
</clickhouse>
```

### Adjust User Limits

```sql
-- Increase limit for specific user
ALTER USER analyst SETTINGS max_concurrent_queries_for_user = 100;

-- Create high-concurrency profile
CREATE SETTINGS PROFILE high_concurrency
SETTINGS
    max_concurrent_queries_for_user = 100,
    max_execution_time = 60;

-- Apply to user
ALTER USER dashboard_user SETTINGS PROFILE high_concurrency;
```

### Kill Long-Running Queries

```sql
-- Find and kill slow queries
SELECT query_id, user, elapsed, query
FROM system.processes
WHERE elapsed > 300  -- Running more than 5 minutes
ORDER BY elapsed DESC;

-- Kill specific query
KILL QUERY WHERE query_id = 'long-running-query-id';

-- Kill all queries from problematic user
KILL QUERY WHERE user = 'problem_user';

-- Kill queries by pattern
KILL QUERY WHERE query LIKE '%expensive_table%';
```

## Query Queue Configuration

### Enable Query Queuing

```xml
<!-- /etc/clickhouse-server/users.d/queuing.xml -->
<clickhouse>
    <profiles>
        <default>
            <!-- Enable queuing instead of immediate rejection -->
            <queue_max_wait_ms>5000</queue_max_wait_ms>

            <!-- Maximum queries in queue -->
            <max_concurrent_queries_for_all_users>1000</max_concurrent_queries_for_all_users>
        </default>
    </profiles>
</clickhouse>
```

### Priority-Based Queuing

```sql
-- High-priority user (dashboard, alerts)
CREATE USER realtime_user
SETTINGS
    max_concurrent_queries_for_user = 50,
    priority = 1;  -- Higher priority

-- Low-priority user (batch jobs)
CREATE USER batch_user
SETTINGS
    max_concurrent_queries_for_user = 10,
    priority = 10;  -- Lower priority
```

## Connection Management

### Client-Side Connection Pooling

```python
# Python with connection pooling
from clickhouse_pool import ChPool

pool = ChPool(
    host='clickhouse',
    connections_min=5,
    connections_max=20
)

# Reuse connections
with pool.pull() as conn:
    result = conn.execute('SELECT 1')
```

```javascript
// Node.js with connection pooling
const { createPool } = require('generic-pool');
const ClickHouse = require('@clickhouse/client');

const pool = createPool({
    create: async () => {
        return createClient({
            host: 'http://clickhouse:8123'
        });
    },
    destroy: async (client) => {
        await client.close();
    }
}, {
    max: 20,
    min: 5
});

// Use pooled connection
const client = await pool.acquire();
try {
    const result = await client.query({ query: 'SELECT 1' });
} finally {
    pool.release(client);
}
```

### HTTP Keep-Alive

```python
# Enable HTTP keep-alive
import requests
from requests.adapters import HTTPAdapter

session = requests.Session()
adapter = HTTPAdapter(
    pool_connections=10,
    pool_maxsize=20
)
session.mount('http://', adapter)

# Reuse session for multiple queries
response = session.post(
    'http://clickhouse:8123/',
    params={'query': 'SELECT 1'}
)
```

## Application-Level Solutions

### Query Coalescing

```python
# Combine similar queries
from collections import defaultdict
import asyncio

class QueryCoalescer:
    def __init__(self):
        self.pending = defaultdict(list)
        self.lock = asyncio.Lock()

    async def query(self, sql, timeout=0.1):
        async with self.lock:
            future = asyncio.Future()
            self.pending[sql].append(future)

            if len(self.pending[sql]) == 1:
                # First request, schedule execution
                asyncio.create_task(
                    self._execute_after_delay(sql, timeout)
                )

            return await future

    async def _execute_after_delay(self, sql, delay):
        await asyncio.sleep(delay)

        async with self.lock:
            futures = self.pending.pop(sql)

        # Execute once, share result
        result = await self._execute(sql)

        for future in futures:
            future.set_result(result)
```

### Query Caching

```python
# Cache query results
from functools import lru_cache
import hashlib

class CachedClickHouse:
    def __init__(self, client, cache_ttl=60):
        self.client = client
        self.cache = {}
        self.cache_ttl = cache_ttl

    def query(self, sql):
        cache_key = hashlib.md5(sql.encode()).hexdigest()

        if cache_key in self.cache:
            result, timestamp = self.cache[cache_key]
            if time.time() - timestamp < self.cache_ttl:
                return result

        result = self.client.query(sql)
        self.cache[cache_key] = (result, time.time())
        return result
```

### Rate Limiting

```python
# Client-side rate limiting
from ratelimit import limits, sleep_and_retry

class RateLimitedClient:
    def __init__(self, client, calls_per_second=10):
        self.client = client
        self.calls_per_second = calls_per_second

    @sleep_and_retry
    @limits(calls=10, period=1)  # 10 calls per second
    def query(self, sql):
        return self.client.query(sql)
```

## Query Optimization

### Reduce Query Duration

```sql
-- Add LIMIT for exploratory queries
SELECT *
FROM events
WHERE user_id = 12345
LIMIT 100;

-- Use sampling for approximate results
SELECT count() * 100
FROM events SAMPLE 0.01
WHERE event_time >= today() - 30;

-- Timeout for long queries
SELECT *
FROM expensive_query
SETTINGS max_execution_time = 30;
```

### Pre-Compute Results

```sql
-- Create materialized view for common queries
CREATE MATERIALIZED VIEW dashboard_metrics_mv
ENGINE = SummingMergeTree()
ORDER BY (date, metric_name)
AS SELECT
    toDate(event_time) AS date,
    metric_name,
    sum(value) AS total_value,
    count() AS count
FROM metrics
GROUP BY date, metric_name;

-- Query the pre-computed view
SELECT * FROM dashboard_metrics_mv
WHERE date >= today() - 7;
```

## Monitoring

### Concurrent Query Metrics

```sql
-- Current concurrency
SELECT count() AS concurrent_queries
FROM system.processes;

-- Historical peak
SELECT
    toStartOfMinute(query_start_time) AS minute,
    count() AS queries_started,
    max(concurrent_at_start) AS peak_concurrent
FROM (
    SELECT
        query_start_time,
        count() OVER (
            ORDER BY query_start_time
            RANGE BETWEEN INTERVAL 1 SECOND PRECEDING AND CURRENT ROW
        ) AS concurrent_at_start
    FROM system.query_log
    WHERE type = 'QueryStart'
      AND event_date = today()
)
GROUP BY minute
ORDER BY minute DESC
LIMIT 60;
```

### Alerting

```sql
-- Alert query
SELECT
    count() AS concurrent,
    if(concurrent > 80, 'warning', 'ok') AS status
FROM system.processes;
```

```yaml
# Prometheus alert
- alert: ClickHouseHighConcurrency
  expr: clickhouse_processes_count > 80
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "ClickHouse has {{ $value }} concurrent queries"
```

### Connection Tracking

```sql
-- Connections by source
SELECT
    client_name,
    count() AS connections
FROM system.processes
GROUP BY client_name
ORDER BY connections DESC;

-- Connection history
SELECT
    toStartOfHour(query_start_time) AS hour,
    uniqExact(initial_address) AS unique_clients,
    count() AS total_queries
FROM system.query_log
WHERE event_date = today()
GROUP BY hour
ORDER BY hour;
```

## Best Practices

### User Segmentation

```sql
-- Create users for different workloads
CREATE USER dashboard_user SETTINGS
    max_concurrent_queries_for_user = 30,
    max_execution_time = 30,
    priority = 1;

CREATE USER batch_user SETTINGS
    max_concurrent_queries_for_user = 5,
    max_execution_time = 3600,
    priority = 10;

CREATE USER adhoc_user SETTINGS
    max_concurrent_queries_for_user = 10,
    max_execution_time = 300,
    priority = 5;
```

### Server Sizing Guidelines

```
Concurrent Queries | Recommended CPUs | Memory
-------------------|------------------|--------
< 50               | 8                | 32GB
50-100             | 16               | 64GB
100-200            | 32               | 128GB
> 200              | 64+              | 256GB+
```

---

Too many simultaneous queries errors can be addressed by increasing limits, implementing connection pooling, and optimizing queries to complete faster. For sustained high concurrency, consider query caching, pre-computation with materialized views, and proper user segmentation with appropriate limits for each workload type.
