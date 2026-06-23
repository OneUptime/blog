# Validation Summary: Migrating from Jaeger to OpenTelemetry

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry SDKs for Go, Java, Node.js, and Python
- Jaeger client libraries and Jaeger backend
- OpenTracing compatibility bridges
- OTLP, Jaeger receiver protocols, and trace propagation
- Kubernetes collector configuration

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Jaeger receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/jaegerreceiver/README.md
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry migration documentation for Jaeger and OpenTracing: https://opentelemetry.io/docs/compatibility/migration/
- OpenTelemetry migration from OpenTracing documentation: https://opentelemetry.io/docs/compatibility/migration/opentracing/
- OpenTelemetry blog on migrating away from the Jaeger Collector exporter: https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- Jaeger SDK migration documentation: https://www.jaegertracing.io/sdk-migration/
- Jaeger API documentation for OTLP support: https://www.jaegertracing.io/docs/1.76/architecture/apis/
- OpenTelemetry Go OTLP trace gRPC exporter documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry Go OpenTracing bridge documentation: https://pkg.go.dev/go.opentelemetry.io/otel/bridge/opentracing
- OpenTelemetry Java SDK documentation: https://opentelemetry.io/docs/languages/java/sdk/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript 2.x upgrade notes: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- Removed an invalid Collector transform that attempted to derive span names from an `operation.name` attribute. Jaeger receiver conversion already maps Jaeger operation names to span names; `operation.name` is not a standard span attribute to depend on.
- Removed the trace ID rewrite example using `set(trace_id, Concat(...))`. Trace IDs are identifying fields, not normal string attributes for OTTL mutation; compatibility should be handled through receiver conversion and propagator configuration.
- Updated Node.js OpenTelemetry setup for current 2.x packages: replaced `new Resource(...)` with `resourceFromAttributes(...)`, replaced deprecated semantic convention exports with `ATTR_*` constants, and configured span processors through `spanProcessors` instead of the removed `addSpanProcessor()` method.
- Updated the Node.js OTLP gRPC exporter endpoint from `grpc://otel-collector:4317` to `http://otel-collector:4317`, matching current exporter URL handling.
- Updated Java semantic convention usage from the old `ResourceAttributes` class to current `ServiceAttributes`, and added the missing `Attributes` import.
- Updated Python resource attributes to use the stable string key `service.name` and set `insecure=True` for the non-TLS local Collector gRPC endpoint.
- Fixed the Go OpenTracing bridge snippet so it calls `initOTelTracer(context.Background())`, handles the returned error, and does not leave `wrapperProvider` unused.
- Fixed the Go integration test snippet so it handles `initJaegerTracer()` and `initOTelTracer()` return values correctly.
- Updated validation metrics to use receiver refused span and exporter send failure counters rather than a non-portable `otelcol_processor_dropped_spans` check.

## Review Notes
The examples are still intentionally illustrative and omit surrounding imports, dependency declarations, and helper implementations. Jaeger accepts OTLP trace data, but not metrics or logs; any Jaeger OTLP exporter pipeline should remain traces-only.
