# Validation Summary: How to Track Client-Side Routing Performance in SPAs with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript
- OpenTelemetry browser tracing
- OpenTelemetry OTLP HTTP exporter
- OpenTelemetry semantic conventions
- React
- React Router
- Browser Performance APIs
- JavaScript Fetch API

## Sources Consulted
- OpenTelemetry JavaScript browser getting started: https://opentelemetry.io/docs/languages/js/getting-started/browser/
- OpenTelemetry JavaScript instrumentation guide: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript exporters guide: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry JavaScript Span API: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Span.html
- React Router useNavigationType documentation: https://reactrouter.com/api/hooks/useNavigationType
- React Router useLocation documentation: https://reactrouter.com/docs/en/v6/hooks/use-location
- React useLayoutEffect documentation: https://react.dev/reference/react/useLayoutEffect
- React useEffect documentation: https://react.dev/reference/react/useEffect
- MDN Window.requestAnimationFrame documentation: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame

## Issues Found
- The OpenTelemetry setup used outdated SDK construction patterns. Updated `BatchSpanProcessor` to import from `@opentelemetry/sdk-trace-base`, replaced `new Resource(...)` with `resourceFromAttributes(...)`, and configured `spanProcessors` in the `WebTracerProvider` constructor.
- The route tracing example overclaimed click-to-fully-rendered timing. Updated the prose and attributes to describe an approximate paint delay, not a guaranteed full render duration.
- The route tracing example did not provide a parent context for data fetch spans. Added a React context for the active route span and used `trace.setSpan(context.active(), routeSpan)` when starting fetch spans.
- The fetch hook checked a non-public `span.ended` property. Replaced it with local span lifecycle tracking and cancellation guards so cleanup does not mutate an already-ended span.
- The fetch example used outdated HTTP semantic convention attribute names. Updated `http.url`, `http.method`, and `http.status_code` to `url.full`, `http.request.method`, and `http.response.status_code`.
- The component render timing hook only measured initial mount despite the surrounding text saying it measured after data arrived. Updated the hook to accept dependencies and changed the Dashboard example to measure the render update when `loading` changes.
- The React Router navigation type prose used lowercase values. Updated it to the documented `PUSH`, `POP`, and `REPLACE` values.
- The performance section claimed negligible overhead in all cases. Softened it to recommend measuring overhead and tuning sampling or batching for high-traffic frontends.

## Review Notes
OpenTelemetry browser instrumentation is still described by the official docs as experimental and mostly unspecified. The examples are valid as manual instrumentation patterns, but production implementations should also account for CORS, CSP, collector exposure, sampling, and existing automatic fetch/XMLHttpRequest instrumentation to avoid duplicate spans.
