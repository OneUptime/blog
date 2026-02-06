# How to Collect Grafana Internal Performance Metrics (Dashboard Load Time, Query Duration) via OTLP Export

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Grafana, Performance Metrics, OTLP

Description: Configure Grafana to export internal performance metrics like dashboard load time and query duration directly via OTLP to the Collector.

Grafana supports native OpenTelemetry export for its internal metrics and traces. Instead of scraping a Prometheus endpoint, you can configure Grafana to push metrics directly to the OpenTelemetry Collector via OTLP. This approach reduces scrape overhead and gives you access to additional trace data that Prometheus scraping cannot capture.

## Enabling OTLP Export in Grafana

Configure OTLP export in `grafana.ini` or through environment variables:

```ini
# /etc/grafana/grafana.ini

[tracing.opentelemetry.otlp]
# OTLP gRPC endpoint
address = otel-collector:4317
# Propagation format
propagation = w3c

[metrics]
enabled = true

[metrics.otlp]
# Enable OTLP metrics push
enabled = true
address = otel-collector:4317
push_interval = 30s
```

Or using environment variables:

```bash
GF_TRACING_OPENTELEMETRY_OTLP_ADDRESS=otel-collector:4317
GF_TRACING_OPENTELEMETRY_OTLP_PROPAGATION=w3c
GF_METRICS_OTLP_ENABLED=true
GF_METRICS_OTLP_ADDRESS=otel-collector:4317
GF_METRICS_OTLP_PUSH_INTERVAL=30s
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
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp]
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp]
```

## Key Performance Metrics

### Dashboard Load Time

Grafana tracks how long each dashboard takes to load:

```
grafana_dashboard_loading_duration_seconds_bucket - Histogram of dashboard load times
grafana_dashboard_loading_duration_seconds_count  - Number of dashboard loads
grafana_dashboard_loading_duration_seconds_sum    - Total time spent loading dashboards
```

Calculate the P95 dashboard load time:
```
histogram_quantile(0.95, grafana_dashboard_loading_duration_seconds_bucket)
```

### Query Duration

Data source query performance is critical:

```
grafana_datasource_request_duration_seconds_bucket - Query duration histogram
grafana_datasource_request_total                    - Total queries by datasource type
grafana_datasource_response_size_bytes              - Response sizes
```

Break this down by data source type to identify which backends are slow:

```
grafana_datasource_request_duration_seconds_bucket{datasource_type="prometheus"}
grafana_datasource_request_duration_seconds_bucket{datasource_type="elasticsearch"}
grafana_datasource_request_duration_seconds_bucket{datasource_type="loki"}
```

### API Response Times

```
grafana_http_request_duration_seconds_bucket - HTTP handler duration
```

Filter by handler to find slow API endpoints:

```
grafana_http_request_duration_seconds_bucket{handler="/api/dashboards/:uid"}
grafana_http_request_duration_seconds_bucket{handler="/api/ds/query"}
```

## Traces from Grafana

When tracing is enabled, Grafana generates traces for:

- Dashboard rendering (fetching panels, running queries)
- Data source proxy requests
- Alert rule evaluation
- API handler execution

A dashboard load trace looks like:

```
grafana.dashboard.load                    [total: 2.5s]
  grafana.dashboard.fetch                 [50ms]
  grafana.panel.query (panel-1)           [800ms]
    grafana.datasource.proxy.prometheus   [750ms]
  grafana.panel.query (panel-2)           [1.2s]
    grafana.datasource.proxy.elasticsearch [1.1s]
  grafana.panel.query (panel-3)           [300ms]
    grafana.datasource.proxy.prometheus   [250ms]
```

This trace shows that panel-2 with the Elasticsearch data source is the bottleneck.

## Analyzing Query Performance

Use traces to identify slow queries at the data source level:

```python
# Pseudo-query for your tracing backend
# Find the slowest data source queries in the last hour
SELECT
    span.attributes["datasource.type"] as datasource,
    span.attributes["datasource.name"] as name,
    avg(span.duration) as avg_duration,
    p95(span.duration) as p95_duration,
    count(*) as query_count
FROM traces
WHERE span.name LIKE "grafana.datasource.proxy%"
    AND span.start_time > now() - interval '1 hour'
GROUP BY datasource, name
ORDER BY p95_duration DESC
```

## Setting Up Performance Alerts

```yaml
# Alert when dashboard loads are slow
- alert: GrafanaSlowDashboards
  condition: p95(grafana_dashboard_loading_duration_seconds) > 10
  for: 5m
  severity: warning
  message: "Dashboard P95 load time exceeds 10 seconds"

# Alert when data source queries are slow
- alert: GrafanaSlowQueries
  condition: p95(grafana_datasource_request_duration_seconds) > 30
  for: 3m
  severity: warning
  message: "Data source query P95 exceeds 30 seconds"

# Alert on high query error rate
- alert: GrafanaQueryErrors
  condition: rate(grafana_datasource_request_total{status="error"}[5m]) > 5
  for: 2m
  severity: critical
```

## Correlating Frontend and Backend Performance

When Grafana traces are enabled, each API call includes trace context. If your browser is also instrumented (using Grafana Faro), you get end-to-end traces from the user's browser through Grafana to the data source backend.

## Summary

Grafana's native OTLP export pushes metrics and traces directly to the OpenTelemetry Collector. This gives you dashboard load times, query durations, API response times, and detailed traces showing exactly which panels and data sources are slow. Use these metrics to set up alerts on Grafana performance, and use traces to drill into the root cause of slow dashboards or failing queries.
