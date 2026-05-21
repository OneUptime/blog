# Validation Summary: How to Export Istio Metrics to New Relic

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- New Relic
- Prometheus
- Prometheus remote write
- OpenTelemetry Collector
- Kubernetes
- Helm
- NRQL

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio secure metrics scraping: https://istio.io/latest/docs/tasks/observability/metrics/secure-metrics/
- New Relic Prometheus agent installation: https://docs.newrelic.com/docs/infrastructure/prometheus-integrations/install-configure-prometheus-agent/install-prometheus-agent/
- New Relic Prometheus agent setup and chart values: https://docs.newrelic.com/docs/infrastructure/prometheus-integrations/install-configure-prometheus-agent/setup-prometheus-agent/
- New Relic Prometheus agent chart values: https://raw.githubusercontent.com/newrelic/newrelic-prometheus-configurator/main/charts/newrelic-prometheus-agent/values.yaml
- New Relic OTLP endpoint configuration: https://docs.newrelic.com/docs/opentelemetry/best-practices/opentelemetry-otlp/
- New Relic Prometheus remote write integration: https://docs.newrelic.com/docs/infrastructure/prometheus-integrations/install-configure-remote-write/set-your-prometheus-remote-write-integration/
- New Relic Prometheus data querying and histogram functions: https://docs.newrelic.com/docs/infrastructure/prometheus-integrations/view-query-data/view-query-your-prometheus-data/
- New Relic NRQL reference: https://docs.newrelic.com/docs/query-your-data/nrql-new-relic-query-language/get-started/nrql-syntax-clauses-functions/
- OpenTelemetry Collector processors: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector filter processor API docs: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/filterprocessor
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found
- The New Relic Prometheus Agent section used the legacy `newrelic/nri-prometheus` chart and New Relic Helm repository. Updated it to use the current `newrelic-prometheus/newrelic-prometheus-agent` chart and repository documented by New Relic.
- The Prometheus agent description said metrics were forwarded to the New Relic OTLP endpoint. Updated it because the Prometheus agent sends data through Prometheus remote write.
- The Prometheus agent `static_targets` example did not match the current chart values shape. Updated it to use `static_targets.jobs`.
- The Istio sidecar scrape examples did not set `/stats/prometheus` as the scrape path. Added `metrics_path: /stats/prometheus` for direct Envoy scraping.
- The post implied Istio-injected pods may not have `prometheus.io/scrape` annotations by default. Updated the note to distinguish default metrics merging on port `15020` from direct Envoy scraping on port `15090`.
- The OpenTelemetry Collector deployment used two replicas with an unsharded Prometheus receiver configuration, which would duplicate scrapes. Changed the example to one replica.
- The OpenTelemetry Collector `istio-proxy` scrape job did not set `/stats/prometheus`, so it would scrape the wrong path on port `15090`. Added `metrics_path: /stats/prometheus`.
- The NRQL error-rate query used `count()` on a Prometheus counter, which counts samples rather than requests. Changed it to use `sum()`.
- The NRQL P99 latency query used `percentile()` on the histogram basename. Changed it to `bucketPercentile(istio_request_duration_milliseconds_bucket, 99)`, which is the New Relic function for Prometheus histograms.

## Review Notes
The examples are intentionally generic and do not cover EU or FedRAMP New Relic endpoints, Prometheus agent sharding, OTel Collector Target Allocator, or secure mTLS scraping. Those are valid production follow-ups but not required for the corrected baseline guide.
