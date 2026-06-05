# Validation Summary: How to Monitor Single Page Application Navigation with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript API
- OpenTelemetry tracing and span status
- OpenTelemetry HTTP semantic conventions
- React Router
- Vue Router
- Browser History API
- Browser Performance and rendering APIs
- JavaScript Fetch API

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- React Router `useNavigation` documentation: https://reactrouter.com/api/hooks/useNavigation
- Vue Router navigation guards documentation: https://router.vuejs.org/guide/advanced/navigation-guards.html
- MDN `requestAnimationFrame` documentation: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
- MDN History API documentation: https://developer.mozilla.org/en-US/docs/Web/API/History_API/Working_with_the_History_API

## Issues Found
- The Vue Router example called `getNavigationSpan()` in `router.onError()` without importing it. Added `getNavigationSpan` to the `navigation-tracer` import so the example is syntactically valid.
- The fetch tracing example used older HTTP semantic convention attributes: `http.url`, `http.method`, `http.status_code`, and `http.response_content_length`. Updated these to current OpenTelemetry semantic convention names: `url.full`, `http.request.method`, `http.response.status_code`, and `http.response.body.size`.
- The fetch tracing example used the possibly relative `url` value for URL attribution. Updated it to record an absolute URL using `new URL(url, window.location.href).href`, matching the semantic convention requirement for `url.full`.
- The fetch tracing example set `SpanStatusCode.OK` for successful HTTP responses. Removed the explicit success status so successful 1xx, 2xx, and 3xx HTTP spans remain unset as recommended by OpenTelemetry HTTP semantic conventions.
- The fetch tracing example did not set `error.type` for HTTP and thrown errors. Added `error.type` for failed HTTP responses and caught exceptions.
- The caught error handling assumed every thrown value was an `Error` object. Updated the status message and `error.type` handling to tolerate non-`Error` thrown values.
- The double `requestAnimationFrame` explanation said the second callback confirms that paint happened. Adjusted the wording to match MDN's guarantee that rAF callbacks run before repaint and that the nested callback moves work to the following frame.

## Review Notes
The examples are valid as illustrative manual instrumentation. In a production app, consider avoiding duplicate spans if browser fetch auto-instrumentation is also enabled, and consider redacting sensitive query parameters before recording `url.full`.
