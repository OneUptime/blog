# How to Monitor Grafana Itself by Scraping Its Built-In Prometheus Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Grafana, Prometheus, Self-Monitoring

Description: Monitor Grafana's internal health by scraping its built-in Prometheus metrics endpoint using the OpenTelemetry Collector for centralized observability.

Grafana exposes a rich set of Prometheus metrics about its own performance. These metrics cover API response times, rendering, alerting, and data source queries. Scraping them with the OpenTelemetry Collector lets you monitor Grafana itself through a separate pipeline, which is important because if Grafana goes down, you still want metrics flowing to your backend.

## Enabling Grafana Metrics

Grafana exposes metrics at `/metrics` by default. Verify it is accessible:

```bash
curl http://localhost:3000/metrics
```

If metrics are not exposed, enable them in `grafana.ini`:

```ini
# /etc/grafana/grafana.ini

[metrics]
enabled = true
# Optionally require authentication
basic_auth_username = metrics
basic_auth_password = secret
```

## Key Grafana Metrics

Here are the most useful metrics for monitoring Grafana:

```text
# API performance
grafana_http_request_duration_seconds_bucket   - HTTP request duration histogram
grafana_http_request_duration_seconds_count    - Total HTTP requests by status

# Rendering
grafana_rendering_request_duration_milliseconds - Time spent on rendering requests
grafana_rendering_request_total                 - Total rendering requests

# Data source queries
grafana_datasource_request_duration_seconds_bucket - Data source request duration histogram
grafana_datasource_request_total                - Data source requests by code, method, and type

# Alerting
grafana_alerting_rule_evaluations_total         - Alert rule evaluations
grafana_alerting_rule_evaluation_duration_seconds - Alert rule evaluation time
grafana_alerting_active_alerts                  - Currently active alerts

# User sessions
grafana_stat_active_users                       - Active user count
grafana_stat_totals_dashboard                   - Total dashboards
grafana_stat_totals_datasource                  - Total data sources
```

## Collector Configuration

```yaml
# otel-collector-config.yaml
receivers:
  prometheus/grafana:
    config:
      scrape_configs:
        - job_name: "grafana"
          scrape_interval: 15s
          static_configs:
            - targets: ["grafana:3000"]
          metrics_path: /metrics
          # If authentication is required
          basic_auth:
            username: metrics
            password: secret
          # Only keep relevant metrics
          metric_relabel_configs:
            - source_labels: [__name__]
              regex: '(grafana_.*|go_sql_.*)'
              action: keep

processors:
  batch:
    timeout: 10s
    send_batch_size: 200

  resource:
    attributes:
      - key: service.name
        value: grafana
        action: upsert
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
      receivers: [prometheus/grafana]
      processors: [resource, batch]
      exporters: [otlp]
```

## Docker Compose Setup

```yaml
services:
  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_METRICS_ENABLED=true
      - GF_SECURITY_ADMIN_PASSWORD=admin
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"

volumes:
  grafana-data:
```

## Setting Up Alerts for Grafana Health

Monitor Grafana itself with these alert conditions:

```yaml
groups:
- name: grafana-health
  rules:
  # High API latency
  - alert: GrafanaSlowAPI
    expr: histogram_quantile(0.95, sum by (le) (rate(grafana_http_request_duration_seconds_bucket[5m]))) > 5
    for: 5m
    annotations:
      summary: "Grafana API P95 latency exceeds 5 seconds"

  # High error rate
  - alert: GrafanaHighErrorRate
    expr: sum(rate(grafana_http_request_duration_seconds_count{status_code=~"5.."}[5m])) > 1
    for: 2m
    annotations:
      summary: "Grafana returning 5xx errors"

  # Data source query failures
  - alert: GrafanaDatasourceErrors
    expr: sum(rate(grafana_datasource_request_total{code=~"5.."}[5m])) > 0.5
    for: 3m
    annotations:
      summary: "Grafana data source requests returning 5xx responses"

  # Alert evaluation too slow
  - alert: GrafanaSlowAlertEval
    expr: histogram_quantile(0.95, sum by (le) (rate(grafana_alerting_rule_evaluation_duration_seconds_bucket[5m]))) > 30
    for: 5m
    annotations:
      summary: "Grafana alert evaluation taking too long"
```

## Monitoring Multiple Grafana Instances

For high-availability Grafana deployments:

```yaml
receivers:
  prometheus/grafana:
    config:
      scrape_configs:
        - job_name: "grafana"
          scrape_interval: 15s
          static_configs:
            - targets:
                - "grafana-1:3000"
                - "grafana-2:3000"
                - "grafana-3:3000"
              labels:
                cluster: "production"
```

## Grafana Database Metrics

If Grafana uses a PostgreSQL or MySQL backend, monitor the database connection pool:

```text
go_sql_max_open_connections       - Maximum open connections
go_sql_open_connections           - Current open connections
go_sql_in_use_connections         - Connections in use
go_sql_idle_connections           - Idle connections
go_sql_wait_count_total           - Total connection waits
go_sql_wait_duration_seconds_total - Time spent waiting for connections
```

High `go_sql_wait_count_total` indicates the database connection pool is too small.

## Summary

Monitoring Grafana itself is essential for maintaining your observability platform's reliability. The built-in Prometheus metrics endpoint exposes API performance, rendering latency, data source query latency, and alerting health. Scrape these with the OpenTelemetry Collector and export to a separate backend (or the same one, with appropriate alert routing) so you know immediately when Grafana has issues. Focus on API latency, error rates, data source query performance, and alert evaluation duration.
