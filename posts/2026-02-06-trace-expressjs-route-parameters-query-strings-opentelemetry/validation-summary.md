# Validation Summary: How to Trace Express.js Route Parameters and Query Strings with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry Express instrumentation
- OpenTelemetry HTTP instrumentation
- OpenTelemetry OTLP HTTP trace exporter
- Express.js
- Node.js
- TypeScript

## Sources Consulted
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript resources API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript Span API docs: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Span.html
- OpenTelemetry Express instrumentation package documentation: https://www.npmjs.com/package/@opentelemetry/instrumentation-express
- Express routing documentation: https://expressjs.com/en/guide/routing.html
- Express 5 API reference: https://expressjs.com/en/5x/api/

## Issues Found
- The tracing setup used the older `Resource` constructor and `SemanticResourceAttributes.SERVICE_NAME` import. Updated the code to use `resourceFromAttributes` and `ATTR_SERVICE_NAME`, matching current OpenTelemetry JavaScript resource documentation.
- The first Express app example used `trace.getActiveSpan()` without importing `trace`. Added the missing `@opentelemetry/api` import.
- The route-parameter middleware was registered globally with `app.use()` before route matching. In Express, route parameters are populated for matched route paths, so the examples would not capture route params as written. Updated route examples to apply the route-parameter middleware at the route level.
- Query redaction compared lowercased query keys against a list containing `apiKey`, which meant `apiKey` would not be redacted by that middleware. Changed the excluded key list and sanitization pass to compare lowercased keys consistently.
- Some event attributes passed raw Express query values, which can be arrays or parsed query objects rather than OpenTelemetry attribute values. Converted those event values to strings in the affected example.
- The advanced filter parsing catch block used `error.message` directly. Updated it to handle TypeScript's `unknown` catch variable safely.
- The array query example could pass non-string parsed query values into an OpenTelemetry event attribute array. Converted array entries with `String`.
- The trace querying section implied a generic `trace.where(...)` query language. OpenTelemetry does not define a standard trace-query syntax, so the examples were changed to conceptual backend filters.

## Review Notes
The examples use custom attribute names such as `route.param.userId` and `query.param.page`. That is technically valid for application-specific attributes, but teams should consider cardinality, privacy, and backend indexing costs before recording high-cardinality or user-controlled values.
