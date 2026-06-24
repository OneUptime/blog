# How to Collect Grafana Internal Performance Metrics via OTLP Export

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Grafana, Performance Metrics, OTLP

Description: Configure Grafana to export internal performance metrics like dashboard load time and query duration directly via OTLP to the Collector.

Grafana supports native OpenTelemetry export for traces. For internal metrics, Grafana exposes a Prometheus-compatible `/metrics` endpoint that the OpenTelemetry Collector can scrape with its Prometheus receiver. This approach lets you send Grafana metrics and traces through the Collector while preserving trace data that Prometheus scraping cannot capture.

## Enabling Metrics and OTLP Export in Grafana

Configure metrics and OTLP trace export in `grafana.ini` or through environment variables:

```ini
# /etc/grafana/grafana.ini

[tracing.opentelemetry.otlp]
# OTLP gRPC endpoint

address = otel-collector:4317
# Propagation format
propagation = w3c

[metrics]
enabled = true
```

Or using environment variables:

```bash
GF_TRACING_OPENTELEMETRY_OTLP_ADDRESS=otel-collector:4317
GF_TRACING_OPENTELEMETRY_OTLP_PROPAGATION=w3c
GF_METRICS_ENABLED=true
```

## Docker Compose Setup

```yaml
version: "3.8"

services:
  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_TRACING_OPENTELEMETRY_OTLP_ADDRESS=otel-collector:4317
      - GF_TRACING_OPENTELEMETRY_OTLP_PROPAGATION=w3c
      - GF_METRICS_ENABLED=true
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"

volumes:
  grafana-data:
```

## Collector Configuration

```yaml
# otel-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
  prometheus:
    config:
      scrape_configs:
        - job_name: grafana
          scrape_interval: 30s
          static_configs:
            - targets: ["grafana:3000"]

processors:
  batch:
    timeout: 10s
    send_batch_size: 500

  resource:
    attributes:
      - key: service.type
        value: visualization
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [prometheus]
      processors: [resource, batch]
      exporters: [otlp]
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp]
```

## Key Performance Metrics

### Dashboard and Page Response Time

Grafana tracks HTTP request duration for routes, including dashboard and API routes:

```text
grafana_http_request_duration_seconds_bucket - HTTP request duration histogram
grafana_http_request_duration_seconds_count  - Number of HTTP requests
grafana_http_request_duration_seconds_sum    - Total time spent serving HTTP requests
```

Calculate the P95 response time:
```text
histogram_quantile(0.95, sum by (le, handler) (rate(grafana_http_request_duration_seconds_bucket[5m])))
```

### Query Duration

Data source query performance is critical:

```text
grafana_api_dataproxy_request_all_milliseconds - Summary of data proxy request duration
grafana_proxy_response_status_total             - Data proxy responses by status code
```

Use the data proxy summary to identify slow proxied data source requests:

```text
grafana_api_dataproxy_request_all_milliseconds{quantile="0.95"}
grafana_proxy_response_status_total{code="500"}
```

### API Response Times

```text
grafana_http_request_duration_seconds_bucket - HTTP handler duration
```

Filter by handler to find slow API endpoints:

```text
grafana_http_request_duration_seconds_bucket{handler="/api/dashboards/uid/:uid"}
grafana_http_request_duration_seconds_bucket{handler="/api/ds/query"}
```

## Traces from Grafana

When tracing is enabled, Grafana generates traces for:

- HTTP API endpoint execution
- Data source proxy requests
- Requests that include propagated trace context

A data source proxy trace looks like:

```text
HTTP POST /api/ds/query                  [total: 2.5s]
  HTTP /datasources/proxy/:id/*          [2.3s]
```

This trace shows that the data source proxy request is the bottleneck.

## Analyzing Query Performance

Use traces to identify slow queries at the data source level:

```sql
# Pseudo-query for your tracing backend
# Find the slowest data source queries in the last hour
SELECT
    span.attributes["http.method"] as method,
    span.attributes["http.target"] as target,
    avg(span.duration) as avg_duration,
    p95(span.duration) as p95_duration,
    count(*) as query_count
FROM traces
WHERE span.name LIKE "HTTP %/datasources/proxy/%"
    AND span.start_time > now() - interval '1 hour'
GROUP BY method, target
ORDER BY p95_duration DESC
```

## Setting Up Performance Alerts

```yaml
groups:
  - name: grafana-performance
    rules:
      # Alert when Grafana HTTP responses are slow
      - alert: GrafanaSlowHTTPResponses
        expr: histogram_quantile(0.95, sum by (le) (rate(grafana_http_request_duration_seconds_bucket[5m]))) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Grafana HTTP P95 response time exceeds 10 seconds"

      # Alert when data source proxy requests are slow
      - alert: GrafanaSlowDataProxyRequests
        expr: grafana_api_dataproxy_request_all_milliseconds{quantile="0.95"} > 30000
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "Grafana data proxy P95 exceeds 30 seconds"

      # Alert on high data proxy error rate
      - alert: GrafanaDataProxyErrors
        expr: sum(rate(grafana_proxy_response_status_total{code!="200"}[5m])) > 5
        for: 2m
        labels:
          severity: critical
```

## Correlating Frontend and Backend Performance

When Grafana traces are enabled, each API call includes trace context. If your browser is also instrumented (using Grafana Faro), you get end-to-end traces from the user's browser through Grafana to the data source backend.

## Summary

Grafana's native OTLP export pushes traces directly to the OpenTelemetry Collector, while the Collector's Prometheus receiver scrapes Grafana's internal metrics. This gives you HTTP response times, aggregate data proxy duration, API response status metrics, and traces for Grafana HTTP requests. Use these metrics to set up alerts on Grafana performance, and use traces to drill into the root cause of slow or failing requests.
