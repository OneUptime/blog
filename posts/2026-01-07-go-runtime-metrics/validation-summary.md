# Validation Summary: How to Monitor Go Runtime Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go runtime package
- Go runtime/debug package
- Prometheus Go client library
- Prometheus alerting and PromQL
- OpenTelemetry Go SDK
- OpenTelemetry Go runtime instrumentation
- Grafana dashboard JSON

## Sources Consulted
- Go runtime package documentation: https://pkg.go.dev/runtime
- Go runtime/debug package documentation: https://pkg.go.dev/runtime/debug
- Prometheus Go client prometheus package documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus
- Prometheus Go client collectors package documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/collectors
- Prometheus Go client promhttp package documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promhttp
- OpenTelemetry Go Prometheus exporter documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/prometheus
- OpenTelemetry Go runtime instrumentation documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/runtime
- OpenTelemetry Go exporters documentation: https://opentelemetry.io/docs/languages/go/exporters/

## Issues Found
- The Prometheus examples used deprecated `prometheus.NewGoCollector()` and `prometheus.NewProcessCollector()` constructors. Updated the examples to import `github.com/prometheus/client_golang/prometheus/collectors` and use `collectors.NewGoCollector()` and `collectors.NewProcessCollector()`.
- The post described `go_gc_duration_seconds` as a histogram. The default Go collector exposes it as a summary with quantile series, so the wording was corrected.
- The alerting and dashboard examples used `go_gc_duration_seconds{quantile="0.99"}`, but the default collector exposes quantiles `0`, `0.25`, `0.5`, `0.75`, and `1`. Updated those examples to use `quantile="1"` and label it as max.
- The rapid goroutine growth examples used `rate(go_goroutines[5m])`, but `go_goroutines` is a gauge. Updated those examples to use `deriv(go_goroutines[5m])`.
- The OpenTelemetry Prometheus examples attempted to serve the exporter directly with `http.Handle("/metrics", exporter)`. The exporter is a metric reader/collector, not an `http.Handler`; it registers with a Prometheus registry. Updated the examples to serve `promhttp.Handler()`.
- The OpenTelemetry runtime metrics list showed deprecated `runtime.go.*` names as defaults. Updated it to the current default `go.*` runtime metrics and noted that deprecated `runtime.go.*` metrics require `OTEL_GO_X_DEPRECATED_RUNTIME_METRICS=true`.

## Review Notes
Go was not installed in the local environment, so snippets could not be compiled here. API usage and metric names were validated against official package documentation and corrected where documentation showed current behavior.
