# Validation Summary: How to Use Uptrends Synthetic Monitoring with OpenTelemetry for Real-Browser

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Uptrends Synthetic Monitoring and Transaction Monitoring
- Uptrends OpenTelemetry export
- OpenTelemetry Collector
- OpenTelemetry Python tracing API
- Grafana Tempo
- Prometheus and PromQL
- Grafana dashboards and alerting

## Sources Consulted
- Uptrends OpenTelemetry export overview: https://www.uptrends.com/support/kb/support-for-opentelemetry/uptrends-opentelemetry-export-overview
- Uptrends OpenTelemetry export prerequisites: https://www.uptrends.com/support/kb/support-for-opentelemetry/uptrends-opentelemetry-export-prerequisites
- Uptrends OpenTelemetry export configuration and setup: https://www.uptrends.com/support/kb/support-for-opentelemetry/uptrends-opentelemetry-export-configuration-and-setup
- Uptrends OpenTelemetry workshop/correlation ID notes: https://www.uptrends.com/support/kb/support-for-opentelemetry/
- Uptrends transaction monitoring overview: https://www.uptrends.com/support/kb/synthetic-monitoring/transactions/transactions-overview
- Uptrends page interactions documentation: https://www.uptrends.com/support/kb/synthetic-monitoring/transactions/page-interactions
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Prometheus client compatibility notes: https://opentelemetry.io/docs/compatibility/prometheus/client-libraries/
- Prometheus metric and label naming: https://prometheus.io/docs/practices/naming/
- Grafana Tempo HTTP API: https://grafana.com/docs/tempo/latest/api_docs/

## Issues Found
- The original post described a custom Uptrends transaction JavaScript API using `navigate`, `waitForElement`, `getElementAttribute`, and `setCustomMetric`. Official Uptrends transaction documentation describes transaction actions in the monitor editor, recorder, and page interaction model rather than that JavaScript API. Replaced the snippet with an action-based transaction outline.
- The original post advised extracting a backend trace ID from a rendered meta tag and storing it as a synthetic custom metric. Uptrends' documented OpenTelemetry flow uses a per-check correlation ID sent in the `X-Correlation-ID` header. Updated the correlation approach and added a small Python example that attaches the correlation ID to the active OpenTelemetry span.
- The original post described an Uptrends webhook/API payload with fields such as `MonitorName`, `ServerName`, `Timings`, and `CustomMetrics`, then converted it manually to OpenTelemetry metrics. Uptrends now documents a first-party OpenTelemetry export for Enterprise accounts. Replaced the webhook bridge with a documented OpenTelemetry Collector receiver/exporter configuration.
- The original PromQL examples queried nonexistent direct histogram series such as `synthetic_page_load_duration_milliseconds`. Prometheus histograms are queried through `_bucket` series with `histogram_quantile`, and OpenTelemetry-to-Prometheus exporters commonly translate dots to underscores and append unit/type suffixes. Updated the dashboard and alert examples accordingly.
- The original pass-rate query averaged duration samples filtered by `check_status="pass"`, which does not calculate availability. Replaced it with a pass-count-over-total-count pattern using a placeholder counter metric.
- The original Tempo lookup endpoint was correct for direct trace-ID lookup, but the surrounding flow assumed the trace ID was available from a metric label. Clarified that when only the Uptrends correlation ID is available, users should search their trace backend by the span attribute and then fetch by trace ID.

## Review Notes
Uptrends' exported metric and attribute names can vary by backend and OpenTelemetry-to-Prometheus translation settings, so the PromQL examples remain templates that users must align with the names exposed in their own Prometheus-compatible backend.
