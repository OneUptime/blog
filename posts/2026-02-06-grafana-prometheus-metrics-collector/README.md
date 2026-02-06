# How to Monitor Grafana Itself by Scraping Its Built-In Prometheus Metrics Endpoint with the Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Grafana, Prometheus, Self-Monitoring

Description: Monitor Grafana's internal health by scraping its built-in Prometheus metrics endpoint using the OpenTelemetry Collector for centralized observability.

Grafana exposes a rich set of Prometheus metrics about its own performance. These metrics cover API response times, dashboard rendering, alerting, and data source queries. Scraping them with the OpenTelemetry Collector lets you monitor Grafana itself through a separate pipeline, which is important because if Grafana goes down, you still want metrics flowing to your backend.

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

```
# API performance
grafana_http_request_duration_seconds_bucket   - HTTP request duration histogram
grafana_http_request_total                      - Total HTTP requests by status

# Dashboard rendering
grafana_dashboard_loading_duration_seconds      - Time to load dashboards
grafana_dashboard_request_total                 - Dashboard load requests

# Data source queries
grafana_datasource_request_duration_seconds     - Data source query duration
grafana_datasource_request_total                - Data source queries by type

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
              regex: 'grafana_.*'
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
version: "3.8"

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
      - ./otel-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"

volumes:
  grafana-data:
```

## Setting Up Alerts for Grafana Health

Monitor Grafana itself with these alert conditions:

```yaml
# High API latency
- alert: GrafanaSlowAPI
  condition: histogram_quantile(0.95, grafana_http_request_duration_seconds_bucket) > 5
  for: 5m
  message: "Grafana API P95 latency exceeds 5 seconds"

# High error rate
- alert: GrafanaHighErrorRate
  condition: rate(grafana_http_request_total{status_code=~"5.."}[5m]) > 1
  for: 2m
  message: "Grafana returning 5xx errors"

# Data source query failures
- alert: GrafanaDatasourceErrors
  condition: rate(grafana_datasource_request_total{status="error"}[5m]) > 0.5
  for: 3m
  message: "Grafana data source queries failing"

# Alert evaluation too slow
- alert: GrafanaSlowAlertEval
  condition: grafana_alerting_rule_evaluation_duration_seconds > 30
  for: 5m
  message: "Grafana alert evaluation taking too long"
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

```
grafana_database_conn_max_open            - Maximum open connections
grafana_database_conn_open                - Current open connections
grafana_database_conn_in_use              - Connections in use
grafana_database_conn_idle                - Idle connections
grafana_database_conn_wait_count_total    - Total connection waits
grafana_database_conn_wait_duration_total - Time spent waiting for connections
```

High `conn_wait_count_total` indicates the database connection pool is too small.

## Summary

Monitoring Grafana itself is essential for maintaining your observability platform's reliability. The built-in Prometheus metrics endpoint exposes API performance, dashboard loading times, data source query latency, and alerting health. Scrape these with the OpenTelemetry Collector and export to a separate backend (or the same one, with appropriate alert routing) so you know immediately when Grafana has issues. Focus on API latency, error rates, data source query performance, and alert evaluation duration.
