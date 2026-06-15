# Validation Summary: How to Implement Exemplars in Prometheus

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Prometheus exemplar storage and HTTP API
- Prometheus OpenMetrics exposition format
- Prometheus Python client
- Prometheus Go client
- prom-client for Node.js
- OpenTelemetry tracing for Python, Go, and Node.js
- Grafana Prometheus and Tempo data sources
- Grafana Tempo
- Docker Compose

## Sources Consulted
- Prometheus feature flags documentation: https://prometheus.io/docs/prometheus/latest/feature_flags/
- Prometheus HTTP API documentation for querying exemplars: https://prometheus.io/docs/prometheus/latest/querying/api/#querying-exemplars
- Prometheus Python client exemplar documentation: https://prometheus.github.io/client_python/instrumenting/exemplars/
- Prometheus Go client API documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus
- prom-client exemplar documentation: https://github.com/siimon/prom-client#exemplars
- OpenTelemetry JavaScript Node.js documentation: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry Go OTLP gRPC exporter documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry Go semantic convention API documentation: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.17.0
- Grafana Prometheus data source provisioning documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/
- Grafana Tempo configuration documentation: https://grafana.com/docs/tempo/latest/configuration/

## Issues Found
- Prometheus setup implied that the `storage.exemplars` YAML block alone enables exemplar storage. Updated the wording to make clear that the YAML config controls storage size and Prometheus must still be started with `--enable-feature=exemplar-storage`.
- Prerequisites said exemplars require native or classic histogram metrics. Updated this to state that exemplars apply to counter or histogram metrics exposed in OpenMetrics format.
- The Python example used `REGISTRY` without importing it and included unused exposition imports. Imported `REGISTRY` directly and removed unused imports.
- The Python OTLP gRPC exporter endpoint used `tempo:4317` without a URL scheme. Updated it to `http://tempo:4317`, matching OpenTelemetry endpoint URL guidance for OTLP/gRPC configuration.
- The Python exemplar helper returned an empty dict when no recording span existed, which could produce a label-less exemplar instead of omitting the exemplar. Updated it to return `None`.
- The Go example imported `fmt` but did not use it, which would prevent compilation. Removed the unused import.
- The Go example used `semconv.ServiceName("my-service")`, which is not available in the referenced semconv package. Replaced it with `semconv.ServiceNameKey.String("my-service")`.
- The Node.js example used older OpenTelemetry setup APIs and a deprecated-style resource pattern. Updated it to use `NodeSDK`, `resourceFromAttributes`, and `ATTR_SERVICE_NAME`.
- The Node.js OTLP gRPC exporter used `grpc://tempo:4317`; updated it to `http://tempo:4317`.
- The Node.js `prom-client` histogram exemplar call used the old normal `observe(labels, value, exemplar)` shape. Updated it to the current exemplar-enabled object form: `{ labels, value, exemplarLabels }`.
- The PromQL section said exemplars are attached automatically to a histogram quantile query. Reworded this to say Grafana can request exemplars for matching series, because PromQL query results do not embed exemplars directly.

## Review Notes
The examples are now aligned with current official documentation. Full end-to-end execution was not performed because it requires running Prometheus, Tempo, Grafana, and instrumented application containers together.
