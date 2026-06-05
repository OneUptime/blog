# Validation Summary: How to Understand the Difference Between OpenTelemetry API and SDK

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry API and SDK architecture
- OpenTelemetry JavaScript/TypeScript API
- OpenTelemetry Node.js SDK
- OpenTelemetry tracing, metrics, sampling, resources, exporters, and Collector
- OpenTelemetry package boundaries for JavaScript, Python, Go, and Java

## Sources Consulted
- OpenTelemetry JavaScript documentation: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry JavaScript API reference: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_api.html
- OpenTelemetry NodeSDK reference: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry NodeSDK class reference: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-node.NodeSDK.html
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry resource concepts: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- npm package metadata and type definitions for @opentelemetry/sdk-trace-node 2.7.1, @opentelemetry/sdk-trace-base 2.7.1, @opentelemetry/resources 2.7.1, and @opentelemetry/semantic-conventions 1.41.1.

## Issues Found
- The SDK initialization example used `new Resource()` and `SemanticResourceAttributes`, which are outdated for current OpenTelemetry JavaScript packages. Updated the example to use `resourceFromAttributes()` and current `ATTR_*` semantic convention constants.
- The API-only tracing example used numeric status codes. Updated it to import and use `SpanStatusCode.OK` and `SpanStatusCode.ERROR` from `@opentelemetry/api`.
- The custom sampler example was fenced as JavaScript but used TypeScript interfaces and type annotations. Changed the fence to TypeScript, used type-only imports, and updated the sampler signature to include the current `links` parameter.
- The custom sampler checked the old `http.target` attribute. Updated the example to use `url.path`, matching current HTTP semantic convention naming.
- The testing example used `provider.addSpanProcessor()`, which is no longer present on current `NodeTracerProvider`/`BasicTracerProvider` in OpenTelemetry JS 2.x. Updated it to pass `spanProcessors` in the provider constructor.
- The testing example did not clear the global tracer provider between tests. Added `provider.shutdown()` and `trace.disable()` cleanup.
- The post said in-memory exporters come from SDK test packages. Corrected this to SDK packages because `InMemorySpanExporter` is exported by `@opentelemetry/sdk-trace-base`.
- The context propagation wording implied concrete propagators live in the SDK. Adjusted the wording to say propagators are configured alongside SDK setup and are outside the API-only dependency surface.
- The Collector was described as an SDK-level concern. Adjusted this to "pipeline-level concern outside your API instrumentation" because the Collector is a separate component, not part of the SDK.

## Review Notes
The post is technically sound after the targeted corrections. `TraceIdRatioBasedSampler` remains available in current SDKs, but the OpenTelemetry trace SDK specification now notes it is being phased out in favor of newer probability sampling concepts; the example is still valid for current JavaScript SDK usage.
