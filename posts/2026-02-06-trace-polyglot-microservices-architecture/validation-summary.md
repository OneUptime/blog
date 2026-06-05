# Validation Summary: How to Trace a Polyglot Microservices Architecture (Java, Python, Go, Node.js)

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry
- OTLP and W3C Trace Context propagation
- OpenTelemetry Collector
- Go OpenTelemetry SDK and `otelhttp`
- Node.js OpenTelemetry SDK and auto-instrumentation
- Python OpenTelemetry SDK, Flask instrumentation, and Requests instrumentation
- Java OpenTelemetry Java agent and manual API spans
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry Go getting started: https://opentelemetry.io/docs/languages/go/getting-started/
- OpenTelemetry Go resources: https://opentelemetry.io/docs/languages/go/resources/
- OpenTelemetry Go semantic conventions API: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.37.0
- OpenTelemetry Java SDK configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry JavaScript resources: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript exporters: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript instrumentation libraries: https://opentelemetry.io/docs/languages/js/libraries/
- OpenTelemetry Python exporters: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python Flask instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector OTLP HTTP exporter API: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/otlphttpexporter
- OneUptime OpenTelemetry docs: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The Go example imported `time` without using it. Removed the unused import so the snippet is syntactically valid.
- The Go example used older semantic convention import/version and `semconv.DeploymentEnvironment`. Updated the import to `go.opentelemetry.io/otel/semconv/v1.37.0` and changed the resource attribute helper to `semconv.DeploymentEnvironmentName`, matching current OpenTelemetry Go semantic conventions.
- The Go server instrumentation comment said the incoming handler propagates context to outgoing requests. Clarified that the handler creates incoming spans and extracts incoming trace context; outgoing propagation happens in the instrumented HTTP client shown later.
- The Node.js example used `new Resource(...)` from `@opentelemetry/resources`. Current OpenTelemetry JavaScript exports `resourceFromAttributes` for this setup, so the example now imports and uses `resourceFromAttributes`.
- The Java section said the agent was configured with environment variables while the command used `-D` system properties. Updated the wording to "system properties."
- The Collector example exported to OneUptime without the required ingestion token header. Added an `x-oneuptime-token` placeholder header.

## Review Notes
The code examples are illustrative and assume surrounding application code exists, such as `gatewayHandler`, `PaymentRequest`, and `PaymentResult`. The Collector example uses a placeholder OneUptime token that must be replaced with a real telemetry ingestion token before deployment.
