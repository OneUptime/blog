# Validation Summary: How to Configure Prometheus Exemplars to Link Kubernetes Metrics to Traces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus
- Prometheus exemplars and OpenMetrics exposition
- Kubernetes ConfigMaps and Deployments
- Go Prometheus client library
- Python prometheus_client library
- OpenTelemetry Go and Python tracing
- Grafana Prometheus and Tempo data sources
- Grafana dashboards

## Sources Consulted
- Prometheus feature flags documentation: https://prometheus.io/docs/prometheus/latest/feature_flags/
- Prometheus configuration documentation, `storage.exemplars`: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus exposition formats documentation, exemplars: https://prometheus.io/docs/instrumenting/exposition_formats/
- Prometheus HTTP API documentation, `query_exemplars`: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus Go client documentation, `ExemplarObserver`: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus
- Prometheus Go `promhttp` documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promhttp
- Prometheus Python client exemplars documentation: https://prometheus.github.io/client_python/instrumenting/exemplars/
- OpenTelemetry Go sampling documentation: https://opentelemetry.io/docs/languages/go/sampling/
- OpenTelemetry Go trace package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/trace
- Grafana Prometheus data source configuration documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/
- Grafana exemplars documentation: https://grafana.com/docs/grafana/latest/fundamentals/exemplars/

## Issues Found
- The Prometheus Deployment used `--storage.tsdb.max-exemplars=100000`, which is not the documented Prometheus server flag for configuring exemplar buffer size. Removed the flag and added the documented `storage.exemplars.max_exemplars` configuration block.
- The Go metrics snippet imported unused packages and assigned an unused `ctx` variable, so it would not compile as written. Removed the unused imports and used `trace.SpanFromContext(r.Context())` directly.
- The Go OpenTelemetry snippet used the SDK trace package as `trace`, which conflicts with the API trace package when combined with the earlier snippet, and it omitted the required `context` import. Aliased the SDK package as `sdktrace` and added the missing import.
- The Go OpenTelemetry sampler used `TraceIDRatioBased` directly, which can ignore upstream sampling decisions for non-root spans. Changed it to `ParentBased(TraceIDRatioBased(0.1))`.
- The Prometheus scrape configuration nested a second `scrape_configs` block inside a scrape job, which is invalid Prometheus YAML. Replaced it with a single valid scrape job and clarified that no separate scrape job is required for exemplars.
- The troubleshooting section referenced incorrect Prometheus exemplar metric names. Replaced them with `prometheus_tsdb_exemplar_exemplars_appended_total` and `prometheus_tsdb_exemplar_out_of_order_exemplars_total`.

## Review Notes
The post is technically relevant and salvageable. The remaining examples are intentionally illustrative: the Go HTTP middleware still records a hard-coded `200` status and assumes tracing instrumentation has already placed a span in the request context. A production example should capture real response status codes and wrap handlers with OpenTelemetry HTTP instrumentation.
