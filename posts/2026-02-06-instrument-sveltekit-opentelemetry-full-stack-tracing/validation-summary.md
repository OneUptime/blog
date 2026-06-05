# Validation Summary: How to Instrument SvelteKit with OpenTelemetry for Full-Stack Tracing

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- SvelteKit
- SvelteKit adapter-node
- OpenTelemetry JavaScript
- OpenTelemetry Node SDK
- OpenTelemetry HTTP auto-instrumentation
- OTLP HTTP trace exporter
- TypeScript
- Node.js and Express

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry resources documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/db/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- SvelteKit adapter-node documentation: https://svelte.dev/docs/kit/adapter-node
- SvelteKit load documentation: https://svelte.dev/docs/kit/load
- SvelteKit hooks documentation: https://svelte.dev/docs/kit/hooks
- SvelteKit form actions documentation: https://svelte.dev/docs/kit/form-actions
- SvelteKit routing and error helper documentation: https://svelte.dev/docs/kit/routing
- npm package metadata for current OpenTelemetry JavaScript packages: @opentelemetry/resources, @opentelemetry/semantic-conventions, @opentelemetry/api, @opentelemetry/instrumentation-http

## Issues Found
- The OpenTelemetry resource setup used stale `Resource` and `SemanticResourceAttributes` imports. Updated the example to use `defaultResource()`, `resourceFromAttributes()`, and current `ATTR_*` semantic convention constants.
- The instrumentation and custom server examples mixed CommonJS with SvelteKit's usual ESM project setup. Updated them to ESM and used dynamic imports in the custom server so OpenTelemetry initializes before Express and the built SvelteKit handler load.
- The Express-based custom server example omitted the `express` dependency. Added `npm install express`.
- Several custom span attributes used deprecated semantic convention names such as `http.method`, `http.status_code`, `http.user_agent`, `db.operation`, `db.table`, and `deployment.environment`. Updated them to current names including `http.request.method`, `http.response.status_code`, `user_agent.original`, `db.operation.name`, `db.collection.name`, and `deployment.environment.name`.
- The API load example described the reviews request as parallel even though the code runs it after the product request. Adjusted the wording to avoid the incorrect claim.
- The hooks example imported an unused OpenTelemetry `context` symbol and left `handleError` untyped. Removed the unused import and typed `handleError` as `HandleServerError`.
- The form action catch block treated any object, including an `Error`, as a validation failure. Updated the branch to distinguish validation error objects from real `Error` instances.

## Review Notes
The guide is technically relevant and broadly accurate for SvelteKit applications deployed with `@sveltejs/adapter-node`. Browser-side OpenTelemetry remains experimental per official OpenTelemetry JavaScript documentation, so future expansions into client tracing should call out browser limitations and collector CORS/CSP requirements explicitly.
