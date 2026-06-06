# Validation Summary: How to Build Custom Error Classification Logic Using OpenTelemetry Span Status

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry Python API and SDK
- Span status codes
- Span exception events
- OpenTelemetry semantic conventions
- Python exception handling

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python span API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- OpenTelemetry Python SDK trace documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html
- OpenTelemetry Python SDK trace source documentation: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/sdk/trace.html
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry recording errors semantic conventions: https://opentelemetry.io/docs/specs/semconv/general/recording-errors/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/

## Issues Found
- The post referred to Python exception events as created by `span.recordException()`. OpenTelemetry Python uses `span.record_exception()`, so the text was corrected.
- The classifier matched `exception.type` directly against simple class names. OpenTelemetry Python records fully qualified exception type names for non-built-in exceptions, so the example now normalizes the final class name before applying the rules.
- The classifier used the deprecated HTTP semantic convention attribute `http.status_code`. It now uses the stable `http.response.status_code` attribute.
- The custom span processor docstring said it enriches spans with classification attributes, but `SpanProcessor.on_end()` receives an ended `ReadableSpan` and should not mutate it. The docstring now says the processor records the classification for metrics or logs.
- The custom span processor `force_flush()` method called the downstream processor but did not return its boolean result. It now returns the downstream `force_flush()` result.

## Review Notes
The code examples are illustrative and still assume application-specific objects such as `payment_gateway`, `PaymentDeclinedError`, and `PaymentGatewayTimeoutError` exist. In a production implementation, using an OpenTelemetry metric instrument instead of `print()` would match the post's own recommendation for recording classifications.
