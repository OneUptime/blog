# Validation Summary: How to Collect Grafana Internal Performance Metrics via OTLP Export

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana
- OpenTelemetry Collector
- OTLP
- Prometheus metrics and PromQL
- Docker Compose

## Sources Consulted
- Grafana documentation: Set up Grafana monitoring - https://grafana.com/docs/grafana/latest/setup-grafana/set-up-grafana-monitoring/
- Grafana documentation: Configure Grafana, `[metrics]`, `[metrics.graphite]`, and `[tracing.opentelemetry.otlp]` - https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Grafana source: default configuration - https://github.com/grafana/grafana/blob/main/conf/defaults.ini
- Grafana source: internal metric definitions - https://github.com/grafana/grafana/blob/main/pkg/infra/metrics/metrics.go
- Grafana source: HTTP request metrics middleware - https://github.com/grafana/grafana/blob/main/pkg/middleware/request_metrics.go
- Grafana source: request tracing middleware - https://github.com/grafana/grafana/blob/main/pkg/middleware/request_tracing.go
- Grafana source: API route registration - https://github.com/grafana/grafana/blob/main/pkg/api/api.go
- OpenTelemetry Collector OTLP receiver documentation - https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector Prometheus receiver documentation - https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- Prometheus alerting rules documentation - https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- The original post claimed Grafana can push internal metrics directly via OTLP using a `[metrics.otlp]` section and `GF_METRICS_OTLP_*` variables. Current Grafana documentation and default configuration do not expose a `[metrics.otlp]` configuration section. I changed the post to use Grafana's Prometheus-compatible `/metrics` endpoint with the OpenTelemetry Collector Prometheus receiver, while keeping OTLP for traces.
- The Docker Compose and Collector examples only configured OTLP trace intake and omitted metric scraping. I updated the Collector configuration to include a `prometheus` receiver scraping `grafana:3000` and changed the metrics pipeline to use that receiver.
- Several metric names were not Grafana internal metrics, including `grafana_dashboard_loading_duration_seconds_*`, `grafana_datasource_request_duration_seconds_bucket`, `grafana_datasource_request_total`, and `grafana_datasource_response_size_bytes`. I replaced them with Grafana metrics present in the current source, including `grafana_http_request_duration_seconds_*`, `grafana_api_dataproxy_request_all_milliseconds`, and `grafana_proxy_response_status_total`.
- The PromQL P95 example used `histogram_quantile` directly on bucket series without `rate()` and `sum by (le, ...)`. I corrected it to use the standard Prometheus histogram query shape.
- The trace examples used invented span names such as `grafana.dashboard.load` and `grafana.datasource.proxy.prometheus`. Grafana documentation and tracing middleware describe HTTP endpoint spans and propagated data source proxy requests, so I replaced the example with HTTP/data source proxy span names.
- The alert YAML used non-Prometheus fields such as `condition`, `severity`, and `message` at the rule level. I changed it to valid Prometheus alerting rule structure with `groups`, `rules`, `expr`, `labels`, and `annotations`.
- The pseudo-query was labeled as Python despite being SQL-like. I changed the code fence language to `sql`.

## Review Notes
Grafana exposes native histograms for HTTP request metrics and, by default, also exposes classic histogram buckets for compatibility. The PromQL examples rely on the classic `_bucket` series being enabled, which is the documented default.
