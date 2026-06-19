# Validation Summary: How to Migrate from Jaeger/Zipkin to OpenTelemetry

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- Jaeger
- Zipkin
- Node.js OpenTelemetry SDK
- Python OpenTelemetry SDK
- Go OpenTelemetry SDK
- Kubernetes Deployments and Services

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector releases: https://github.com/open-telemetry/opentelemetry-collector-releases/releases
- OpenTelemetry Collector Jaeger exporter migration note: https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- OpenTelemetry Collector Jaeger receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/jaegerreceiver/README.md
- OpenTelemetry Collector Zipkin receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/zipkinreceiver/README.md
- OpenTelemetry Collector debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry HTTP instrumentation README: https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/opentelemetry-instrumentation-http/README.md
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Go OTLP gRPC exporter documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry semantic conventions: https://opentelemetry.io/docs/specs/semconv/

## Issues Found
- The Collector migration config used the removed native `jaeger` exporter. Replaced it with `otlp/jaeger` on port `4317`, matching the OpenTelemetry recommendation that Jaeger receives OTLP directly.
- The Collector migration config used the deprecated and removed `logging` exporter. Replaced it with the current `debug` exporter and kept the same verbosity and sampling settings.
- The Collector migration config tried to infer receiver source from `jaeger.version` and `zipkin.version` span attributes, which are not reliable receiver markers. Replaced the transform processor with separate receiver pipelines and per-source resource processors.
- The Collector image was pinned to `otel/opentelemetry-collector-contrib:0.92.0`. Updated it to `0.154.0`, the current release checked during review.
- The Node.js OpenTelemetry example used older APIs: `new Resource(...)`, `SemanticResourceAttributes`, and `provider.addSpanProcessor(...)`. Updated it to current `resourceFromAttributes`, `ATTR_SERVICE_NAME` / `ATTR_SERVICE_VERSION`, and constructor `spanProcessors`.
- The Node.js HTTP instrumentation example used `ignoreIncomingPaths`, which is not the current documented option. Replaced it with `ignoreIncomingRequestHook`.
- The OpenTelemetry examples used the old `http.method` attribute for newly-created OTel spans. Updated current OTel examples and validation checks to use `http.request.method`.
- The Go example imported `go.opentelemetry.io/otel/trace` without using it, which made the snippet fail compilation. Removed that import.
- The Go example manually created a gRPC connection for the OTLP exporter. Updated it to the documented `otlptracegrpc.WithEndpoint` and `otlptracegrpc.WithInsecure` options.
- The validation script required `service.name` and `http.status_code` as span attributes even though `service.name` is normally a resource attribute and the sample manual spans do not set an HTTP status-code attribute. Narrowed the sample validation to the attribute the examples set.

## Review Notes
The corrected Collector configuration was validated with `otel/opentelemetry-collector-contrib:0.154.0 validate`. The Node.js example was checked with current npm packages. The Python snippets were syntax-checked. The Go example was compiled with current OpenTelemetry Go modules in a Go 1.25 container because the local host does not have Go installed.
