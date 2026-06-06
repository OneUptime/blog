# Validation Summary: How to Handle Context Propagation in Browser-to-Server Traces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript browser tracing
- OpenTelemetry fetch and XMLHttpRequest instrumentation
- W3C Trace Context (`traceparent`, `tracestate`)
- Browser CORS preflight behavior
- Express `cors` middleware
- FastAPI `CORSMiddleware`
- Browser `Server-Timing` / Performance API
- React Router route-change tracing

## Sources Consulted
- OpenTelemetry JavaScript documentation: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry JavaScript `sdk-trace-web` README: https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-sdk-trace-web
- OpenTelemetry fetch instrumentation README: https://www.npmjs.com/package/@opentelemetry/instrumentation-fetch
- OpenTelemetry XMLHttpRequest instrumentation README: https://www.npmjs.com/package/@opentelemetry/instrumentation-xml-http-request
- OpenTelemetry `context-zone` README: https://www.npmjs.com/package/@opentelemetry/context-zone
- OpenTelemetry `@opentelemetry/resources` package API: https://www.npmjs.com/package/@opentelemetry/resources
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- MDN CORS guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- Express `cors` middleware documentation: https://expressjs.com/en/resources/middleware/cors/
- FastAPI CORS documentation: https://fastapi.tiangolo.com/tutorial/cors/
- MDN Server Timing API documentation: https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Server_timing

## Issues Found
- The browser setup used the older `new Resource(...)` and `provider.addSpanProcessor(...)` pattern. Updated it to the current OpenTelemetry JS 2.x API with `resourceFromAttributes(...)` and the `spanProcessors` provider constructor option.
- The install command omitted direct dependencies that the code imports, including `@opentelemetry/sdk-trace-base`, `@opentelemetry/instrumentation`, `@opentelemetry/api`, and `@opentelemetry/core`. Added them to the command.
- The CORS explanation said the browser would strip disallowed trace headers from preflight requests. Corrected this to explain that a cross-origin request with disallowed custom headers fails preflight and the actual request is blocked.
- The `Server-Timing` section claimed OpenTelemetry JavaScript fetch instrumentation reads `Server-Timing` trace data to create a more accurate parent-child relationship. Current official OpenTelemetry JS fetch/XHR instrumentation does not provide that behavior. Reframed the section as response timing metadata and clarified that trace correlation depends on request-side `traceparent` extraction.
- The checkout example ended child spans only after successful `fetch` calls. Wrapped each child span body in `try`/`finally` so spans are ended on errors.
- The React Router example claimed component-mounted fetches would automatically become children of the route span. Corrected the comment to note that fetches are children only when started while the route span is the active context.

## Review Notes
OpenTelemetry JavaScript browser instrumentation is still documented as experimental, and package APIs can change between releases. The corrected examples target the current 2.x OpenTelemetry JS SDK API as of this validation date.
