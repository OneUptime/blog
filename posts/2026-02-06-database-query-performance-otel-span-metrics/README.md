# How to Monitor Database Query Performance Trends Over Time with OpenTelemetry Span Metrics Connector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Database Performance, Span Metrics, SQL Monitoring, Query Optimization

Description: Use the OpenTelemetry Span Metrics Connector to convert database query spans into time-series metrics for tracking performance trends over time.

Database queries are often the biggest contributor to API latency. A query that runs fine with 10,000 rows can become a nightmare at 10 million. The problem is that individual traces only show you point-in-time performance. To spot trends like "this query has gotten 5% slower every week for the past month," you need time-series metrics. The OpenTelemetry Span Metrics Connector bridges this gap by converting your database spans into metrics you can chart and alert on.

## How the Span Metrics Connector Works

The Span Metrics Connector sits inside the OpenTelemetry Collector pipeline. It receives trace data, extracts span attributes (like database operation, table name, and query text), and emits histogram and counter metrics. These metrics then flow to your time-series database (Prometheus, etc.) for long-term storage and querying.

## Instrumenting Database Calls

First, make sure your database calls generate proper spans. Most OpenTelemetry auto-instrumentation libraries handle this, but here is how to do it manually for custom query patterns:

```python
# db_instrumented.py
import psycopg2
from opentelemetry import trace
from opentelemetry.semconv.trace import SpanAttributes

tracer = trace.get_tracer("db-instrumentation")

class InstrumentedDB:
    def __init__(self, connection_string):
        self.conn = psycopg2.connect(connection_string)

    def execute(self, query, params=None, operation_name=None):
        # Determine the operation type from the query
        op = operation_name or query.strip().split()[0].upper()

        # Extract the table name for better metric grouping
        table = self._extract_table(query)

        with tracer.start_as_current_span(
            f"db.query.{op}",
            attributes={
                SpanAttributes.DB_SYSTEM: "postgresql",
                SpanAttributes.DB_OPERATION: op,
                SpanAttributes.DB_STATEMENT: self._sanitize_query(query),
                "db.table": table,
                "db.rows_affected": 0,  # updated after execution
            },
        ) as span:
            cursor = self.conn.cursor()
            try:
                cursor.execute(query, params)
                rows = cursor.rowcount
                span.set_attribute("db.rows_affected", rows)
                return cursor
            except Exception as e:
                span.set_status(trace.StatusCode.ERROR, str(e))
                span.record_exception(e)
                raise

    def _extract_table(self, query):
        """Extract the primary table name from a SQL query."""
        words = query.upper().split()
        for i, word in enumerate(words):
            if word in ("FROM", "INTO", "UPDATE", "TABLE"):
                if i + 1 < len(words):
                    return words[i + 1].strip(";").lower()
        return "unknown"

    def _sanitize_query(self, query):
        """Remove literal values from query for safe logging."""
        # Simple sanitization - replace string literals and numbers
        import re
        sanitized = re.sub(r"'[^']*'", "'?'", query)
        sanitized = re.sub(r"\b\d+\b", "?", sanitized)
        return sanitized
```

## Configuring the Span Metrics Connector

Configure the collector to extract database-specific dimensions from spans:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

connectors:
  spanmetrics:
    histogram:
      explicit:
        buckets: [1ms, 5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s]
    # Only generate metrics for database spans
    dimensions:
      - name: db.system
      - name: db.operation
      - name: db.table
      - name: service.name
    # Filter to only process database spans
    dimensions_cache_size: 1000
    aggregation_temporality: "AGGREGATION_TEMPORALITY_CUMULATIVE"

processors:
  filter/db-spans:
    spans:
      include:
        match_type: regexp
        span_names: ["db\\.query\\..*"]

exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
    namespace: "db"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [filter/db-spans]
      exporters: [spanmetrics]
    metrics/spanmetrics:
      receivers: [spanmetrics]
      exporters: [prometheus]
```

## Querying Database Performance Trends

Now you can write PromQL queries that show how database performance changes over time:

```promql
# Average query duration by table, over the past 7 days
avg_over_time(
  histogram_quantile(0.95,
    sum(rate(db_duration_milliseconds_bucket{db_system="postgresql"}[1h])) by (le, db_table)
  )[7d:1h]
)

# Query volume by operation type (SELECT, INSERT, UPDATE, DELETE)
sum(rate(db_duration_milliseconds_count{db_system="postgresql"}[5m])) by (db_operation)

# Slowest tables ranked by P95 latency
topk(10,
  histogram_quantile(0.95,
    sum(rate(db_duration_milliseconds_bucket[5m])) by (le, db_table)
  )
)

# Week-over-week P95 comparison for a specific table
histogram_quantile(0.95,
  sum(rate(db_duration_milliseconds_bucket{db_table="orders"}[1h])) by (le)
)
/
histogram_quantile(0.95,
  sum(rate(db_duration_milliseconds_bucket{db_table="orders"}[1h] offset 7d)) by (le)
)
```

## Building a Database Performance Dashboard

Create a Grafana dashboard dedicated to database query trends:

```json
{
  "panels": [
    {
      "title": "Query P95 Latency by Table (7-day trend)",
      "type": "timeseries",
      "targets": [{
        "expr": "histogram_quantile(0.95, sum(rate(db_duration_milliseconds_bucket[1h])) by (le, db_table))",
        "legendFormat": "{{db_table}}"
      }],
      "fieldConfig": {
        "defaults": {
          "unit": "ms"
        }
      }
    },
    {
      "title": "Query Volume by Operation",
      "type": "piechart",
      "targets": [{
        "expr": "sum(rate(db_duration_milliseconds_count[5m])) by (db_operation)",
        "legendFormat": "{{db_operation}}"
      }]
    },
    {
      "title": "Tables with Degrading Performance",
      "type": "table",
      "targets": [{
        "expr": "histogram_quantile(0.95, sum(rate(db_duration_milliseconds_bucket[1h])) by (le, db_table)) / histogram_quantile(0.95, sum(rate(db_duration_milliseconds_bucket[1h] offset 7d)) by (le, db_table))",
        "legendFormat": "{{db_table}}"
      }]
    }
  ]
}
```

## Alerting on Performance Degradation

Set up alerts that fire when database performance trends in the wrong direction:

```yaml
# alerts.yaml
groups:
  - name: database-performance
    rules:
      - alert: DatabaseQuerySlowdown
        expr: |
          histogram_quantile(0.95,
            sum(rate(db_duration_milliseconds_bucket[1h])) by (le, db_table))
          >
          histogram_quantile(0.95,
            sum(rate(db_duration_milliseconds_bucket[1h] offset 7d)) by (le, db_table))
          * 1.5
        for: 2h
        labels:
          severity: warning
        annotations:
          summary: "Query P95 for table {{ $labels.db_table }} is 50% slower than last week"

      - alert: HighQueryVolume
        expr: |
          sum(rate(db_duration_milliseconds_count{db_table!=""}[5m])) by (db_table) > 1000
        for: 15m
        annotations:
          summary: "Table {{ $labels.db_table }} receiving over 1000 queries/sec"
```

## What to Do When Trends Go Bad

When you see a table's query performance degrading over time, the typical causes are:

1. **Table growth without index optimization** - queries that were fast on small tables become slow as row count increases.
2. **Missing indexes on new query patterns** - new application code queries the table in ways the existing indexes do not cover.
3. **Query plan changes** - the database optimizer picks a different execution plan as data distribution changes.
4. **Lock contention** - increasing write volume causes more lock waits.

The span metrics give you the visibility to catch these issues early, weeks before they become user-facing problems. Combine them with database-specific tools like `EXPLAIN ANALYZE` to diagnose the root cause.

## Wrapping Up

The Span Metrics Connector turns ephemeral trace data into durable time-series metrics, which is exactly what you need for tracking database performance trends. By extracting table names and operation types from spans, you get granular metrics that show which queries are degrading and how fast. This lets you optimize proactively rather than reactively.
