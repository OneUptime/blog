# Validation Summary: How to Handle Custom Span Attributes in OpenTelemetry

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry span attributes
- OpenTelemetry semantic conventions
- Python OpenTelemetry API and SDK
- JavaScript/TypeScript OpenTelemetry API
- Go OpenTelemetry API
- Java OpenTelemetry API

## Sources Consulted
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python SDK trace API docs: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Java API docs: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry HTTP semantic conventions registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- OpenTelemetry database semantic conventions registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/db/
- OpenTelemetry messaging semantic conventions registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/messaging/
- OpenTelemetry RPC semantic conventions registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/rpc/
- OpenTelemetry recording errors semantic conventions: https://opentelemetry.io/docs/specs/semconv/general/recording-errors/

## Issues Found
- The post used deprecated HTTP semantic convention names such as `http.method`, `http.status_code`, `http.url`, and `http.request_content_length`. Updated examples to current attributes such as `http.request.method`, `http.response.status_code`, `url.full`, `url.path`, and `http.request.body.size`.
- The semantic convention Python example used deprecated `SpanAttributes` constants for HTTP, database, messaging, and RPC attributes. Replaced them with current semantic convention attribute names including `db.system.name`, `db.namespace`, `db.operation.name`, `db.query.text`, `messaging.destination.name`, `messaging.message.id`, `rpc.system.name`, and `rpc.method`.
- The JavaScript error-status example used the numeric status code `2`. Updated it to import and use `SpanStatusCode.ERROR` from `@opentelemetry/api`.
- The Java example omitted required imports for `StatusCode`, `List`, and `Collectors`, and included an unused `Attributes` import. Fixed the imports.
- The Python sensitive-data filter attempted to mutate a completed SDK `ReadableSpan` through the private `_attributes` field from a `SpanProcessor`. Reworked the snippet into a helper that filters values before setting attributes on the span.
- The JavaScript safe attribute helper normalized keys in a way that did not match namespaced keys like `user.password` or normalized variants like `api_key`. Updated the normalization and blocked/masked key sets so the example behaves as described.
- The Python span-limit configuration passed a dictionary to `TracerProvider(span_limits=...)`. Updated it to use `SpanLimits`, with current constructor fields such as `max_span_attributes` and `max_span_attribute_length`.
- The Go batching example had an unused reassigned `ctx`, an unused `trace` import, and referenced `order.IsExpress`, which was not part of the shown `Order` type. Fixed the snippet to compile cleanly in context by using `_` for the returned context, removing the unused import, adding `context`, and using `order.Total > 100`.

## Review Notes
Some snippets still rely on application-specific functions and types such as `execute_order`, `calculateDiscount`, `ProcessPayment`, `Order`, and `OrderResult`; that is acceptable for illustrative blog examples. The query examples are backend-specific pseudo-SQL rather than portable OpenTelemetry syntax.
