# Validation Summary: How to Trace gRPC Calls Across Microservices with Jaeger

## Status
validated

## Post Type
Tutorial / Guide — step-by-step instructions for deploying Jaeger and instrumenting gRPC microservices with OpenTelemetry in Go on Kubernetes.

## Technologies Covered
- Jaeger (all-in-one, collector, query, agent — v1.50)
- OpenTelemetry Go SDK (sdk/trace, OTLP gRPC exporter, propagation, resource, semconv v1.21.0)
- gRPC (Go: `grpc.NewClient`, stats handlers via `otelgrpc`)
- W3C Trace Context propagation (`traceparent`)
- Kubernetes (Deployments, DaemonSet, Service, OTEL env-var configuration, Jaeger Operator sidecar injection annotation)
- Prometheus alerting (PromQL)
- Elasticsearch / Cassandra (storage backends)

## Sources Consulted
- OpenTelemetry Go SDK trace package (samplers: `AlwaysSample`, `NeverSample`, `ParentBased`, `TraceIDRatioBased`; `WithBatcher`, batch options) — https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- OTLP trace gRPC exporter (`otlptracegrpc.New`, `WithEndpoint`, `WithInsecure`, `WithRetry`/`RetryConfig`) — https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry gRPC instrumentation (`otelgrpc.NewClientHandler`, `otelgrpc.NewServerHandler`) — https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc
- gRPC-Go `grpc.NewClient` and `credentials/insecure` — https://pkg.go.dev/google.golang.org/grpc and https://pkg.go.dev/google.golang.org/grpc/credentials/insecure
- semconv v1.21.0 (`ServiceName`, `ServiceVersion`, `DeploymentEnvironment`) — https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.21.0
- Jaeger deployment & port reference (4317/4318 OTLP, 14250 collector gRPC, 16686 query UI, agent ports) — https://www.jaegertracing.io/docs/1.50/
- OpenTelemetry SDK environment variables (`OTEL_TRACES_SAMPLER=parentbased_traceidratio`, `OTEL_EXPORTER_OTLP_ENDPOINT`, etc.) — https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/

## Issues Found
- **Missing import in the gRPC server example (`main` package).** The `main` function calls `insecure.NewCredentials()` for both client connections, but the import block did not include `google.golang.org/grpc/credentials/insecure`. As written the code would fail to compile (`undefined: insecure`). Fixed by adding `"google.golang.org/grpc/credentials/insecure"` to the import list. This matches the package already referenced and is consistent with the current gRPC-Go API.

## Review Notes
- All OpenTelemetry/gRPC APIs used are current and non-deprecated: `grpc.NewClient` (the replacement for `grpc.Dial`), the stats-handler-based `otelgrpc.NewClientHandler`/`NewServerHandler` (the replacement for the deprecated interceptor approach), and the OTLP gRPC exporter targeting Jaeger's native OTLP port 4317 (`COLLECTOR_OTLP_ENABLED=true`). These are correct for the Jaeger 1.50 era and remain valid.
- The Prometheus alerting rules use illustrative metric names (`jaeger_spans_total`, `jaeger_span_duration_seconds_bucket`). These are not metrics Jaeger emits out of the box — RED/latency metrics for services typically come from the OpenTelemetry spanmetrics connector / Jaeger SPM (e.g. `calls_total`, `latency_bucket`) and Jaeger's own collector metrics use names like `jaeger_collector_spans_received_total`. The section is explicitly framed as an example ("using Prometheus with Jaeger metrics"), so it is conceptually fine, but readers should adapt the metric names to whatever their pipeline actually exposes. Left as-is since it is presented as illustrative rather than a copy-paste config.
- Version caveat: `jaegertracing/jaeger-agent` and the legacy thrift/UDP ports (5775/6831/6832) are correct for v1.50 but the agent component was deprecated and removed in later Jaeger releases (notably Jaeger v2). The OTLP-based path (port 4317) shown elsewhere in the post is the forward-compatible approach, so the post's main instrumentation guidance ages well even though the standalone agent DaemonSet does not.
- `semconv.DeploymentEnvironment` is correct for v1.21.0; note that in much newer semconv versions this attribute was renamed to `deployment.environment.name`, but that is outside the version pinned here.
