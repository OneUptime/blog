# Validation Summary: How to Trace User Interactions in React with OpenTelemetry Spans

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- React
- TypeScript
- React Router
- OpenTelemetry JavaScript API and browser tracing SDK
- OpenTelemetry fetch and XMLHttpRequest instrumentation
- OTLP/HTTP trace export
- OpenTelemetry semantic conventions
- Web Vitals
- Browser PerformanceObserver APIs

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript propagation documentation: https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry fetch instrumentation package documentation: https://www.npmjs.com/package/@opentelemetry/instrumentation-fetch
- OpenTelemetry JavaScript package metadata for current versions: @opentelemetry/api 1.9.1, @opentelemetry/sdk-trace-web 2.8.0, @opentelemetry/instrumentation-fetch 0.219.0
- web-vitals package documentation: https://github.com/GoogleChrome/web-vitals
- React Router Link documentation: https://reactrouter.com/api/components/Link
- MDN Event.preventDefault documentation: https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault

## Issues Found
- The form submission tracing snippet created a separate submit span but did not make it a child of the form interaction span. I changed `useTrackedForm` to activate the interaction span while starting the submit span so the trace hierarchy is preserved.
- The form submission tracing snippet only ended and reset the interaction span after successful submission. I moved cleanup into a `finally` block so the interaction span is ended and state is reset even when submission throws.
- The tracked link component intercepted all clicks and did not preserve normal link behavior for modified clicks, non-left-clicks, or links with a target. I updated it to let those browser interactions proceed normally.
- The tracked link component did not honor a user-supplied `onClick` handler that calls `preventDefault()`. I updated the snippet to run the handler first and skip navigation if it cancels the event.
- The modal tracking hook could start a second modal span if `onOpen` was called while a span was already active. I added a guard to avoid duplicate open spans.
- The modal example did not end the modal span if the component unmounted while open. I added an effect cleanup that closes the span on unmount.
- The render performance snippet described `requestAnimationFrame` timing as actual paint time. Since that callback measures delay until the next animation frame, I renamed the attribute from `render.paint_time_ms` to `render.next_frame_delay_ms` and updated the summary table.

## Review Notes
- The OpenTelemetry browser SDK, fetch/XHR instrumentation, resource attributes, sampler interface, and `web-vitals` `onCLS`/`onFCP`/`onLCP`/`onTTFB`/`onINP` usage align with current package documentation.
- The examples use Create React App-style `process.env.REACT_APP_*` variables. Vite or other build tools would need their own environment variable conventions, but the snippet is technically correct for CRA-style setups.
- The fetch instrumentation package is still marked experimental by OpenTelemetry and may introduce breaking changes in future minor releases.
