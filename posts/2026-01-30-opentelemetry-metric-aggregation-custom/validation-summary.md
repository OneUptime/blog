# Validation Summary: How to Build OpenTelemetry Metric Aggregation Custom

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- OpenTelemetry (Node.js / TypeScript SDK)
- `@opentelemetry/api`
- `@opentelemetry/sdk-metrics` (MeterProvider, PeriodicExportingMetricReader)
- `@opentelemetry/resources`
- `@opentelemetry/semantic-conventions`
- `@opentelemetry/exporter-metrics-otlp-http`
- `@opentelemetry/core` (hrTime)
- Express.js (sample integration)
- Jest / `describe`/`test` style unit tests
- Streaming statistics algorithms (Welford's online algorithm, reservoir-style sampling, sliding windows, weighted averages, percentile interpolation)

## Sources Consulted
- OpenTelemetry JS Upgrade to 2.x guide — https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry JS Resources docs — https://opentelemetry.io/docs/languages/js/resources/
- `@opentelemetry/sdk-metrics` on npm — https://www.npmjs.com/package/@opentelemetry/sdk-metrics
- `@opentelemetry/semantic-conventions` deprecation/migration discussions (open-telemetry/opentelemetry-js issues #5025, #2646)
- HrTime format definition — https://github.com/open-telemetry/opentelemetry-js/blob/main/packages/opentelemetry-core/src/common/time.ts and issue #2578
- OpenTelemetry Metrics Data Model & SDK specifications (Sum, Gauge/LastValue, Histogram, ExponentialHistogram aggregations)

## Issues Found
Three real technical issues were corrected by editing `README.md`:

1. **Incorrect timestamp source for `HrTime` (Section 4 — Building a Custom Aggregator).**
   - Before: `const now = process.hrtime() as HrTime;`
   - Problem: OpenTelemetry's `HrTime` is `[seconds, nanoseconds]` relative to the **Unix epoch**. `process.hrtime()` returns a tuple measured from an arbitrary monotonic point, so casting it as `HrTime` produces semantically wrong timestamps that would render as far-past dates if exported.
   - Fix: Added `import { hrTime } from '@opentelemetry/core';` and changed the call site to `const now = hrTime();`, which is the supported helper that anchors `HrTime` to epoch time.

2. **Deprecated `SemanticResourceAttributes` import (Section 10 — Deploying Custom Aggregations).**
   - Before: `import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';` plus `[SemanticResourceAttributes.SERVICE_NAME]` / `[SemanticResourceAttributes.SERVICE_VERSION]`.
   - Problem: `SemanticResourceAttributes` was deprecated in `@opentelemetry/semantic-conventions` ~1.27 in favor of individually exported `ATTR_*` constants and is slated for removal.
   - Fix: Replaced with `import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';` and updated the key expressions to `[ATTR_SERVICE_NAME]` / `[ATTR_SERVICE_VERSION]`.

3. **Removed `new Resource({...})` constructor (Section 10 — Deploying Custom Aggregations).**
   - Before: `import { Resource } from '@opentelemetry/resources';` and `const resource = new Resource({ ... });`.
   - Problem: The JS SDK 2.x (released Feb 2025) removed the `Resource` class constructor. The migration path is the factory function `resourceFromAttributes(...)`.
   - Fix: Replaced with `import { resourceFromAttributes } from '@opentelemetry/resources';` and `const resource = resourceFromAttributes({ ... });`.

## Review Notes
- Built-in aggregation list (Sum, LastValue, Histogram, ExponentialHistogram), pipeline diagram, OneUptime OTLP endpoint format (`https://oneuptime.com/otlp/v1/metrics`), `MeterProvider({ readers: [...] })` shape, and the observable gauge / `addCallback` / `observableResult.observe(...)` API all match current OpenTelemetry JS docs.
- The illustrative `Aggregator<T>` interface in Section 3 is explicitly framed as the conceptual contract the author's custom aggregator implements, not the literal SDK interface; this is reasonable for a tutorial.
- The `PercentileAggregator` (Section 7) labels its bounded-memory replacement strategy as "reservoir sampling," but the implementation does not track the total number of items seen across the stream — so it is not statistically uniform reservoir sampling (Algorithm R), just bounded random replacement. The code still meets its goal of bounding memory; left as-is because the surrounding section is conceptual rather than claiming a specific statistical guarantee. A future revision could either implement Algorithm R correctly or rename the comment to "bounded random replacement."
- The `ThreadSafeAggregator` (Section 11) is described as thread-safe, but Node.js runs application JavaScript on a single thread; the Promise-chained lock actually serializes overlapping async operations, not true threads. The pattern is still useful (e.g., when `update` is called from interleaved `async` flows), but the name slightly overstates the guarantee. Left as-is; minor wording nit.
- The `CustomAggregator` constructor mutates `this.config.maxValues` even though `config` is declared `private readonly`. `readonly` only prevents reassignment of the reference, not mutation of its properties, so this compiles and works — but it does mutate the caller's options object. Not corrected because it is a stylistic concern rather than a functional bug.
- Welford's online algorithm in Section 9 is implemented correctly (mean update, M2 accumulation, sample variance `M2 / (count - 1)`).
- Linear-interpolation percentile calculation in Section 7 matches the standard "nearest-rank with interpolation" (NIST C=1 / Excel-style) formulation.
