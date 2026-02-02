# How to Implement Real-Time Analytics with TimescaleDB

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: TimescaleDB, PostgreSQL, Real-Time Analytics, Time-Series Data, Database, Performance

Description: Learn how to implement real-time analytics with TimescaleDB, covering hypertable setup, continuous aggregates, real-time data ingestion, and optimized query patterns for building high-performance analytics dashboards.

---

Real-time analytics requires a database that can handle high-volume data ingestion while simultaneously serving low-latency queries. TimescaleDB, built on PostgreSQL, provides specialized time-series capabilities that make it ideal for analytics workloads involving metrics, events, IoT data, and observability data.

## Understanding TimescaleDB Architecture

TimescaleDB extends PostgreSQL with hypertables, which automatically partition time-series data into smaller chunks based on time intervals. Partitioning improves query performance by allowing the database to scan only relevant chunks instead of the entire dataset.

The following diagram illustrates how TimescaleDB organizes data.

```mermaid
graph TB
    subgraph "TimescaleDB Architecture"
        A[Application] --> B[Hypertable]
        B --> C[Chunk 1<br/>Jan 1-7]
        B --> D[Chunk 2<br/>Jan 8-14]
        B --> E[Chunk 3<br/>Jan 15-21]
        B --> F[Chunk N<br/>...]

        subgraph "Continuous Aggregates"
            G[Hourly Rollup]
            H[Daily Rollup]
            I[Weekly Rollup]
        end

        C --> G
        D --> G
        E --> G
        G --> H
        H --> I
    end

    subgraph "Query Layer"
        J[Real-Time Queries]
        K[Dashboard Queries]
        L[Historical Analysis]
    end

    B --> J
    G --> K
    I --> L
```

## Setting Up TimescaleDB

### Installation with Docker

Running TimescaleDB in Docker provides the quickest way to get started. The following command pulls the official TimescaleDB image with PostgreSQL 15.

```bash
# Pull and run TimescaleDB with PostgreSQL 15
docker run -d --name timescaledb \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=analytics \
  -v timescale_data:/var/lib/postgresql/data \
  timescale/timescaledb:latest-pg15
```

### Enabling the Extension

After connecting to your database, enable the TimescaleDB extension. You only need to do this once per database.

```sql
-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Verify installation
SELECT extversion FROM pg_extension WHERE extname = 'timescaledb';
```

## Creating Hypertables for Analytics

### Basic Hypertable Setup

Hypertables are the foundation of TimescaleDB. Convert a regular PostgreSQL table into a hypertable to enable automatic time-based partitioning. The following example creates a metrics table for application performance monitoring.

```sql
-- Create a standard PostgreSQL table for metrics
CREATE TABLE metrics (
    time        TIMESTAMPTZ NOT NULL,
    device_id   TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    value       DOUBLE PRECISION,
    tags        JSONB
);

-- Convert to hypertable with 1-day chunks
-- The second parameter specifies the time column used for partitioning
SELECT create_hypertable(
    'metrics',
    'time',
    chunk_time_interval => INTERVAL '1 day'
);

-- Create indexes for common query patterns
-- B-tree index for exact device lookups
CREATE INDEX idx_metrics_device_time ON metrics (device_id, time DESC);

-- BRIN index for time-range scans - very efficient for time-series data
CREATE INDEX idx_metrics_time_brin ON metrics USING BRIN (time);
```

### Event Tracking Hypertable

Analytics often involve tracking user events. The following schema supports event analytics with flexible properties stored in JSONB.

```sql
-- Event tracking table for user analytics
CREATE TABLE events (
    time           TIMESTAMPTZ NOT NULL,
    event_id       UUID DEFAULT gen_random_uuid(),
    user_id        TEXT,
    session_id     TEXT,
    event_type     TEXT NOT NULL,
    page_url       TEXT,
    properties     JSONB,
    geo_country    TEXT,
    device_type    TEXT
);

-- Convert to hypertable with hourly chunks for high-volume event data
SELECT create_hypertable(
    'events',
    'time',
    chunk_time_interval => INTERVAL '1 hour'
);

-- Compound index for user journey analysis
CREATE INDEX idx_events_user_session ON events (user_id, session_id, time DESC);

-- Index for event type filtering
CREATE INDEX idx_events_type_time ON events (event_type, time DESC);

-- GIN index for JSONB property queries
CREATE INDEX idx_events_properties ON events USING GIN (properties);
```

## Data Ingestion Patterns

### Batch Insertion with Node.js

Batch inserts significantly improve ingestion throughput. The following Node.js code demonstrates efficient batch insertion using the COPY protocol.

```javascript
const { Pool } = require('pg');
const copyFrom = require('pg-copy-streams').from;

// Connection pool with optimized settings for analytics workloads
const pool = new Pool({
  host: process.env.TIMESCALE_HOST || 'localhost',
  port: 5432,
  database: 'analytics',
  user: 'postgres',
  password: process.env.TIMESCALE_PASSWORD,
  // Higher pool size for concurrent ingestion
  max: 20,
  // Longer idle timeout for batch operations
  idleTimeoutMillis: 30000
});

// Buffer for collecting metrics before batch insert
class MetricsBuffer {
  constructor(flushInterval = 1000, maxSize = 10000) {
    this.buffer = [];
    this.flushInterval = flushInterval;
    this.maxSize = maxSize;

    // Periodic flush ensures data is written even during low traffic
    setInterval(() => this.flush(), this.flushInterval);
  }

  // Add metric to buffer, flush if buffer is full
  add(metric) {
    this.buffer.push({
      time: metric.time || new Date(),
      device_id: metric.deviceId,
      metric_name: metric.name,
      value: metric.value,
      tags: metric.tags || {}
    });

    if (this.buffer.length >= this.maxSize) {
      this.flush();
    }
  }

  // Flush buffer to database using COPY for maximum throughput
  async flush() {
    if (this.buffer.length === 0) return;

    const metrics = this.buffer.splice(0);
    const client = await pool.connect();

    try {
      // COPY is 10-100x faster than INSERT for bulk data
      const stream = client.query(copyFrom(
        `COPY metrics (time, device_id, metric_name, value, tags)
         FROM STDIN WITH (FORMAT csv)`
      ));

      for (const m of metrics) {
        const row = [
          m.time.toISOString(),
          m.device_id,
          m.metric_name,
          m.value,
          JSON.stringify(m.tags)
        ].join(',') + '\n';

        stream.write(row);
      }

      stream.end();

      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      console.log(`Flushed ${metrics.length} metrics`);
    } catch (error) {
      // Re-queue failed metrics for retry
      this.buffer.unshift(...metrics);
      console.error('Flush failed:', error);
    } finally {
      client.release();
    }
  }
}

// Usage example
const metricsBuffer = new MetricsBuffer(1000, 5000);

// Ingest metrics from your application
function recordMetric(deviceId, name, value, tags = {}) {
  metricsBuffer.add({
    deviceId,
    name,
    value,
    tags,
    time: new Date()
  });
}

// Example: Record API response times
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    recordMetric(
      process.env.SERVICE_NAME,
      'http_request_duration_ms',
      Date.now() - start,
      {
        method: req.method,
        path: req.route?.path || req.path,
        status: res.statusCode
      }
    );
  });

  next();
});
```

### Python Ingestion with Asyncio

For Python applications, async ingestion allows handling high throughput without blocking. The following example uses asyncpg for efficient database operations.

```python
import asyncio
import asyncpg
from datetime import datetime
from typing import List, Dict, Any
import json

class AsyncMetricsIngester:
    """
    Async metrics ingester using connection pool and batch inserts.
    Designed for high-throughput scenarios with backpressure handling.
    """

    def __init__(
        self,
        dsn: str,
        batch_size: int = 1000,
        flush_interval: float = 1.0
    ):
        self.dsn = dsn
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        self.buffer: List[Dict[str, Any]] = []
        self.pool = None
        self._flush_task = None

    async def connect(self):
        """Initialize connection pool with optimized settings."""
        self.pool = await asyncpg.create_pool(
            self.dsn,
            min_size=5,
            max_size=20,
            # Statement cache improves prepared statement performance
            statement_cache_size=100
        )
        # Start background flush task
        self._flush_task = asyncio.create_task(self._periodic_flush())

    async def _periodic_flush(self):
        """Background task that flushes buffer periodically."""
        while True:
            await asyncio.sleep(self.flush_interval)
            await self.flush()

    async def add(self, metric: Dict[str, Any]):
        """Add metric to buffer, triggering flush if buffer is full."""
        self.buffer.append({
            'time': metric.get('time', datetime.utcnow()),
            'device_id': metric['device_id'],
            'metric_name': metric['metric_name'],
            'value': metric['value'],
            'tags': json.dumps(metric.get('tags', {}))
        })

        if len(self.buffer) >= self.batch_size:
            await self.flush()

    async def flush(self):
        """Flush buffered metrics to TimescaleDB using COPY."""
        if not self.buffer:
            return

        # Atomically swap buffer to avoid race conditions
        metrics = self.buffer
        self.buffer = []

        async with self.pool.acquire() as conn:
            # Use COPY for bulk insert - much faster than INSERT
            await conn.copy_records_to_table(
                'metrics',
                records=[
                    (m['time'], m['device_id'], m['metric_name'],
                     m['value'], m['tags'])
                    for m in metrics
                ],
                columns=['time', 'device_id', 'metric_name', 'value', 'tags']
            )

        print(f"Flushed {len(metrics)} metrics")

    async def close(self):
        """Graceful shutdown - flush remaining data and close pool."""
        if self._flush_task:
            self._flush_task.cancel()
        await self.flush()
        await self.pool.close()


# Usage example with FastAPI
from fastapi import FastAPI

app = FastAPI()
ingester = AsyncMetricsIngester(
    dsn="postgresql://postgres:password@localhost/analytics",
    batch_size=1000,
    flush_interval=1.0
)

@app.on_event("startup")
async def startup():
    await ingester.connect()

@app.on_event("shutdown")
async def shutdown():
    await ingester.close()

@app.post("/metrics")
async def ingest_metric(metric: dict):
    await ingester.add(metric)
    return {"status": "accepted"}
```

## Continuous Aggregates for Real-Time Dashboards

Continuous aggregates pre-compute and incrementally maintain aggregated views, making dashboard queries extremely fast. Unlike materialized views, they automatically refresh as new data arrives.

### Creating Continuous Aggregates

The following example creates hourly, daily, and monthly aggregates for metrics. Each level builds upon the previous for efficient multi-resolution analytics.

```sql
-- Hourly continuous aggregate for metrics
-- WITH (timescaledb.continuous) marks this as a continuous aggregate
CREATE MATERIALIZED VIEW metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
    -- time_bucket groups timestamps into hourly intervals
    time_bucket('1 hour', time) AS bucket,
    device_id,
    metric_name,
    -- Pre-compute common statistics
    COUNT(*) AS sample_count,
    AVG(value) AS avg_value,
    MIN(value) AS min_value,
    MAX(value) AS max_value,
    -- Percentile approximation for P50, P95, P99
    percentile_agg(value) AS percentile_data
FROM metrics
GROUP BY bucket, device_id, metric_name
-- Include data up to 1 hour ago (allows for late-arriving data)
WITH NO DATA;

-- Enable automatic refresh policy
-- Refresh every 30 minutes, looking back 2 hours
SELECT add_continuous_aggregate_policy('metrics_hourly',
    start_offset => INTERVAL '2 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '30 minutes'
);

-- Daily continuous aggregate built from hourly data
CREATE MATERIALIZED VIEW metrics_daily
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', bucket) AS bucket,
    device_id,
    metric_name,
    SUM(sample_count) AS sample_count,
    -- Weighted average from hourly averages
    SUM(avg_value * sample_count) / SUM(sample_count) AS avg_value,
    MIN(min_value) AS min_value,
    MAX(max_value) AS max_value,
    -- Rollup percentile data
    rollup(percentile_data) AS percentile_data
FROM metrics_hourly
GROUP BY 1, device_id, metric_name
WITH NO DATA;

-- Refresh daily aggregate every hour
SELECT add_continuous_aggregate_policy('metrics_daily',
    start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 hour'
);
```

### Event Analytics Aggregates

For event tracking, create aggregates that support common analytics queries like funnel analysis and user engagement metrics.

```sql
-- Hourly event counts by type and properties
CREATE MATERIALIZED VIEW event_counts_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    event_type,
    geo_country,
    device_type,
    COUNT(*) AS event_count,
    COUNT(DISTINCT user_id) AS unique_users,
    COUNT(DISTINCT session_id) AS unique_sessions
FROM events
GROUP BY bucket, event_type, geo_country, device_type
WITH NO DATA;

SELECT add_continuous_aggregate_policy('event_counts_hourly',
    start_offset => INTERVAL '2 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '15 minutes'
);

-- Page view analytics with engagement metrics
CREATE MATERIALIZED VIEW pageview_analytics_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    page_url,
    COUNT(*) AS views,
    COUNT(DISTINCT user_id) AS unique_visitors,
    COUNT(DISTINCT session_id) AS sessions,
    -- Calculate bounce rate (sessions with single pageview)
    COUNT(DISTINCT session_id) FILTER (
        WHERE session_id IN (
            SELECT session_id FROM events
            GROUP BY session_id HAVING COUNT(*) = 1
        )
    ) AS bounced_sessions
FROM events
WHERE event_type = 'pageview'
GROUP BY bucket, page_url
WITH NO DATA;
```

## Real-Time Query Patterns

### Dashboard Queries with Continuous Aggregates

Real-time dashboards need fast queries. The following examples show how to query continuous aggregates for common dashboard visualizations.

```sql
-- Last 24 hours of metrics with 1-hour resolution
-- Uses the hourly continuous aggregate for fast response
SELECT
    bucket,
    device_id,
    metric_name,
    avg_value,
    min_value,
    max_value,
    -- Extract P95 from percentile aggregate
    approx_percentile(0.95, percentile_data) AS p95_value
FROM metrics_hourly
WHERE bucket >= NOW() - INTERVAL '24 hours'
  AND device_id = 'web-server-1'
  AND metric_name = 'response_time_ms'
ORDER BY bucket DESC;

-- Compare current hour to same hour yesterday
WITH current_hour AS (
    SELECT
        metric_name,
        avg_value,
        sample_count
    FROM metrics_hourly
    WHERE bucket = date_trunc('hour', NOW())
      AND device_id = 'web-server-1'
),
yesterday_hour AS (
    SELECT
        metric_name,
        avg_value,
        sample_count
    FROM metrics_hourly
    WHERE bucket = date_trunc('hour', NOW() - INTERVAL '1 day')
      AND device_id = 'web-server-1'
)
SELECT
    c.metric_name,
    c.avg_value AS current_value,
    y.avg_value AS yesterday_value,
    -- Calculate percentage change
    ROUND(((c.avg_value - y.avg_value) / NULLIF(y.avg_value, 0)) * 100, 2) AS pct_change
FROM current_hour c
LEFT JOIN yesterday_hour y USING (metric_name);
```

### Real-Time Alerting Queries

Alerting queries need to execute quickly and detect anomalies. The following patterns support threshold and anomaly-based alerts.

```sql
-- Check for threshold violations in the last 5 minutes
-- Queries raw hypertable for most recent data
SELECT
    device_id,
    metric_name,
    AVG(value) AS current_avg,
    MAX(value) AS current_max,
    COUNT(*) AS sample_count
FROM metrics
WHERE time >= NOW() - INTERVAL '5 minutes'
GROUP BY device_id, metric_name
HAVING AVG(value) > 100  -- Threshold for alert
    OR MAX(value) > 500;

-- Anomaly detection using standard deviation
-- Compare current values against rolling baseline
WITH baseline AS (
    SELECT
        device_id,
        metric_name,
        AVG(avg_value) AS baseline_avg,
        STDDEV(avg_value) AS baseline_stddev
    FROM metrics_hourly
    WHERE bucket >= NOW() - INTERVAL '7 days'
      AND bucket < NOW() - INTERVAL '1 hour'
    GROUP BY device_id, metric_name
),
current_values AS (
    SELECT
        device_id,
        metric_name,
        AVG(value) AS current_avg
    FROM metrics
    WHERE time >= NOW() - INTERVAL '5 minutes'
    GROUP BY device_id, metric_name
)
SELECT
    c.device_id,
    c.metric_name,
    c.current_avg,
    b.baseline_avg,
    b.baseline_stddev,
    -- Calculate z-score (number of standard deviations from mean)
    (c.current_avg - b.baseline_avg) / NULLIF(b.baseline_stddev, 0) AS z_score
FROM current_values c
JOIN baseline b USING (device_id, metric_name)
WHERE ABS((c.current_avg - b.baseline_avg) / NULLIF(b.baseline_stddev, 0)) > 3;
```

## Building a Real-Time Analytics API

### Node.js Analytics Service

The following Node.js service exposes analytics endpoints optimized for dashboard consumption.

```javascript
const express = require('express');
const { Pool } = require('pg');

const app = express();

const pool = new Pool({
  host: process.env.TIMESCALE_HOST,
  database: 'analytics',
  user: 'postgres',
  password: process.env.TIMESCALE_PASSWORD,
  // Connection pool tuned for read-heavy analytics workload
  max: 50,
  idleTimeoutMillis: 10000
});

// Middleware to set query timeout for analytics queries
app.use('/api/analytics', (req, res, next) => {
  req.queryTimeout = 30000; // 30 second timeout
  next();
});

// Metrics time series endpoint
// Returns aggregated metrics for charting
app.get('/api/analytics/metrics/timeseries', async (req, res) => {
  const { deviceId, metricName, interval, start, end } = req.query;

  // Validate interval parameter
  const validIntervals = ['1 minute', '5 minutes', '1 hour', '1 day'];
  if (!validIntervals.includes(interval)) {
    return res.status(400).json({ error: 'Invalid interval' });
  }

  // Choose data source based on interval for optimal performance
  // Finer intervals query raw data, coarser intervals use aggregates
  const source = interval === '1 minute' || interval === '5 minutes'
    ? 'metrics'
    : 'metrics_hourly';

  const timeColumn = source === 'metrics' ? 'time' : 'bucket';

  try {
    const result = await pool.query({
      text: `
        SELECT
          time_bucket($1::interval, ${timeColumn}) AS bucket,
          AVG(${source === 'metrics' ? 'value' : 'avg_value'}) AS avg_value,
          MIN(${source === 'metrics' ? 'value' : 'min_value'}) AS min_value,
          MAX(${source === 'metrics' ? 'value' : 'max_value'}) AS max_value,
          ${source === 'metrics' ? 'COUNT(*)' : 'SUM(sample_count)'} AS samples
        FROM ${source}
        WHERE device_id = $2
          AND metric_name = $3
          AND ${timeColumn} >= $4::timestamptz
          AND ${timeColumn} < $5::timestamptz
        GROUP BY 1
        ORDER BY 1
      `,
      values: [interval, deviceId, metricName, start, end],
      // Cancel query if it exceeds timeout
      query_timeout: req.queryTimeout
    });

    res.json({
      data: result.rows,
      meta: {
        interval,
        source,
        count: result.rows.length
      }
    });
  } catch (error) {
    console.error('Query failed:', error);
    res.status(500).json({ error: 'Query failed' });
  }
});

// Real-time current values endpoint
// Returns latest values for all metrics on a device
app.get('/api/analytics/metrics/current/:deviceId', async (req, res) => {
  const { deviceId } = req.params;

  try {
    // Use DISTINCT ON to get latest value per metric
    const result = await pool.query({
      text: `
        SELECT DISTINCT ON (metric_name)
          metric_name,
          value,
          time,
          tags
        FROM metrics
        WHERE device_id = $1
          AND time >= NOW() - INTERVAL '5 minutes'
        ORDER BY metric_name, time DESC
      `,
      values: [deviceId]
    });

    res.json({
      deviceId,
      timestamp: new Date().toISOString(),
      metrics: result.rows.reduce((acc, row) => {
        acc[row.metric_name] = {
          value: row.value,
          time: row.time,
          tags: row.tags
        };
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Query failed:', error);
    res.status(500).json({ error: 'Query failed' });
  }
});

// Percentile analysis endpoint
// Returns percentile distribution for latency analysis
app.get('/api/analytics/metrics/percentiles', async (req, res) => {
  const { deviceId, metricName, start, end } = req.query;

  try {
    const result = await pool.query({
      text: `
        SELECT
          time_bucket('1 hour', bucket) AS hour,
          approx_percentile(0.50, rollup(percentile_data)) AS p50,
          approx_percentile(0.90, rollup(percentile_data)) AS p90,
          approx_percentile(0.95, rollup(percentile_data)) AS p95,
          approx_percentile(0.99, rollup(percentile_data)) AS p99,
          SUM(sample_count) AS samples
        FROM metrics_hourly
        WHERE device_id = $1
          AND metric_name = $2
          AND bucket >= $3::timestamptz
          AND bucket < $4::timestamptz
        GROUP BY 1
        ORDER BY 1
      `,
      values: [deviceId, metricName, start, end]
    });

    res.json({ data: result.rows });
  } catch (error) {
    console.error('Query failed:', error);
    res.status(500).json({ error: 'Query failed' });
  }
});

app.listen(3000, () => {
  console.log('Analytics API listening on port 3000');
});
```

## Data Lifecycle Management

### Compression and Retention Policies

TimescaleDB provides built-in compression and retention policies to manage storage costs. Compression can reduce storage by 90% or more for time-series data.

```sql
-- Enable compression on the metrics hypertable
-- Segment by device_id and metric_name for optimal compression
-- Order by time for time-range query efficiency
ALTER TABLE metrics SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'device_id, metric_name',
    timescaledb.compress_orderby = 'time DESC'
);

-- Automatically compress chunks older than 7 days
SELECT add_compression_policy('metrics', INTERVAL '7 days');

-- Set retention policy to drop data older than 90 days
-- Compressed data is dropped along with the chunk
SELECT add_retention_policy('metrics', INTERVAL '90 days');

-- For continuous aggregates, set longer retention
-- Keep hourly aggregates for 1 year
SELECT add_retention_policy('metrics_hourly', INTERVAL '365 days');

-- Keep daily aggregates for 5 years
SELECT add_retention_policy('metrics_daily', INTERVAL '5 years');

-- View compression statistics
SELECT
    hypertable_name,
    chunk_name,
    before_compression_total_bytes,
    after_compression_total_bytes,
    ROUND(
        (1 - after_compression_total_bytes::numeric /
         before_compression_total_bytes) * 100,
        2
    ) AS compression_ratio_pct
FROM timescaledb_information.compressed_chunk_stats
WHERE hypertable_name = 'metrics';
```

### Tiered Storage Architecture

The following diagram shows a tiered storage strategy for analytics data.

```mermaid
graph LR
    subgraph "Hot Tier (0-7 days)"
        A[Raw Data<br/>Full Resolution]
    end

    subgraph "Warm Tier (7-90 days)"
        B[Compressed Data<br/>Full Resolution]
    end

    subgraph "Cold Tier (90+ days)"
        C[Continuous Aggregates<br/>Hourly/Daily Only]
    end

    A -->|Compression Policy| B
    B -->|Retention Policy| C

    D[Real-Time Queries] --> A
    E[Dashboard Queries] --> B
    E --> C
    F[Historical Analysis] --> C
```

## Performance Optimization

### Query Optimization Tips

The following queries demonstrate how to identify and resolve performance issues.

```sql
-- Check chunk size and distribution
-- Chunks should be sized so queries touch minimal chunks
SELECT
    hypertable_name,
    chunk_name,
    range_start,
    range_end,
    pg_size_pretty(total_bytes) AS size
FROM timescaledb_information.chunks
WHERE hypertable_name = 'metrics'
ORDER BY range_end DESC
LIMIT 20;

-- Analyze query plans for slow queries
-- Look for sequential scans on large chunks
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
    time_bucket('1 hour', time) AS bucket,
    AVG(value) AS avg_value
FROM metrics
WHERE device_id = 'web-server-1'
  AND metric_name = 'cpu_usage'
  AND time >= NOW() - INTERVAL '7 days'
GROUP BY 1
ORDER BY 1;

-- Identify missing indexes for common query patterns
-- Check for sequential scans in pg_stat_statements
SELECT
    query,
    calls,
    mean_exec_time,
    total_exec_time
FROM pg_stat_statements
WHERE query LIKE '%metrics%'
ORDER BY total_exec_time DESC
LIMIT 10;

-- Create partial index for frequently queried subset
-- Only indexes data from the last 7 days
CREATE INDEX idx_metrics_recent_device
ON metrics (device_id, metric_name, time DESC)
WHERE time > NOW() - INTERVAL '7 days';
```

### Connection Pool Configuration

Proper connection pooling prevents database overload during traffic spikes.

```javascript
// Production-ready pool configuration
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.TIMESCALE_HOST,
  database: 'analytics',
  user: 'postgres',
  password: process.env.TIMESCALE_PASSWORD,

  // Pool sizing: rule of thumb is (cpu_cores * 2) + effective_spindle_count
  // For SSD-backed databases, start with cpu_cores * 4
  max: parseInt(process.env.DB_POOL_SIZE) || 20,

  // Minimum connections to keep warm
  min: 5,

  // How long a client can be idle before being closed
  idleTimeoutMillis: 30000,

  // How long to wait for a connection from pool
  connectionTimeoutMillis: 5000,

  // Statement timeout for queries (30 seconds)
  statement_timeout: 30000,

  // Application name for monitoring
  application_name: 'analytics-api'
});

// Monitor pool health
pool.on('error', (err) => {
  console.error('Unexpected pool error:', err);
});

// Periodic pool stats logging
setInterval(() => {
  console.log('Pool stats:', {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount
  });
}, 60000);
```

## Monitoring Your Analytics System

### Health Check Queries

Monitor your TimescaleDB deployment with these diagnostic queries.

```sql
-- Check continuous aggregate refresh status
-- Ensure aggregates are being refreshed on schedule
SELECT
    view_name,
    completed_threshold,
    next_start,
    last_run_status
FROM timescaledb_information.continuous_aggregate_stats;

-- Monitor chunk count and size
-- Alert if chunk count grows unexpectedly
SELECT
    hypertable_name,
    COUNT(*) AS chunk_count,
    pg_size_pretty(SUM(total_bytes)) AS total_size,
    pg_size_pretty(AVG(total_bytes)) AS avg_chunk_size
FROM timescaledb_information.chunks
GROUP BY hypertable_name;

-- Check for compression job failures
SELECT
    job_id,
    application_name,
    last_run_status,
    last_run_started_at,
    next_start,
    total_failures
FROM timescaledb_information.jobs
WHERE application_name LIKE 'Compression%';

-- Monitor ingestion rate
-- Compare against expected throughput
SELECT
    time_bucket('5 minutes', time) AS bucket,
    COUNT(*) AS rows_ingested,
    COUNT(*) / 300.0 AS rows_per_second
FROM metrics
WHERE time >= NOW() - INTERVAL '1 hour'
GROUP BY 1
ORDER BY 1 DESC;
```

## Summary

| Component | Implementation |
|-----------|----------------|
| **Hypertables** | Automatic time-based partitioning with configurable chunk intervals |
| **Continuous Aggregates** | Pre-computed rollups with automatic refresh policies |
| **Data Ingestion** | Batch inserts using COPY protocol for maximum throughput |
| **Query Optimization** | Time-bucket queries on aggregates, proper indexing |
| **Data Lifecycle** | Compression and retention policies for cost management |
| **Monitoring** | Chunk stats, aggregate refresh status, ingestion rates |

TimescaleDB provides a powerful foundation for real-time analytics by combining PostgreSQL's reliability and SQL compatibility with specialized time-series optimizations. Continuous aggregates enable sub-second dashboard queries, while compression and retention policies keep storage costs manageable. By following these patterns, you can build analytics systems that handle millions of data points while maintaining real-time query performance.
