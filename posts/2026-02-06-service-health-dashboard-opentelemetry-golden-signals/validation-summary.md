# Validation Summary: Build a Service Health Overview Dashboard from OpenTelemetry Golden Signals

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry semantic conventions
- OpenTelemetry Go SDK and contrib instrumentation
- OpenTelemetry Collector Prometheus exporter
- Prometheus and PromQL
- Grafana dashboards and data links
- Grafana Tempo
- Go runtime metrics
- JVM and host metrics

## Sources Consulted
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry HTTP semantic convention migration notes: https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/
- OpenTelemetry Go `otelhttp` package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp
- OpenTelemetry Go runtime instrumentation documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/runtime
- OpenTelemetry Go runtime metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/runtime/go-metrics/
- OpenTelemetry JVM metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/runtime/jvm-metrics/
- OpenTelemetry resource documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry deployment attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Collector Prometheus exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/README.md
- Prometheus guide for using Prometheus as an OpenTelemetry backend: https://prometheus.io/docs/guides/opentelemetry/
- Grafana Tempo query editor documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/query-editor/
- Google SRE book Golden Signals chapter: https://sre.google/sre-book/monitoring-distributed-systems/

## Issues Found
- The Go example used `go.opentelemetry.io/otel/semconv/v1.24.0` and `semconv.DeploymentEnvironment`, which maps to the deprecated `deployment.environment` attribute. Updated the example to `semconv/v1.31.0` and `semconv.DeploymentEnvironmentName("production")` so it uses the current `deployment.environment.name` semantic convention.
- The Go example said services need runtime metrics but did not start the Go runtime instrumentation. Added `go.opentelemetry.io/contrib/instrumentation/runtime` and `otelruntime.Start(...)` so metrics such as `go.goroutine.count` are actually emitted.
- Several PromQL examples used old HTTP semantic convention labels (`http_status_code`, `http_method`) while querying the newer `http.server.request.duration` metric. Updated them to Prometheus-normalized current labels (`http_response_status_code`, `http_request_method`).
- The Go saturation query used deprecated runtime metric naming (`process_runtime_go_goroutines`). Updated it to the current Go runtime metric name after Prometheus normalization: `go_goroutine_count`.
- The dashboard variables used the deprecated `deployment_environment` label. Updated them to `deployment_environment_name`.
- The PromQL grouped directly by `service_name` and filtered by deployment environment without explaining that these are resource attributes. Added a note that the examples assume resource attributes are promoted to metric labels; otherwise the Collector exposes them through `target_info` and queries need a join or transform.
- The top-endpoints query assumed `http_route` is always present. Added a caveat that `http.route` requires instrumentation capable of setting a low-cardinality route template.

## Review Notes
The Prometheus metric names in the examples assume the common OpenTelemetry Prometheus translation strategy that escapes dots to underscores and appends unit/type suffixes. Grafana Explore data-link URL shapes can vary by Grafana version and datasource UID configuration; the example is plausible as dashboard JSON guidance, but production dashboards should verify the generated Explore URL in the target Grafana version.
