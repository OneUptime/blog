# Validation Summary: How to name spans in OpenTelemetry?

## Status
validated

## Post Type
Guide / Tutorial — explains best practices for naming OpenTelemetry spans with JavaScript/TypeScript code examples.

## Technologies Covered
- OpenTelemetry (distributed tracing)
- OpenTelemetry JavaScript API (`@opentelemetry/api`)
- TypeScript / JavaScript

## Sources Consulted
- OpenTelemetry JS API `Span` interface reference: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Span.html
- OpenTelemetry JS API tracing docs: https://github.com/open-telemetry/opentelemetry-js-api/blob/main/docs/tracing.md
- OpenTelemetry JS instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry semantic conventions (HTTP / database attributes): https://opentelemetry.io/docs/specs/semconv/

## Issues Found
- **Non-existent `span.setName()` method (3 occurrences).** The post used `span.setName(...)` to rename spans in the "Be Descriptive", "Maintain Consistency", and "Adopt Hierarchical Naming" examples. The OpenTelemetry JavaScript `Span` interface has no `setName` method — the correct method is `updateName(name: string)`. (`setName` was a spec proposal that was never adopted for the JS implementation.) As written, this code would throw a `TypeError: span.setName is not a function` at runtime. Changed all three calls to `span.updateName(...)`, preserving the names and comments.

## Review Notes
- The remaining code is technically correct: `tracer.startSpan(name, { attributes })`, `span.setAttribute(key, value)`, `span.addEvent(name)`, `span.recordException({ name, message, stack })` (the object form is a valid `Exception` type), `span.setStatus({ code: SpanStatusCode.ERROR, message })`, and the parent/child context pattern using `trace.setSpan(context.active(), parentSpan)` with `tracer.startSpan(name, undefined, parentContext)` all match the current `@opentelemetry/api` surface.
- Deprecation caveat (not changed, since these were valid stable conventions and the post presents them only as illustrative "commonly used attributes"): the HTTP attributes `http.method`, `http.url`, `http.status_code` and the database attribute `db.statement` are older OpenTelemetry semantic conventions. Newer semantic conventions have superseded them with `http.request.method`, `url.full`, `http.response.status_code`, and `db.query.text` respectively. A future refresh could mention the current names.
- Minor stylistic (not an error): the "Putting it all together" example uses `loginSpan.startSpan('UserService.login', { attributes: { email: ... } })` with a raw `email` attribute key rather than a namespaced custom key (e.g., `user.email`); this is fine functionally and consistent with the post's "custom attribute" framing.
