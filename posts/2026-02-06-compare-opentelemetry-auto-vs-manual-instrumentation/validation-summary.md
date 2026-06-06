# Validation Summary: How to Compare OpenTelemetry Auto-Instrumentation vs Manual Instrumentation

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry zero-code and code-based instrumentation
- OpenTelemetry Java agent
- OpenTelemetry Python auto-instrumentation and manual tracing API
- OpenTelemetry .NET automatic instrumentation
- OpenTelemetry JavaScript/Node.js zero-code instrumentation
- OpenTelemetry Go zero-code instrumentation, instrumentation libraries, and manual instrumentation
- OpenTelemetry Rust API/SDK
- OTLP exporter configuration

## Sources Consulted
- OpenTelemetry zero-code concepts: https://opentelemetry.io/docs/concepts/instrumentation/zero-code/
- OpenTelemetry zero-code instrumentation overview: https://opentelemetry.io/docs/zero-code/
- OpenTelemetry Java agent getting started: https://opentelemetry.io/docs/zero-code/java/agent/getting-started/
- OpenTelemetry Java agent configuration: https://opentelemetry.io/docs/zero-code/java/agent/configuration/
- OpenTelemetry Java agent suppressing instrumentation: https://opentelemetry.io/docs/zero-code/java/agent/disable/
- OpenTelemetry Java agent performance: https://opentelemetry.io/docs/zero-code/java/agent/performance/
- OpenTelemetry Python zero-code instrumentation: https://opentelemetry.io/docs/zero-code/python/
- OpenTelemetry Python manual instrumentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry JavaScript zero-code instrumentation: https://opentelemetry.io/docs/zero-code/js/
- OpenTelemetry Go zero-code instrumentation: https://opentelemetry.io/docs/zero-code/go/
- OpenTelemetry .NET automatic instrumentation configuration: https://opentelemetry.io/docs/zero-code/dotnet/configuration/
- OpenTelemetry Rust documentation: https://opentelemetry.io/docs/languages/rust/

## Issues Found
- The Java agent example used `http://collector:4317` without setting `otel.exporter.otlp.protocol=grpc`. Current Java agent versions default to `http/protobuf`, so the example now explicitly sets `grpc` for the `4317` OTLP endpoint.
- The Python auto-instrumentation setup installed `opentelemetry-distro` and `opentelemetry-exporter-otlp` but omitted `opentelemetry-bootstrap -a install`, which installs matching instrumentation libraries for installed packages. Added the bootstrap command.
- The Python programmatic instrumentation snippet imported `sitecustomize` from the auto-instrumentation package even though the shown code manually instruments specific libraries with `FlaskInstrumentor`, `RequestsInstrumentor`, and `SQLAlchemyInstrumentor`. Removed the unnecessary import.
- The Java instrumentation configuration snippet used generic or invalid instrumentation names for HTTP client and Redis. Replaced them with documented Java agent instrumentation names: `OTEL_INSTRUMENTATION_APACHE_HTTPCLIENT_ENABLED` and `OTEL_INSTRUMENTATION_LETTUCE_ENABLED`.
- The post claimed Go had no auto-instrumentation agent and that Go required manual or compile-time instrumentation. Current OpenTelemetry docs list Go zero-code instrumentation as work in progress using eBPF, so the language discussion and comparison table were updated.
- The post gave fixed Java and Python auto-instrumentation overhead numbers. Official Java agent performance guidance says overhead depends on workload, runtime, enabled instrumentations, and deployment environment and should be measured directly. Replaced the fixed numbers with that caveat.

## Review Notes
The overall recommendation to combine auto-instrumentation for infrastructure/library spans with manual instrumentation for business logic is consistent with current OpenTelemetry guidance. The 80-90% coverage statement is a practical rule of thumb rather than a documented guarantee, so it should be treated as workload-dependent in future revisions.
