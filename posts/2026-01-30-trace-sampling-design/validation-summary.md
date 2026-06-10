# Validation Summary: How to Build Trace Sampling Design

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- OpenTelemetry JavaScript SDK (`@opentelemetry/api`, `@opentelemetry/sdk-trace-base`, `@opentelemetry/sdk-node`, `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/core`, `@opentelemetry/semantic-conventions`, `@opentelemetry/auto-instrumentations-node`)
- OpenTelemetry Collector / Collector Contrib (tail_sampling, filter, transform, batch, memory_limiter, resource, loadbalancing exporter)
- W3C Trace Context propagation
- TypeScript
- Express.js middleware
- Prometheus (`prom-client`) metrics
- PromQL recording rules / alerts
- Kubernetes Deployment manifest

## Sources Consulted
- OpenTelemetry JS Sampler interface source: https://github.com/open-telemetry/opentelemetry-js/blob/main/packages/opentelemetry-sdk-trace-base/src/Sampler.ts
- OpenTelemetry JS `@opentelemetry/api` index: https://github.com/open-telemetry/opentelemetry-js/blob/main/api/src/index.ts
- OpenTelemetry JS `@opentelemetry/sdk-trace-base` package: https://www.npmjs.com/package/@opentelemetry/sdk-trace-base
- OpenTelemetry Collector Contrib `tail_samplingprocessor` README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor
- OpenTelemetry Collector Contrib `loadbalancingexporter` README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/loadbalancingexporter
- OpenTelemetry Collector Contrib `filterprocessor` README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- OpenTelemetry JS semantic-conventions package: https://www.npmjs.com/package/@opentelemetry/semantic-conventions
- W3C Trace Context spec: https://www.w3.org/TR/trace-context/

## Issues Found

1. **Wrong import source for `Sampler`, `SamplingDecision`, `SamplingResult`** (7 code blocks). The post imported these from `@opentelemetry/api`, but they are exported from `@opentelemetry/sdk-trace-base`. The `@opentelemetry/api` package only exports the propagation / context primitives (`Context`, `SpanKind`, `Attributes`, `Link`). Fixed by splitting the import statements in `head-sampler.ts`, `rate-limited-sampler.ts`, `adaptive-sampler.ts`, `traffic-adaptive-sampler.ts`, `priority-sampler.ts`, `composite-sampler.ts`, and `sampling-test-utils.ts` so that the sampling types come from `@opentelemetry/sdk-trace-base`.

2. **Incorrect `SamplingDecision` numeric literal in the dev sampler.** In the "Full Application Setup" example, the inline dev root sampler returned `{ decision: 1 }`. Per the `SamplingDecision` enum (`NOT_RECORD = 0`, `RECORD = 1`, `RECORD_AND_SAMPLED = 2`), `1` only records the span without setting the sampled flag — it does not "sample everything". Changed to `decision: 2` (`RECORD_AND_SAMPLED`) and added a clarifying inline comment.

3. **Missing imports in Pitfall 3.** The code snippet under "Pitfall 3: Ignoring Propagation Across Services" used `ParentBasedSampler`, `AlwaysOnSampler`, and `AlwaysOffSampler` without importing them. Added an `import` statement from `@opentelemetry/sdk-trace-base`.

## Review Notes

- The `SEMRESATTRS_SERVICE_NAME`, `SEMRESATTRS_SERVICE_VERSION`, and `SEMRESATTRS_DEPLOYMENT_ENVIRONMENT` constants used in the full SDK setup example are still importable from `@opentelemetry/semantic-conventions` but were deprecated as of v1.26.0 in favor of the new stable `ATTR_*` exports. They continue to work and will resolve to the same string attribute names, so I did not change them, but readers on newer semconv versions may see deprecation warnings.
- The tail_sampling policy ordering comment ("Sampling policies evaluated in order") slightly understates how the processor works: in practice tail_sampling evaluates all policies and a trace is kept if any policy votes to sample (with the `and` composite as an exception). The example still produces correct behavior since every individual policy independently votes "keep" for traces it matches.
- The `loadbalancing` exporter snippet includes an `endpoint` field under `protocol.otlp`. That field is harmless (the resolver supplies the actual endpoints), but it is not load-bearing and could be removed for clarity in a future revision.
- The `AdaptiveSampler.recordOutcome` feedback hook increments `errorRequests` without incrementing `totalRequests`, which can skew the error-rate calculation when used as a pure external feedback channel. The post correctly notes the limitation that head-time sampling lacks outcome data, so this is more an implementation refinement than a correctness bug.
- All Collector YAML policy types (`status_code`, `latency`, `string_attribute`, `numeric_attribute`, `span_count`, `probabilistic`, `and`) and their field names match the current `tailsamplingprocessor` schema.
- The OTTL `replace_pattern(target, regex, replacement)` calls in the `transform` processor have the correct three-argument signature.
