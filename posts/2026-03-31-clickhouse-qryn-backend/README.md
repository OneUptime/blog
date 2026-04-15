# How to Use ClickHouse as a Backend for qryn

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, qryn, Loki, Prometheus, Observability

Description: Learn how to set up qryn with ClickHouse as the backend to receive Loki-compatible logs, Prometheus metrics, and Tempo traces in a single stack.

---

## What Is qryn

qryn (pronounced "Quinn") is a polyglot observability collector and query server built on ClickHouse. It exposes Loki, Prometheus remote write/read, and Tempo-compatible HTTP APIs, letting you use standard Grafana data sources while storing all data in ClickHouse.

## Architecture

```text
Grafana (Loki, Prometheus, Tempo sources)
         |
         v
       qryn (API compatibility layer)
         |
         v
     ClickHouse
```

## Docker Compose Setup

```yaml
version: '3.8'
services:
  clickhouse:
    image: clickhouse/clickhouse-server:24.3
    environment:
      CLICKHOUSE_DB: cloki
    ports:
      - "8123:8123"
    volumes:
      - ch-data:/var/lib/clickhouse

  qryn:
    image: qxip/qryn:latest
    environment:
      CLICKHOUSE_SERVER: clickhouse
      CLICKHOUSE_PORT: 8123
      CLICKHOUSE_DB: cloki
      CLICKHOUSE_AUTH: "default:"
    ports:
      - "3100:3100"   # Loki-compatible API
    depends_on:
      - clickhouse

volumes:
  ch-data:
```

## Configuring Grafana Data Sources

Add Loki data source pointing at qryn:

```text
Loki URL: http://qryn:3100
```

Add Prometheus data source:

```text
URL: http://qryn:3100
```

## Sending Logs via Promtail

```yaml
clients:
  - url: http://qryn:3100/loki/api/v1/push

scrape_configs:
  - job_name: app-logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: my-app
          __path__: /var/log/app/*.log
```

## Sending Metrics via Prometheus

```yaml
remote_write:
  - url: http://qryn:3100/api/v1/prom/remote/write
```

## Sending Traces via OpenTelemetry

```yaml
exporters:
  otlphttp:
    endpoint: http://qryn:3100
    tls:
      insecure: true
```

## Querying Logs with LogQL in Grafana

Since qryn is Loki-compatible, standard LogQL works:

```text
{job="my-app"} |= "error" | json | line_format "{{.message}}"
```

## ClickHouse Tables Created by qryn

```sql
SHOW TABLES FROM cloki;
-- samples_v3
-- time_series
-- time_series_gin
-- settings
-- ver
```

## Summary

qryn provides a unified Loki/Prometheus/Tempo-compatible API on top of ClickHouse. Set it up with Docker Compose, point Grafana's standard data sources at qryn's endpoints, and send logs via Promtail, metrics via Prometheus remote write, and traces via OTLP. All data lands in ClickHouse tables with automatic schema creation and TTL-based expiry.
