# How to Instrument TimescaleDB with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, TimescaleDB, PostgreSQL, Time-Series Database, Observability, Metrics, Tracing, Hypertables

Description: Learn how to instrument TimescaleDB with OpenTelemetry for monitoring hypertable performance, continuous aggregates, compression, and query latency.

---

> TimescaleDB extends PostgreSQL with time-series superpowers - hypertables, continuous aggregates, automatic compression, and retention policies. But these features add complexity to monitoring. A slow query might be caused by a missing chunk index, uncompressed data, or a continuous aggregate that has not refreshed. Standard PostgreSQL monitoring misses these details.

OpenTelemetry lets you monitor both the PostgreSQL foundation and the TimescaleDB-specific features. This guide covers setting up metrics collection for TimescaleDB internals, instrumenting application queries, and tracking the health of hypertables, compression jobs, and continuous aggregates.

---

## Architecture Overview

TimescaleDB runs as a PostgreSQL extension, so you get full PostgreSQL metrics plus TimescaleDB-specific data from its internal views and catalog tables. The OpenTelemetry Collector handles both sources.

```mermaid
flowchart LR
    subgraph TimescaleDB
        PG[PostgreSQL Engine]
        TS[TimescaleDB Extension]
        HT[Hypertables & Chunks]
        CA[Continuous Aggregates]
        CJ[Compression Jobs]
    end

    subgraph Application
        App[App + OTel SDK]
    end

    PG -->|pg_stat_statements| Col[OTel Collector]
    TS -->|timescaledb_information views| Col
    App -->|OTLP Traces + Metrics| Col
    Col --> Backend[Observability Backend]
```

---

## Step 1: Set Up the PostgreSQL Metrics Receiver

TimescaleDB is PostgreSQL under the hood, so start with the OpenTelemetry Collector's PostgreSQL receiver. This collects core database metrics like connection counts, transaction rates, and table sizes.

Install and configure the collector with the PostgreSQL receiver. This requires a monitoring user with read access to pg_stat views.

```sql
-- Create a dedicated monitoring user in TimescaleDB
-- This user only needs read access to statistics views
CREATE USER otel_monitor WITH PASSWORD 'secure_password';
GRANT pg_monitor TO otel_monitor;

-- Grant access to TimescaleDB-specific views
GRANT SELECT ON ALL TABLES IN SCHEMA timescaledb_information TO otel_monitor;
GRANT SELECT ON ALL TABLES IN SCHEMA _timescaledb_catalog TO otel_monitor;
GRANT SELECT ON ALL TABLES IN SCHEMA _timescaledb_internal TO otel_monitor;
```

Configure the collector with the PostgreSQL receiver. This scrapes standard PostgreSQL metrics that also apply to TimescaleDB.

```yaml
# otel-collector-config.yaml
receivers:
  # Built-in PostgreSQL receiver for core database metrics
  postgresql:
    endpoint: localhost:5432
    transport: tcp
    username: otel_monitor
    password: ${env:TSDB_MONITOR_PASSWORD}
    databases:
      - mydb
    collection_interval: 15s
    tls:
      insecure: true
    metrics:
      # Enable all relevant PostgreSQL metrics
      postgresql.backends: {enabled: true}
      postgresql.bgwriter.buffers.allocated: {enabled: true}
      postgresql.bgwriter.buffers.writes: {enabled: true}
      postgresql.bgwriter.checkpoint.count: {enabled: true}
      postgresql.blocks_read: {enabled: true}
      postgresql.commits: {enabled: true}
      postgresql.connection.max: {enabled: true}
      postgresql.database.count: {enabled: true}
      postgresql.db_size: {enabled: true}
      postgresql.index.scans: {enabled: true}
      postgresql.operations: {enabled: true}
      postgresql.rollbacks: {enabled: true}
      postgresql.rows: {enabled: true}
      postgresql.table.count: {enabled: true}
      postgresql.table.size: {enabled: true}

  # Receive application traces
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

exporters:
  otlp:
    endpoint: https://oneuptime.com/otlp
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [postgresql, otlp]
      processors: [batch]
      exporters: [otlp]
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
```

---

## Step 2: Collect TimescaleDB-Specific Metrics

The standard PostgreSQL receiver does not capture TimescaleDB internals like chunk counts, compression ratios, and continuous aggregate status. Use a SQL query receiver or custom exporter to collect these.

This script runs as a periodic job and exports TimescaleDB-specific metrics via OpenTelemetry.

```python
import time
import psycopg2
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metrics_exporter import OTLPMetricExporter
from opentelemetry.sdk.resources import Resource

# Configure the meter provider
resource = Resource.create({"service.name": "timescaledb-monitor"})
reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="http://localhost:4317"),
    export_interval_millis=30000  # Export every 30 seconds
)
provider = MeterProvider(resource=resource, metric_readers=[reader])
metrics.set_meter_provider(provider)
meter = metrics.get_meter("timescaledb-metrics")

# Create gauges for TimescaleDB-specific metrics
chunk_count_gauge = meter.create_up_down_counter(
    "timescaledb.hypertable.chunks",
    description="Number of chunks per hypertable"
)
compression_ratio_gauge = meter.create_gauge(
    "timescaledb.compression.ratio",
    description="Compression ratio for compressed hypertables"
)
uncompressed_chunks_gauge = meter.create_up_down_counter(
    "timescaledb.chunks.uncompressed",
    description="Number of uncompressed chunks eligible for compression"
)
cagg_refresh_lag_gauge = meter.create_gauge(
    "timescaledb.continuous_aggregate.refresh_lag_seconds",
    description="Seconds since last continuous aggregate refresh"
)

def collect_timescaledb_metrics():
    """Query TimescaleDB internal views and export metrics."""
    conn = psycopg2.connect(
        host="localhost", port=5432,
        dbname="mydb", user="otel_monitor",
        password="secure_password"
    )
    cur = conn.cursor()

    # Collect hypertable chunk counts
    # This tells you how many chunks exist per hypertable
    cur.execute("""
        SELECT hypertable_schema, hypertable_name,
               count(*) as chunk_count
        FROM timescaledb_information.chunks
        GROUP BY hypertable_schema, hypertable_name
    """)
    for row in cur.fetchall():
        chunk_count_gauge.add(row[2], {
            "hypertable_schema": row[0],
            "hypertable_name": row[1]
        })

    # Collect compression statistics
    # Compression ratio shows how effective compression is for each hypertable
    cur.execute("""
        SELECT hypertable_schema, hypertable_name,
               before_compression_total_bytes,
               after_compression_total_bytes
        FROM timescaledb_information.compression_settings cs
        JOIN hypertable_compression_stats(cs.hypertable_schema || '.' || cs.hypertable_name)
        ON true
        WHERE after_compression_total_bytes > 0
    """)
    for row in cur.fetchall():
        ratio = row[2] / row[3] if row[3] > 0 else 0
        compression_ratio_gauge.set(ratio, {
            "hypertable_schema": row[0],
            "hypertable_name": row[1]
        })

    # Check for uncompressed chunks that should be compressed
    cur.execute("""
        SELECT hypertable_schema, hypertable_name,
               count(*) as uncompressed_count
        FROM timescaledb_information.chunks
        WHERE is_compressed = false
          AND range_end < now() - INTERVAL '1 day'
        GROUP BY hypertable_schema, hypertable_name
    """)
    for row in cur.fetchall():
        uncompressed_chunks_gauge.add(row[2], {
            "hypertable_schema": row[0],
            "hypertable_name": row[1]
        })

    # Check continuous aggregate freshness
    # A large lag means the aggregate is serving stale data
    cur.execute("""
        SELECT view_schema, view_name,
               EXTRACT(EPOCH FROM (now() - last_run_finished_at)) as lag_seconds
        FROM timescaledb_information.jobs j
        JOIN timescaledb_information.job_stats js ON j.job_id = js.job_id
        WHERE j.proc_name = 'policy_refresh_continuous_aggregate'
    """)
    for row in cur.fetchall():
        cagg_refresh_lag_gauge.set(row[2] or 0, {
            "view_schema": row[0],
            "view_name": row[1]
        })

    cur.close()
    conn.close()

# Run collection in a loop
while True:
    try:
        collect_timescaledb_metrics()
    except Exception as e:
        print(f"Metric collection failed: {e}")
    time.sleep(30)  # Collect every 30 seconds
```

---

## Step 3: Instrument Application Queries

For application-level instrumentation, use the PostgreSQL OpenTelemetry instrumentation since TimescaleDB speaks the PostgreSQL wire protocol. The key is adding TimescaleDB-specific attributes to your spans.

This Python example instruments a time-series application that reads and writes to TimescaleDB hypertables.

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.psycopg2 import Psycopg2Instrumentor
import psycopg2
import time

# Configure tracing
resource = Resource.create({"service.name": "timeseries-app"})
provider = TracerProvider(resource=resource)
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://localhost:4317"))
)
trace.set_tracer_provider(provider)

# Auto-instrument psycopg2 - all queries are traced automatically
Psycopg2Instrumentor().instrument()

tracer = trace.get_tracer("timescaledb-app")

class TimeSeriesDB:
    """TimescaleDB client with OpenTelemetry instrumentation."""

    def __init__(self, dsn):
        self.conn = psycopg2.connect(dsn)
        self.conn.autocommit = True

    def insert_metrics(self, metrics_batch):
        """Insert a batch of time-series metrics into a hypertable."""
        with tracer.start_as_current_span("timescaledb.insert_metrics") as span:
            # Record TimescaleDB-specific context
            span.set_attribute("db.system", "timescaledb")
            span.set_attribute("db.operation", "INSERT")
            span.set_attribute("db.sql.table", "device_metrics")
            span.set_attribute("timescaledb.is_hypertable", True)
            span.set_attribute("timescaledb.batch_size", len(metrics_batch))

            cur = self.conn.cursor()
            start = time.monotonic()

            # Use executemany for batch inserts into the hypertable
            cur.executemany(
                """INSERT INTO device_metrics (time, device_id, cpu, memory, disk_io)
                   VALUES (%s, %s, %s, %s, %s)""",
                metrics_batch
            )

            duration_ms = (time.monotonic() - start) * 1000
            span.set_attribute("db.query.duration_ms", duration_ms)
            span.set_attribute("db.rows_affected", len(metrics_batch))

            cur.close()

    def query_time_range(self, device_id, start_time, end_time, bucket_interval='1 hour'):
        """Query time-bucketed data from a hypertable using time_bucket."""
        with tracer.start_as_current_span("timescaledb.query_time_range") as span:
            span.set_attribute("db.system", "timescaledb")
            span.set_attribute("db.operation", "SELECT")
            span.set_attribute("db.sql.table", "device_metrics")
            span.set_attribute("timescaledb.is_hypertable", True)
            span.set_attribute("timescaledb.bucket_interval", bucket_interval)
            span.set_attribute("timescaledb.uses_time_bucket", True)

            cur = self.conn.cursor()
            start = time.monotonic()

            # Use TimescaleDB's time_bucket function for time-series aggregation
            cur.execute("""
                SELECT time_bucket(%s, time) AS bucket,
                       avg(cpu) as avg_cpu,
                       max(cpu) as max_cpu,
                       avg(memory) as avg_memory,
                       count(*) as sample_count
                FROM device_metrics
                WHERE device_id = %s
                  AND time BETWEEN %s AND %s
                GROUP BY bucket
                ORDER BY bucket
            """, [bucket_interval, device_id, start_time, end_time])

            rows = cur.fetchall()
            duration_ms = (time.monotonic() - start) * 1000

            span.set_attribute("db.query.duration_ms", duration_ms)
            span.set_attribute("db.rows_returned", len(rows))

            # Flag slow queries over 2 seconds
            if duration_ms > 2000:
                span.set_attribute("db.query.slow", True)
                span.add_event("slow_timeseries_query", {
                    "duration_ms": duration_ms,
                    "bucket_interval": bucket_interval,
                    "rows_returned": len(rows)
                })

            cur.close()
            return rows

    def query_continuous_aggregate(self, device_id, start_time, end_time):
        """Query a continuous aggregate for pre-computed results."""
        with tracer.start_as_current_span("timescaledb.query_cagg") as span:
            span.set_attribute("db.system", "timescaledb")
            span.set_attribute("db.operation", "SELECT")
            span.set_attribute("db.sql.table", "device_metrics_hourly")
            span.set_attribute("timescaledb.is_continuous_aggregate", True)

            cur = self.conn.cursor()
            start = time.monotonic()

            # Query the continuous aggregate instead of the raw hypertable
            # This is much faster for pre-aggregated time ranges
            cur.execute("""
                SELECT bucket, avg_cpu, max_cpu, avg_memory, sample_count
                FROM device_metrics_hourly
                WHERE device_id = %s
                  AND bucket BETWEEN %s AND %s
                ORDER BY bucket
            """, [device_id, start_time, end_time])

            rows = cur.fetchall()
            duration_ms = (time.monotonic() - start) * 1000

            span.set_attribute("db.query.duration_ms", duration_ms)
            span.set_attribute("db.rows_returned", len(rows))

            cur.close()
            return rows

# Usage
db = TimeSeriesDB("postgresql://user:pass@localhost:5432/mydb")

# Insert a batch of metrics
import datetime
now = datetime.datetime.now(datetime.timezone.utc)
batch = [
    (now, "device-001", 45.2, 72.1, 150.5),
    (now, "device-002", 89.1, 45.3, 220.0),
    (now, "device-003", 12.5, 88.7, 50.2),
]
db.insert_metrics(batch)
```

---

## Step 4: Monitor Compression and Retention Jobs

TimescaleDB runs background jobs for compression and data retention. Monitoring these jobs ensures your storage stays manageable and queries remain fast.

This monitoring function checks the status of all TimescaleDB background jobs and reports their health as metrics and spans.

```python
def monitor_background_jobs(conn):
    """Check TimescaleDB background job health and report via OpenTelemetry."""
    with tracer.start_as_current_span("timescaledb.monitor_jobs") as span:
        cur = conn.cursor()

        # Get the status of all TimescaleDB background jobs
        cur.execute("""
            SELECT
                j.job_id,
                j.proc_name,
                j.schedule_interval,
                js.last_run_status,
                js.last_run_started_at,
                js.last_run_finished_at,
                js.last_run_duration,
                js.next_start,
                js.total_runs,
                js.total_failures
            FROM timescaledb_information.jobs j
            JOIN timescaledb_information.job_stats js ON j.job_id = js.job_id
            ORDER BY j.job_id
        """)

        jobs = cur.fetchall()
        failed_jobs = 0
        overdue_jobs = 0

        for job in jobs:
            job_id, proc_name, schedule_interval, last_status = job[0], job[1], job[2], job[3]
            last_started, last_finished = job[4], job[5]
            total_runs, total_failures = job[8], job[9]

            # Track failed jobs
            if last_status == 'Failed':
                failed_jobs += 1
                span.add_event("job_failed", {
                    "job_id": job_id,
                    "proc_name": proc_name,
                    "total_failures": total_failures
                })

            # Check if any job is overdue (not running on schedule)
            if job[7] and job[7] < datetime.datetime.now(datetime.timezone.utc):
                overdue_jobs += 1

        span.set_attribute("timescaledb.jobs.total", len(jobs))
        span.set_attribute("timescaledb.jobs.failed", failed_jobs)
        span.set_attribute("timescaledb.jobs.overdue", overdue_jobs)

        # Alert-worthy conditions
        if failed_jobs > 0:
            span.set_status(trace.StatusCode.ERROR,
                f"{failed_jobs} background jobs in failed state")

        cur.close()
```

---

## Step 5: Track Chunk and Hypertable Health

Hypertable performance depends on chunk sizing and the number of chunks involved in queries. Monitor chunk statistics to catch issues early.

```mermaid
flowchart TD
    subgraph Hypertable Health Monitoring
        A[Chunk Count per Hypertable]
        B[Chunk Size Distribution]
        C[Compression Status]
        D[Retention Policy Status]
    end

    A -->|Alert if| A1["Chunk count > 10000"]
    B -->|Alert if| B1["Chunks significantly different sizes"]
    C -->|Alert if| C1["Uncompressed chunks older than policy"]
    D -->|Alert if| D1["Retention job failed or overdue"]
```

This SQL query provides a comprehensive view of hypertable health that you can export as metrics.

```sql
-- Comprehensive hypertable health query
-- Run periodically and export values as OpenTelemetry gauge metrics
SELECT
    h.hypertable_schema,
    h.hypertable_name,
    -- Total data size including indexes
    pg_size_pretty(hypertable_size(format('%I.%I', h.hypertable_schema, h.hypertable_name))) as total_size,
    -- Number of chunks
    (SELECT count(*) FROM timescaledb_information.chunks c
     WHERE c.hypertable_schema = h.hypertable_schema
       AND c.hypertable_name = h.hypertable_name) as chunk_count,
    -- Number of compressed chunks
    (SELECT count(*) FROM timescaledb_information.chunks c
     WHERE c.hypertable_schema = h.hypertable_schema
       AND c.hypertable_name = h.hypertable_name
       AND c.is_compressed = true) as compressed_chunks,
    -- Approximate row count
    (SELECT reltuples::bigint FROM pg_class
     WHERE oid = format('%I.%I', h.hypertable_schema, h.hypertable_name)::regclass) as approx_rows
FROM timescaledb_information.hypertables h
ORDER BY h.hypertable_name;
```

---

## Step 6: Set Up Alerts for TimescaleDB

Effective alerts for TimescaleDB combine standard PostgreSQL alerts with time-series-specific conditions.

```yaml
# Alert conditions to configure in your observability backend

# Compression job not running
# Condition: timescaledb.jobs.failed > 0 WHERE proc_name = 'policy_compression'
# Severity: Warning
# Description: Compression job has failed, uncompressed data will accumulate

# Continuous aggregate stale
# Condition: timescaledb.continuous_aggregate.refresh_lag_seconds > 3600
# Severity: Warning
# Description: Continuous aggregate has not refreshed in over 1 hour

# High chunk count
# Condition: timescaledb.hypertable.chunks > 10000
# Severity: Warning
# Description: Hypertable has too many chunks, queries may slow down

# Connection pool exhaustion
# Condition: postgresql.backends / postgresql.connection.max > 0.85
# Severity: Critical
# Description: Database connections nearing limit

# Slow time-series query
# Condition: p95(timescaledb.query.duration_ms) > 5000 WHERE timescaledb.uses_time_bucket = true
# Severity: Warning
# Description: Time-bucket queries taking over 5 seconds at p95
```

---

## Practical Tips

**Chunk interval sizing matters.** The default chunk interval is 7 days. For high-ingest workloads, shorter intervals (1 day or even 1 hour) keep chunk sizes manageable and compression more effective. Monitor chunk sizes to determine if your interval needs adjustment.

**Monitor compression ratios.** Good compression ratios for time-series data are typically 10x to 20x. If your ratio drops below 5x, review your compression settings - you may need to adjust the segment-by and order-by columns.

**Track continuous aggregate freshness.** Stale continuous aggregates serve outdated data. Your monitoring should alert when the refresh lag exceeds an acceptable threshold for your use case.

**Use pg_stat_statements.** TimescaleDB inherits PostgreSQL's pg_stat_statements extension. Enable it to track query performance statistics across all queries, not just the ones your application instruments.

```sql
-- Enable pg_stat_statements if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find the slowest time-series queries
SELECT
    query,
    calls,
    mean_exec_time as avg_ms,
    max_exec_time as max_ms,
    rows
FROM pg_stat_statements
WHERE query LIKE '%time_bucket%'
   OR query LIKE '%device_metrics%'
ORDER BY mean_exec_time DESC
LIMIT 20;
```

---

## Conclusion

Instrumenting TimescaleDB with OpenTelemetry goes beyond standard PostgreSQL monitoring. By tracking hypertable chunk health, compression job status, continuous aggregate freshness, and query-level performance, you get complete visibility into your time-series infrastructure. The combination of the collector's PostgreSQL receiver for server metrics and application-level instrumentation for query traces gives you everything you need. Pair this with a backend like [OneUptime](https://oneuptime.com) to build dashboards and alerts that keep your TimescaleDB deployment healthy and performant.
