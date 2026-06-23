# Validation Summary: Mastering OpenTelemetry Tracing: End-to-End User Journey Tracing

## Status
validated

## Post Type
Technical guide / tutorial (OpenTelemetry distributed tracing with Node.js/TypeScript + Collector config)

## Technologies Covered
- OpenTelemetry JS (API + Node SDK)
- `@opentelemetry/sdk-node`, `@opentelemetry/resources`, `@opentelemetry/semantic-conventions`
- `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/context-async-hooks`, `@opentelemetry/core`, `@opentelemetry/sdk-trace-base`
- `@opentelemetry/auto-instrumentations-node` (HTTP, Express, gRPC, KafkaJS)
- W3C Trace Context + Baggage propagation
- Head sampling (ParentBased + TraceIdRatioBased) and tail sampling
- OpenTelemetry Collector `tail_sampling` processor (status_code, latency, string_attribute policies)
- Node.js / TypeScript, Express, Kafka, gRPC
- Mermaid sequence diagram

## Sources Consulted
- OpenTelemetry JS Resources docs: https://opentelemetry.io/docs/languages/js/resources/
- `@opentelemetry/resources` npm / 2.x upgrade guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- `@opentelemetry/semantic-conventions` README (stable vs `/incubating` entry points): https://github.com/open-telemetry/opentelemetry-js/blob/main/semantic-conventions/README.md
- OpenTelemetry Collector tail_sampling processor docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/

## Issues Found
1. **`new Resource(...)` no longer valid (breaking change in OTel JS 2.x).** The `Resource` class was removed from `@opentelemetry/resources` in the 2.0 release (current at the time of this post), replaced by the `resourceFromAttributes()` factory. The original code would throw `Resource is not a constructor`. Fixed: changed the import to `resourceFromAttributes` and updated the `resource:` field to call `resourceFromAttributes({ ... })`.
2. **`ATTR_DEPLOYMENT_ENVIRONMENT_NAME` imported from the wrong entry point.** `deployment.environment.name` is an unstable/incubating convention; `ATTR_DEPLOYMENT_ENVIRONMENT_NAME` is exported from `@opentelemetry/semantic-conventions/incubating`, not the stable `@opentelemetry/semantic-conventions` root. The original single import would fail to resolve the symbol. Fixed: split the imports so `ATTR_SERVICE_NAME` (stable) comes from the root and `ATTR_DEPLOYMENT_ENVIRONMENT_NAME` comes from `/incubating`, with an explanatory comment.

## Review Notes
- `messaging.operation: 'process'` reflects the older messaging convention. Current semconv prefers `messaging.operation.type` (with values like `publish`/`receive`/`process`) and `messaging.operation.name`. The post's usage still works with existing tooling and is illustrative, so it was left as-is; worth modernizing in a future revision.
- The inline comment "messaging.destination.kind was removed in semconv 1.20.0" is informational and broadly accurate (that attribute was dropped during the messaging convention overhaul).
- The `/incubating` entry point is explicitly not covered by semantic-versioning guarantees and may change in minor releases — acceptable for `deployment.environment.name`, but readers should be aware values there can shift.
- All other code (active-span enrichment, baggage get/getAllEntries, `propagation.inject/extract`, `startActiveSpan` with PRODUCER/CONSUMER span kinds, `ParentBasedSampler`/`TraceIdRatioBasedSampler`, `CompositePropagator` with W3C trace + baggage propagators, `AsyncLocalStorageContextManager`) matches current OpenTelemetry JS APIs.
- The Collector `tail_sampling` config (policy types `status_code`, `latency`, `string_attribute`; `decision_wait`/`num_traces`; processor ordering `[tail_sampling, batch]`) is correct.
