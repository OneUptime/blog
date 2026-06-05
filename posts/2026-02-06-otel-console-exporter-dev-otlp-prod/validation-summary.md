# Validation Summary: How to Configure OpenTelemetry to Export to a Local Console During Development

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry
- Node.js OpenTelemetry SDK
- Python OpenTelemetry SDK
- Go OpenTelemetry SDK
- Console/stdout trace exporters
- OTLP/HTTP trace exporter configuration
- OpenTelemetry semantic conventions

## Sources Consulted
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript NodeSDK API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry JavaScript resources API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry Python exporters docs: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry OTLP exporter configuration docs: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry deployment semantic convention registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- Go OTLP HTTP trace exporter package docs: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp
- Go OpenTelemetry trace SDK package docs: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- Go semantic conventions package docs: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.37.0

## Issues Found
- The Node.js snippet used `new Resource(...)`, but the current JavaScript resources package documents `resourceFromAttributes(...)`. Updated the snippet to use `resourceFromAttributes`.
- The main Node.js snippet passed `traceExporter` to `NodeSDK`, which the SDK wraps in a `BatchSpanProcessor`; that contradicted the post's immediate local console-output guidance. Updated it to pass explicit `spanProcessors` and use `SimpleSpanProcessor` for development.
- The Node.js snippet imported `ATTR_DEPLOYMENT_ENVIRONMENT` and the Python snippet used `deployment.environment`; the deployment semantic convention now marks `deployment.environment` as deprecated and replaces it with `deployment.environment.name`. Updated Node.js, Python, and Go examples to use `deployment.environment.name`.
- The Node.js OTLP HTTP exporter used `OTEL_EXPORTER_OTLP_ENDPOINT` directly as a trace URL. For OTLP/HTTP, the generic endpoint is a base URL and traces are sent under `/v1/traces`; trace-specific endpoints should use `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` as-is. Updated both Node.js examples to derive the trace endpoint correctly.
- The Go snippet used semconv `v1.24.0` and `DeploymentEnvironment`. Updated it to semconv `v1.37.0` and `DeploymentEnvironmentName`.
- The Go snippet passed an empty `OTEL_SERVICE_NAME` directly to `semconv.ServiceName` when unset, unlike the Node.js and Python snippets. Added the same `my-service` fallback.
- The Go snippet used `WithBatcher` for both production OTLP and local stdout export. Updated it to keep `WithBatcher` for production and use `WithSyncer` for development console output.
- The dual-exporter Node.js example used `SimpleSpanProcessor` for production OTLP export despite the post recommending batching for production. Updated that production branch to use `BatchSpanProcessor`.
- The post described console output as a JSON object with exact fields such as `"duration": "45ms"`. Console exporter formats vary by language and SDK, so the wording was corrected to describe a structured representation instead of an exact JSON schema.

## Review Notes
None.
