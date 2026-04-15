# How to Set Up ClickHouse with Uptrace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Uptrace, Observability, APM, OpenTelemetry

Description: Learn how to set up Uptrace with ClickHouse as the storage backend for collecting and analyzing OpenTelemetry traces, metrics, and logs.

---

## What Is Uptrace

Uptrace is an open-source APM and distributed tracing tool that uses ClickHouse for storing OpenTelemetry spans, metrics, and logs. It provides a Jaeger-compatible UI with ClickHouse-powered analytics at its core.

## Installing Uptrace

The easiest way to start is with Docker Compose:

```yaml
version: '3.8'
services:
  clickhouse:
    image: clickhouse/clickhouse-server:24.3
    environment:
      CLICKHOUSE_DB: uptrace
    volumes:
      - ch-data:/var/lib/clickhouse
    ports:
      - "8123:8123"
      - "9000:9000"

  uptrace:
    image: uptrace/uptrace:latest
    volumes:
      - ./uptrace.yml:/etc/uptrace/uptrace.yml
    ports:
      - "14317:4317"    # OTLP gRPC
      - "14318:80"      # OTLP HTTP + Uptrace UI
    depends_on:
      - clickhouse

volumes:
  ch-data:
```

## Uptrace Configuration (uptrace.yml)

```yaml
ch:
  addr: clickhouse:9000
  user: default
  password: ""
  database: uptrace

projects:
  - id: 1
    name: My Project
    token: project1_token

listen:
  grpc:
    addr: ':4317'
  http:
    addr: ':80'

logging:
  level: INFO
```

## Sending Traces via OpenTelemetry

```yaml
exporters:
  otlp/uptrace:
    endpoint: http://uptrace:14317
    headers:
      uptrace-dsn: http://project1_token@uptrace:14318/1
    tls:
      insecure: true

service:
  pipelines:
    traces:
      exporters: [otlp/uptrace]
    metrics:
      exporters: [otlp/uptrace]
    logs:
      exporters: [otlp/uptrace]
```

## Key ClickHouse Tables Created by Uptrace

Uptrace auto-creates:

```sql
-- Span index for fast lookups
uptrace.spans_index

-- Span data (full payload)
uptrace.spans_data

-- Log records
uptrace.logs_index

-- Metric data points
uptrace.metrics
```

## Querying Spans Directly in ClickHouse

```sql
SELECT
  span_name,
  service_name,
  avg(duration) / 1e6 AS avg_duration_ms,
  count() AS call_count
FROM uptrace.spans_index
WHERE
  time >= now() - INTERVAL 1 HOUR
  AND status_code = 'error'
GROUP BY span_name, service_name
ORDER BY call_count DESC
LIMIT 20
```

## Retention Tuning

```sql
ALTER TABLE uptrace.spans_index MODIFY TTL toDate(time) + INTERVAL 60 DAY;
ALTER TABLE uptrace.spans_data  MODIFY TTL toDate(time) + INTERVAL 60 DAY;
```

## Summary

Uptrace pairs with ClickHouse to provide a lightweight, self-hosted APM solution using OpenTelemetry. Configure ClickHouse as the DSN in `uptrace.yml`, send traces and metrics via the OTLP exporter, and manage retention using ClickHouse TTL clauses. Uptrace's UI provides trace search and service graphs while ClickHouse powers the underlying analytics.
