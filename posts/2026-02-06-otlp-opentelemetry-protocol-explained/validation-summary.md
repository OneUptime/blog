# Validation Summary: How to Understand OTLP (OpenTelemetry Protocol) and Why It Matters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry SDKs
- OpenTelemetry Collector
- OTLP/gRPC
- OTLP/HTTP
- Protocol Buffers
- JavaScript/TypeScript
- Python
- Go
- curl
- tcpdump
- Jaeger, Zipkin, Prometheus Remote Write, Loki, Tempo, OneUptime

## Sources Consulted
- OpenTelemetry OTLP Specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry OTLP Exporter Specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry SDK OTLP Exporter Configuration: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry JavaScript resources API: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry JavaScript semantic conventions deprecations: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_semantic-conventions.html
- OpenTelemetry JavaScript NodeSDK API: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-node.NodeSDK.html
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Go OTLP trace HTTP exporter documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp
- OpenTelemetry Go OTLP metric HTTP exporter documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- Jaeger API documentation: https://www.jaegertracing.io/docs/2.3/apis/
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The OTLP/gRPC section implied bidirectional streaming as an OTLP advantage. OTLP export is request/response, so the wording was corrected to focus on HTTP/2 flow control, multiplexing, and gRPC ecosystem support.
- The retry/backpressure wording was too specific and implied fixed retry delays. It was corrected to describe bounded buffering and exponential backoff with jitter more generally.
- The shared endpoint behavior was imprecise. The post now clarifies that automatic `/v1/traces`, `/v1/metrics`, and `/v1/logs` path appending applies to shared OTLP/HTTP endpoints, while signal-specific endpoints are used as-is.
- The Node.js example used deprecated JavaScript semantic convention APIs and the old resource construction style. It now uses `resourceFromAttributes`, `ATTR_SERVICE_NAME`, and `metricReaders`.
- The Python example used `os.environ` without importing `os` and hardcoded the service-name string. It now imports `os` and uses the official `SERVICE_NAME` constant.
- The Go example used an older semantic convention import and split host/path configuration unnecessarily. It now uses `semconv/v1.37.0` and full `WithEndpointURL` values for trace and metric exporters.
- The redaction example attempted to mutate span attributes from a span processor callback, which is not a reliable/current SDK pattern. It was replaced with an OpenTelemetry Collector attributes processor example.
- The OTLP maturity sentence included outdated/specific timing. It now states the current stable status for traces, metrics, and logs.

## Review Notes
- The post is technically valid after the fixes. Some vendor support details are necessarily time-sensitive; future reviews should re-check backend support lists and SDK API examples against current official docs.
