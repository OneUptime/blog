# Validation Summary: How to Instrument Booking Engine Reservation Flow with OpenTelemetry End-to-End

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript API
- OpenTelemetry tracing
- OpenTelemetry metrics
- W3C Trace Context propagation
- Node.js/Express-style HTTP handlers

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript API reference for `Tracer.startActiveSpan` and `Tracer.startSpan`: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Tracer.html
- OpenTelemetry JavaScript API reference for `Span.setStatus`, `Span.recordException`, and `Span.end`: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Span.html
- OpenTelemetry JavaScript API reference for `Meter.createCounter` and `Counter.add`: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Meter.html and https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Counter.html
- OpenTelemetry HTTP semantic convention attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- OpenTelemetry context propagation concepts: https://opentelemetry.io/docs/concepts/context-propagation/
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/

## Issues Found
- The post described a booking session ID as if it were OpenTelemetry trace context across multiple HTTP requests. I changed the wording to explain that W3C `traceparent` and `tracestate` propagate trace context, while the booking session ID is a correlation attribute for independent requests in the same booking funnel.
- The middleware did not assign `req.bookingSessionId`, but the search handler returned it. I added `req.bookingSessionId = sessionId`.
- The middleware used the deprecated `http.status_code` semantic attribute. I changed it to `http.response.status_code`.
- The snippets used numeric span status code `2`. I imported `SpanStatusCode` and changed the examples to use `SpanStatusCode.ERROR`.
- Several spans were ended only on the success path. I wrapped the relevant span bodies in `try`/`catch`/`finally` so spans are ended and exceptions are recorded when operations fail.
- The search example labeled the first and last result prices as cheapest and most expensive, which only works if results are already sorted. I changed it to compute min and max from the returned prices.
- The select example discarded the hold returned from `holdInventory()` and responded with `priceCheck.holdId`, which was not set by the shown code. I changed it to return the hold from the child span and respond with `hold.id`.

## Review Notes
The examples assume an OpenTelemetry SDK and context manager are already configured for the application. That setup is outside the scope of this post, but without it the `@opentelemetry/api` calls are no-ops by design.
