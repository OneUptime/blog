# Validation Summary: How to Fix 'Span Not Exported' Issues

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry tracing and spans
- OpenTelemetry samplers and span processors
- OTLP HTTP trace exporter
- Node.js tracing setup

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript sampling documentation: https://opentelemetry.io/docs/languages/js/sampling/
- OpenTelemetry JS SDK 2.x upgrade guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry deployment environment semantic convention: https://opentelemetry.io/docs/specs/semconv/resource/deployment-environment/
- OpenTelemetry OTLP exporter configuration documentation: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/

## Issues Found
- The span pipeline diagram placed the span processor before the sampler. I corrected the flow so the sampler decision happens before ended spans are sent to the span processor/exporter path.
- Several JavaScript snippets used `provider.addSpanProcessor(...)`, which was removed in OpenTelemetry JS SDK 2.x. I updated those examples to pass `spanProcessors` in the `NodeTracerProvider` constructor.
- The span processor example registered both a simple and a batch processor against the same provider, which would duplicate exports if copied directly. I changed it to choose one processor based on environment.
- The exporter connection test constructed a fake span object and awaited `exporter.export(...)`, which does not represent normal SDK usage and would not reliably work with the expected readable span shape. I replaced it with a real provider, processor, tracer, and span, then used `forceFlush()` and `shutdown()`.
- The span status examples used numeric status codes. I updated them to use the official `SpanStatusCode` enum.
- The complete example used `new Resource(...)`, which is no longer exported in OpenTelemetry JS SDK 2.x. I changed it to `resourceFromAttributes(...)`.
- The complete example used older semantic convention exports and the deprecated `deployment.environment` attribute. I updated service attributes to `ATTR_SERVICE_NAME` and `ATTR_SERVICE_VERSION`, and changed deployment metadata to `deployment.environment.name`.
- The complete example read `OTEL_EXPORTER_OTLP_ENDPOINT` directly as the exporter `url`, which can be a generic OTLP endpoint rather than the trace-specific URL expected by the HTTP trace exporter option. I changed it to use `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` with the `/v1/traces` default.
- The first tracer-provider snippet had duplicate `const` declarations inside one JavaScript code block. I adjusted the variable names/imports so the block parses cleanly.

## Review Notes
The examples are now aligned with current OpenTelemetry JS SDK 2.x APIs. Future improvements could mention that the higher-level `@opentelemetry/sdk-node` `NodeSDK` is usually preferred for full Node.js auto-instrumentation setups, while the post's manual `NodeTracerProvider` examples are useful for focused tracing demonstrations.
