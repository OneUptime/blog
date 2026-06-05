# Validation Summary: How to Send OpenTelemetry Traces and Logs to Axiom via the OTLP HTTP Exporter

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Protocol (OTLP) over HTTP
- Axiom OTLP ingestion
- Python OpenTelemetry SDK and OTLP HTTP exporters
- Go OpenTelemetry SDK and OTLP HTTP trace exporter
- Node.js OpenTelemetry SDK and OTLP HTTP trace exporter
- Axiom Processing Language (APL)

## Sources Consulted
- Axiom: Send OpenTelemetry data to Axiom, https://axiom.co/docs/send-data/opentelemetry
- Axiom: Explore traces, https://axiom.co/docs/query-data/traces
- Axiom: APL sort operator, https://axiom.co/docs/apl/tabular-operators/sort-operator
- OpenTelemetry: OTLP exporter configuration, https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry: OTLP exporter SDK configuration, https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry Python OTLP exporter API, https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry Go otlptracehttp package documentation, https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp
- OpenTelemetry JavaScript SDK Node documentation, https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry JavaScript OTLP protobuf trace exporter documentation, https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-trace-otlp-proto.html
- OpenTelemetry JavaScript Resource API, https://open-telemetry.github.io/opentelemetry-js/functions/_opentelemetry_resources.resourceFromAttributes.html

## Issues Found
- The introduction claimed dataset routing could be done with the `X-Axiom-Dataset` header or URL path. Axiom's current OTLP documentation describes dataset selection through headers, with `X-Axiom-Dataset` for logs and traces and `X-Axiom-Metrics-Dataset` for metrics. Updated the wording accordingly.
- The endpoints list incorrectly described `https://api.axiom.co/v1/traces` as a general endpoint accepting all signals. Replaced this with the documented metrics endpoint, `https://api.axiom.co/v1/metrics`.
- The Python logging setup added an INFO-level handler but did not lower the root logger level from its default WARNING threshold. Added `logging.getLogger().setLevel(logging.INFO)` so the later INFO log examples are emitted.
- The Go example imported `log` without using it, which would fail compilation. Removed the unused import.
- The Node.js example used `new Resource(...)` and `provider.addSpanProcessor(...)`, which are not current OpenTelemetry JS APIs. It also used the HTTP/JSON OTLP exporter package. Updated the snippet to use `resourceFromAttributes(...)`, `NodeSDK` with the `spanProcessors` option, and the HTTP/protobuf OTLP trace exporter package.

## Review Notes
- The Python OpenTelemetry logs APIs still use the `_logs` namespace in the current SDK documentation.
- Axiom's metrics endpoint supports OTLP HTTP protobuf only; the post focuses on traces and logs, so no metrics exporter example was added.
