# Validation Summary: How to Set Up Error Tracking in React with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide (hands-on implementation walkthrough with code)

## Technologies Covered
- React (error boundaries, hooks, class components)
- OpenTelemetry JS (Web SDK)
  - `@opentelemetry/api`
  - `@opentelemetry/sdk-trace-web` / `@opentelemetry/sdk-trace-base`
  - `@opentelemetry/exporter-trace-otlp-http`
  - `@opentelemetry/context-zone`
  - `@opentelemetry/instrumentation` / `@opentelemetry/instrumentation-fetch`
  - `@opentelemetry/resources`
  - `@opentelemetry/semantic-conventions`
- React Router (`useLocation`, `useNavigationType`)
- TypeScript
- Browser Web APIs (`crypto.randomUUID`, `sessionStorage`, global error events)

## Sources Consulted
- OpenTelemetry JS browser getting-started: https://opentelemetry.io/docs/languages/js/getting-started/browser/
- OpenTelemetry JS resources docs: https://opentelemetry.io/docs/languages/js/resources/
- `@opentelemetry/resources` API reference (v2.x): https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- `@opentelemetry/sdk-trace-web` on npm: https://www.npmjs.com/package/@opentelemetry/sdk-trace-web
- OpenTelemetry JS issue #5299 — "Alternative to deprecated `addSpanProcessor`": https://github.com/open-telemetry/opentelemetry-js/issues/5299
- OpenTelemetry JS contrib issue #2645 — migrate from deprecated `addSpanProcessor`: https://github.com/open-telemetry/opentelemetry-js-contrib/issues/2645

## Issues Found
The post was written against the OpenTelemetry JS SDK 1.x API. Three constructs were
**removed in SDK 2.0** (released early 2025, so the current major version as of this
post's January 2026 date). They would throw at runtime / fail to import on a current
install. All were corrected in `src/telemetry.ts` and the production-config snippet:

1. **`new Resource({...})` removed.** The `Resource` class is no longer constructable
   in `@opentelemetry/resources` v2.x (`Resource is not a constructor`). Changed the
   import from `Resource` to `resourceFromAttributes` and replaced `new Resource({...})`
   with `resourceFromAttributes({...})`.

2. **`SemanticResourceAttributes` removed.** This enum was dropped from
   `@opentelemetry/semantic-conventions`. Replaced the import with the individual
   `ATTR_SERVICE_NAME` / `ATTR_SERVICE_VERSION` constants and used them as the attribute
   keys. For deployment environment, used the current stable attribute key
   `'deployment.environment.name'` directly (the old `deployment.environment` key was
   deprecated/renamed and its constant lives in the incubating entry point).

3. **`provider.addSpanProcessor(...)` removed.** This method was deprecated in 1.x and
   removed in 2.0; span processors are now passed via the `spanProcessors` array in the
   `WebTracerProvider` constructor. Fixed in two places:
   - The basic tracer configuration (`BatchSpanProcessor` now passed via
     `spanProcessors: [...]` alongside `resource`).
   - The production configuration (`new WebTracerProvider({ sampler, spanProcessors: [spanProcessor] })`).

## Review Notes
- The rest of the code is technically correct against the current API: `WebTracerProvider`
  + `ZoneContextManager`, `registerInstrumentations` with `FetchInstrumentation`
  (`propagateTraceHeaderCorsUrls`), `BatchSpanProcessor` / `SimpleSpanProcessor` /
  `ConsoleSpanExporter`, `ParentBasedSampler` / `TraceIdRatioBasedSampler`,
  `propagation.inject` with a custom setter, and the `trace`/`SpanStatusCode`/`Span`
  API surface all remain valid in SDK 2.x.
- Error boundary lifecycle usage (`getDerivedStateFromError`, `componentDidCatch`,
  `recordException`, `setStatus`, `spanContext().traceId`) is correct.
- `useTracedCallback` wraps `withTracedClick(...)` inside `React.useCallback` — this works
  at runtime but will trigger an `react-hooks/exhaustive-deps` ESLint warning because the
  callback passed to `useCallback` is not an inline function literal. This is a lint-style
  nuance, not a correctness bug, so it was left unchanged per the "fix only technical
  errors" guidance.
- `crypto.randomUUID()` requires a secure context (HTTPS or localhost); fine for the
  intended production/dev usage but worth noting for non-HTTPS staging environments.
- Minor naming nuance: the summary table labels global handlers as `window.onerror`, while
  the code correctly uses `window.addEventListener('error', ...)`. Both are valid
  approaches and the code itself is accurate, so no change was made.
