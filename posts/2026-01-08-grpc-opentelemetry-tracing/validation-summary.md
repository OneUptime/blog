# Validation Summary: How to Add Distributed Tracing to gRPC with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- gRPC (Go `google.golang.org/grpc`, Node.js `@grpc/grpc-js`)
- OpenTelemetry Go SDK (`go.opentelemetry.io/otel`, `sdk/trace`, OTLP exporter, `otelgrpc` contrib instrumentation)
- OpenTelemetry JS / Node SDK (`@opentelemetry/sdk-node`, auto-instrumentations, OTLP gRPC exporter)
- OpenTelemetry Collector (receivers, processors, exporters)
- Distributed tracing concepts (traces, spans, context propagation, sampling)
- Kubernetes deployment + OTel environment variables

## Sources Consulted
- OpenTelemetry Go exporters docs — https://opentelemetry.io/docs/languages/go/exporters/
- "Migrating away from the Jaeger exporter in the Collector" — https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- opentelemetry-go issue #4405 "Remove Jaeger exporter" — https://github.com/open-telemetry/opentelemetry-go/issues/4405
- opentelemetry-collector issue #11337 "logging exporter has been replaced with debug exporter" — https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- "Bye bye logging exporter, hello debug exporter!" — https://words.boten.ca/byebye-logging-exporter/
- OpenTelemetry JS Resources docs — https://opentelemetry.io/docs/languages/js/resources/
- `@opentelemetry/resources` package docs — https://www.npmjs.com/package/@opentelemetry/resources
- `otelgrpc` contrib instrumentation (StatsHandler API) — go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc

## Issues Found
1. **Removed Jaeger exporter (Go).** The post used `go.opentelemetry.io/otel/exporters/jaeger` with `jaeger.New(jaeger.WithCollectorEndpoint(...))`. This dedicated exporter was deprecated in OpenTelemetry Go v1.17.0 and removed in v1.18.0 (July 2023). **Fix:** Replaced the section ("Jaeger Exporter") with "Jaeger (via OTLP)", explaining that Jaeger natively accepts OTLP and showing the OTLP gRPC exporter pointed at Jaeger's `:4317` endpoint — the officially recommended migration path.

2. **Deprecated/removed Node.js Resource API.** The post used `new Resource({ [SemanticResourceAttributes.SERVICE_NAME]: ... })`. The `Resource` constructor and `SemanticResourceAttributes` were removed/deprecated in the OpenTelemetry JS 2.0 line; `new Resource()` no longer works. **Fix:** Switched to `resourceFromAttributes({ [ATTR_SERVICE_NAME]: ..., [ATTR_SERVICE_VERSION]: ... })` and imported `ATTR_SERVICE_NAME` / `ATTR_SERVICE_VERSION` from `@opentelemetry/semantic-conventions`.

3. **Removed Collector `logging` exporter.** The collector config defined a `logging:` exporter with `loglevel: debug` and referenced it in the traces pipeline. The `logging` exporter was deprecated in Collector v0.86.0 and removed in v0.111.0, replaced by the `debug` exporter (which uses `verbosity`, not `loglevel`). **Fix:** Changed `logging:`/`loglevel: debug` to `debug:`/`verbosity: detailed` and updated the pipeline's `exporters` list from `[otlp, logging]` to `[otlp, debug]`.

## Review Notes
- The Go gRPC instrumentation correctly uses the current `StatsHandler`-based API (`otelgrpc.NewServerHandler` / `otelgrpc.NewClientHandler`) rather than the deprecated unary/stream interceptors, and uses `grpc.NewClient` instead of the deprecated `grpc.Dial`. Good and current.
- The server-side `GetUser` snippet references `trace.SpanFromContext`, `attribute`, and `codes` (OTel `go.opentelemetry.io/otel/codes`) without showing those imports. This is an illustrative excerpt; functionally correct but readers must add the imports. Left as-is to avoid restructuring.
- `semconv v1.21.0` is pinned and valid; newer semconv versions exist but the pinned import remains functional.
- OTLP exporter options (`WithHeaders`, `WithCompressor`, `WithRetry`/`RetryConfig`), sampler helpers (`TraceIDRatioBased`, `ParentBased` with local/remote parent options), and the K8s `OTEL_*` env vars are all accurate and current.
- The collector `memory_limiter`/`batch`/`attributes` processor fields are correct.
