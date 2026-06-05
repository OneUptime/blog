# Validation Summary: How to Fix Duplicate Spans Appearing in Your Tracing Backend Due to Multi SDK

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry Python SDK
- OpenTelemetry JavaScript/Node.js SDK
- OpenTelemetry Java agent and API
- OpenTelemetry Operator auto-instrumentation
- OTLP trace exporting

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python `set_tracer_provider` API documentation: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/trace.html
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript OTLP gRPC trace exporter documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-trace-otlp-grpc.html
- OpenTelemetry Java API documentation for `GlobalOpenTelemetry`: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry Java agent configuration documentation: https://opentelemetry.io/docs/zero-code/java/agent/configuration/
- OpenTelemetry Java agent extensions documentation: https://opentelemetry.io/docs/zero-code/java/agent/extensions/
- OpenTelemetry Operator auto-instrumentation documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/
- OpenTelemetry tracing SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/

## Issues Found
- The original explanation said that repeated SDK initialization always creates multiple TracerProviders that each export every span. This was too broad: OpenTelemetry typically exposes one global provider per process, and repeated initialization can also create duplicate processors/exporters, duplicate instrumentation hooks, or failed attempts to replace the global provider. Updated the explanation to match official SDK and API behavior.
- The duplicate-span diagnosis treated different `span_id` values as the main sign of duplicate SDK export. Repeated exports of the same span usually preserve the same `trace_id` and `span_id`; different IDs can indicate duplicate instrumentation. Updated the diagnostic comments to distinguish these cases.
- The Python guard claimed to initialize only if no real provider was already set, but it only checked a module-level `_initialized` flag. Updated the code to also skip initialization when an SDK `TracerProvider` is already installed.
- The Kubernetes Operator annotation snippet placed the annotation under a generic `metadata` key. For a Deployment, the Operator documentation requires the auto-instrumentation annotation under `spec.template.metadata.annotations`. Updated the YAML snippet.
- The Python cleanup example suggested shutting down and then replacing the global provider in the same process. Official Python API behavior only allows `trace.set_tracer_provider()` to set the global provider once. Updated the cleanup guidance to shut down before process exit and restart the process for a clean provider.

## Review Notes
The Node.js and Java examples use current, documented APIs. The JavaScript OTLP gRPC exporter URL format is valid for an insecure local collector when using the `http://host:port` form documented by OpenTelemetry JS. The Java agent section is correct that manual instrumentation should use the global OpenTelemetry instance installed by the agent rather than registering another SDK.
