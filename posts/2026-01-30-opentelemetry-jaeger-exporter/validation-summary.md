# Validation Summary: How to Implement OpenTelemetry Jaeger Exporter

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry tracing
- Jaeger
- OTLP/gRPC and OTLP/HTTP
- Node.js OpenTelemetry SDK
- Python OpenTelemetry SDK
- Go OpenTelemetry SDK
- OpenTelemetry Collector
- Docker Compose
- Kubernetes Jaeger Operator
- Head-based and tail-based sampling

## Sources Consulted
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript SDK package/type definitions installed from npm (`@opentelemetry/sdk-node` 0.218.0, `@opentelemetry/resources` 2.7.1, `@opentelemetry/semantic-conventions` 1.41.1)
- OpenTelemetry Python package metadata from PyPI for `opentelemetry-exporter-jaeger` and `opentelemetry-exporter-otlp`
- PyPI `opentelemetry-exporter-jaeger` deprecation warning: https://pypi.org/project/opentelemetry-exporter-jaeger/
- OpenTelemetry Go Jaeger exporter package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/jaeger
- Jaeger SDK migration guidance: https://www.jaegertracing.io/sdk-migration/
- OpenTelemetry Collector Jaeger exporter migration guidance: https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- Jaeger deployment documentation: https://www.jaegertracing.io/docs/1.76/deployment/
- Jaeger Operator documentation: https://www.jaegertracing.io/docs/1.76/deployment/operator/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry sampling documentation: https://opentelemetry.io/docs/concepts/sampling/

## Issues Found
- The architecture and summary described the Jaeger exporter as the normal path for all OpenTelemetry spans. Updated the wording to distinguish current OTLP export from legacy Jaeger-specific exporters.
- The Node.js examples used `new Resource(...)` from `@opentelemetry/resources` and `SemanticResourceAttributes`, which are outdated with current OpenTelemetry JS packages. Replaced them with `resourceFromAttributes` and current semantic convention constants such as `ATTR_SERVICE_NAME`.
- The Node.js OTLP example used the deprecated `spanProcessor` option while also passing `traceExporter`. Updated it to use `spanProcessors` with a single `BatchSpanProcessor`.
- The Python installation command installed the latest OTLP exporter together with `opentelemetry-exporter-jaeger`, but the Jaeger exporter is no longer tested and remains on the older 1.21 release line, causing dependency conflicts with current OTLP packages. Removed it from the current install command and added a compatibility warning for legacy Jaeger exporter use.
- The Go installation and example recommended `go.opentelemetry.io/otel/exporters/jaeger`, which is deprecated and no longer supported. Removed the dependency and replaced the legacy setup section with guidance to use OTLP.
- The OpenTelemetry Collector example included the native `jaeger` exporter, which has been removed from current Collector releases. Removed the legacy exporter block and kept OTLP export to Jaeger.
- The Go application example declared `users` without using it, which would fail Go compilation. Added `_ = users` in the illustrative handler.

## Review Notes
The post is technically relevant and salvageable, but the title still emphasizes "Jaeger Exporter" even though current OpenTelemetry guidance strongly favors OTLP for Jaeger. A future editorial update could retitle or reframe the article around exporting OpenTelemetry traces to Jaeger with OTLP, leaving legacy Jaeger exporters as historical compatibility notes.
