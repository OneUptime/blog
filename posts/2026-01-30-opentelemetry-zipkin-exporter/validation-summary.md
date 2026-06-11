# Validation Summary: How to Build OpenTelemetry Zipkin Exporter

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript / Node.js SDK (`@opentelemetry/sdk-node`, `@opentelemetry/sdk-trace-node`, `@opentelemetry/sdk-trace-base`)
- OpenTelemetry Zipkin exporter (`@opentelemetry/exporter-zipkin`)
- OpenTelemetry semantic conventions and resource attributes
- OpenTelemetry auto-instrumentations for Node (`@opentelemetry/auto-instrumentations-node`)
- OpenTelemetry Collector (otel/opentelemetry-collector-contrib) with OTLP receivers and Zipkin exporter
- Zipkin v2 JSON API and span model
- OTLP HTTP trace exporter (`@opentelemetry/exporter-trace-otlp-http`)
- TypeScript, Express.js, Docker Compose, Jest (testing patterns)
- Sampling primitives (`ParentBasedSampler`, `TraceIdRatioBasedSampler`)

## Sources Consulted
- Zipkin v2 API specification — https://zipkin.io/zipkin-api/zipkin2-api.yaml
- OpenTelemetry JS Zipkin exporter source — https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-exporter-zipkin
- OpenTelemetry Collector Contrib Zipkin exporter — https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/zipkinexporter
- OpenTelemetry SDK Environment Variables specification — https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Node SDK and trace SDK packages on npm

## Issues Found
- **Missing `SimpleSpanProcessor` import in unit test example (Section 9).** The test code instantiated `new SimpleSpanProcessor(memoryExporter)` but only imported `InMemorySpanExporter` from `@opentelemetry/sdk-trace-base`. Fixed by adding `SimpleSpanProcessor` to the existing named import so the example compiles as written.

All other technical claims, code examples, configuration snippets, and Zipkin↔OpenTelemetry format mappings verified against official sources and are correct:
- `/api/v2/spans` endpoint and the Zipkin span field layout (timestamp/duration in microseconds, localEndpoint, tags, annotations) match the Zipkin v2 spec.
- Zipkin span kinds (SERVER, CLIENT, PRODUCER, CONSUMER — no INTERNAL) are accurate.
- `@opentelemetry/exporter-zipkin` constructor options (`url`, `serviceName`, `headers`) are accurate.
- The example transformation showing `otel.status_code: "OK"` is consistent with the exporter's behavior (it emits this tag for any non-UNSET status).
- Collector config keys (`endpoint`, `format: json`) are valid and current; `format: json` is the default and not deprecated.
- Environment variables `OTEL_EXPORTER_ZIPKIN_ENDPOINT` and `OTEL_SERVICE_NAME` are correct names.
- BatchSpanProcessor configuration options (`maxQueueSize`, `maxExportBatchSize`, `scheduledDelayMillis`, `exportTimeoutMillis`) are accurate.
- Sampler primitives (`ParentBasedSampler`, `TraceIdRatioBasedSampler`) and the `OTEL_TRACES_SAMPLER_ARG` env var are correctly used.

## Review Notes
- The post uses the legacy `new Resource({...})` constructor with `SemanticResourceAttributes`. This pattern still works but is deprecated in newer versions of `@opentelemetry/resources` (1.x) in favor of `resourceFromAttributes()` and the per-attribute constants from `@opentelemetry/semantic-conventions` (e.g., `ATTR_SERVICE_NAME`). Not changed because the code as written is still functional and matches the patterns used in many other current OpenTelemetry tutorials; consider modernizing in a future refresh.
- Primitives such as `BatchSpanProcessor`, `SimpleSpanProcessor`, `ParentBasedSampler`, and `TraceIdRatioBasedSampler` are canonically defined in `@opentelemetry/sdk-trace-base` and re-exported from `@opentelemetry/sdk-trace-node`. The post's imports from `sdk-trace-node` are valid; just noting that `sdk-trace-base` is the canonical source.
- The Zipkin Exporter section of the OTel SDK environment-variables spec is marked Deprecated upstream, although the variable `OTEL_EXPORTER_ZIPKIN_ENDPOINT` is still implemented by SDKs. Worth flagging in a future revision.
- `version: '3.8'` in the Docker Compose file is technically obsolete in Compose v2 (the top-level `version` key is ignored), but does not cause errors.
- The "Custom Error Handling" `ResilientZipkinExporter` example declares `maxRetries = 3` but never uses it; this is illustrative rather than incorrect.
