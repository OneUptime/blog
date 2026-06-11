# Validation Summary: How to Create Log Sampling Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector filter processor
- OpenTelemetry Collector transform processor
- OpenTelemetry Collector probabilistic sampler processor
- OpenTelemetry Collector tail sampling processor
- OpenTelemetry JavaScript metrics API
- TypeScript
- Node.js crypto module
- Mermaid diagrams

## Sources Consulted
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector probabilistic sampler processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/README.md
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry sampling concepts: https://opentelemetry.io/docs/concepts/sampling/
- OpenTelemetry JavaScript metrics documentation: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/metrics.md
- OpenTelemetry JavaScript API reference for Meter: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Meter.html
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- Node.js crypto documentation: https://nodejs.org/api/crypto.html
- Related OneUptime links in the post were checked and resolved.

## Issues Found
- The level-based OpenTelemetry Collector example used an older filter processor configuration shape with `logs.exclude.match_type`. Updated it to the current OTTL-based `log_conditions` form.
- The level-based example claimed warnings and errors were too valuable to lose, but the original pipeline would have sent warnings and errors through the probabilistic sampler. Added a transform processor rule that sets `sampling.priority` for warning-and-above logs and configured the probabilistic sampler to honor that priority.
- The content sampler used `import crypto from 'crypto'`. Updated it to `import { createHash } from 'node:crypto'`, which is the clearer current Node.js module form.
- The rate limiter prose described a sliding window, but the implementation uses a fixed time window. Updated the wording to match the algorithm.
- The rate limiter example described usage with an OpenTelemetry log processor, but the snippet is a custom processing hook rather than an official processor API. Updated the wording to "your log processing path."
- The combined head and tail sampling section put `tail_sampling` in a logs pipeline, but the OpenTelemetry Collector tail sampling processor is for traces. Updated the section to describe tail sampling for trace-correlated logs and changed the pipeline to `traces`.
- The tail sampling example originally placed probabilistic head sampling before tail sampling while claiming tail sampling would ensure errors and slow requests were captured. Removed the upstream probabilistic sampler from that collector example because tail sampling cannot recover telemetry already dropped before it.
- The metrics example imported from deprecated `@opentelemetry/api-metrics` and did not define `meter`. Updated it to use `metrics.getMeter()` from `@opentelemetry/api`.

## Review Notes
The TypeScript sampler examples are illustrative application-level examples, not drop-in OpenTelemetry SDK processor implementations. The adaptive sampler uses `Math.random()`, so it does not provide trace-consistent decisions unless adapted to use the same trace-ID hashing approach shown earlier.
