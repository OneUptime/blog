# Validation Summary: How to Sample Errors at 100% While Reducing Normal Trace Volume

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript SDK for Node.js
- OpenTelemetry Collector
- Tail sampling processor
- OTLP/gRPC exporter
- OpenTelemetry semantic conventions for HTTP and exceptions
- TypeScript
- YAML
- curl

## Sources Consulted
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript sampling docs: https://opentelemetry.io/docs/languages/js/sampling/
- OpenTelemetry JavaScript resources docs: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry exception tracing specification: https://opentelemetry.io/docs/specs/otel/trace/exceptions/
- Published TypeScript declarations for `@opentelemetry/sdk-trace-base`, `@opentelemetry/sdk-node`, `@opentelemetry/resources`, and `@opentelemetry/exporter-trace-otlp-grpc` from npm.

## Issues Found
1. **Outdated OpenTelemetry JS resource API.** The post imported and instantiated `Resource` from `@opentelemetry/resources`, but current package declarations export `Resource` as a type and use `resourceFromAttributes()` to create resources. Changed the NodeSDK example to import and call `resourceFromAttributes()`.
2. **Incorrect OTLP/gRPC exporter URL scheme.** The OpenTelemetry JS gRPC exporter expects `http://` or `https://` URL schemes and warns on other URL protocols. Changed `grpc://otel-collector:4317` to `http://otel-collector:4317`.
3. **Outdated HTTP semantic convention key.** The post used `http.status_code`, which was replaced by the stable `http.response.status_code` semantic convention. Updated the Collector policies and custom sampler example.
4. **Exception event policy matched the wrong data shape.** `exception.type` is an exception span-event attribute, while the tail sampling `string_attribute` policy matches span/resource attributes. Replaced that policy with an `ottl_condition` policy that checks for `spanevent.name == "exception"`.
5. **Incorrect TypeScript sampler imports and enum member.** `Sampler`, `SamplingResult`, and `SamplingDecision` are exported by `@opentelemetry/sdk-trace-base`, not `@opentelemetry/api`; the current enum member is `RECORD_AND_SAMPLED`, not `RECORD_AND_SAMPLE`. Updated the imports and enum references.
6. **Non-standard OTLP exporter compression example.** The OTLP exporter specification lists `gzip` as the supported compression option. Changed the agent Collector example from `zstd` to `gzip`.
7. **Cost table arithmetic mismatch.** The table said 875 spans/second after sampling, but the following calculation totaled about 642 spans/second. Updated the table and proportional monthly cost to match the stated calculation, rounding to 643 spans/second.

## Review Notes
- The core architecture is accurate: tail sampling needs all spans for a trace to reach the same Collector instance, and a trace is sampled when a non-drop policy returns a sample decision.
- The tail sampling processor is a contrib/Kubernetes distribution component, not part of the minimal core-only Collector distribution.
- HTTP 4xx handling is context-dependent in OpenTelemetry span status conventions; keeping 4xx traces via the HTTP status-code attribute is valid when the application wants client-error visibility, even though server spans are not required to set `ERROR` status for 4xx responses.
