# Validation Summary: How to Trace Cross-Origin API Requests from Browser to Backend

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- OpenTelemetry JavaScript browser SDK
- OpenTelemetry Fetch and XMLHttpRequest instrumentation
- OpenTelemetry Node.js SDK and HTTP/Express instrumentation
- OpenTelemetry Python Django instrumentation
- W3C Trace Context and Baggage propagation
- CORS request and response headers
- Express `cors` middleware
- Nginx CORS header configuration

## Sources Consulted
- OpenTelemetry JS `@opentelemetry/sdk-trace-web` documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-trace-web.html
- OpenTelemetry JS `@opentelemetry/resources` documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry JS Fetch instrumentation config: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_instrumentation-fetch.FetchInstrumentationConfig.html
- OpenTelemetry JS `PropagateTraceHeaderCorsUrls` type: https://open-telemetry.github.io/opentelemetry-js/types/_opentelemetry_sdk-trace-web.PropagateTraceHeaderCorsUrls.html
- OpenTelemetry JS Node tracer provider documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-trace-node.html
- MDN CORS guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- MDN `Access-Control-Allow-Headers` reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Headers
- Express `cors` middleware documentation: https://expressjs.com/en/resources/middleware/cors/
- Nginx `add_header` directive documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- W3C Baggage specification: https://www.w3.org/TR/baggage/
- W3C Trace Response Headers editor's draft: https://w3c.github.io/trace-response-headers/
- OpenTelemetry Python Django instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/django/django.html
- OpenTelemetry Python SDK resources documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/resources.html
- OpenTelemetry Python SDK span export documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html

## Issues Found
- The browser and Node.js OpenTelemetry snippets used `new Resource(...)` and `provider.addSpanProcessor(...)`, which are not correct for the current OpenTelemetry JS API. Updated them to use `resourceFromAttributes(...)` and provider constructor `spanProcessors`.
- The CORS explanation said browsers strip disallowed trace headers from the actual request. Updated it to explain that browsers fail the preflight and block the actual cross-origin request with those headers.
- The `traceresponse` wording implied the browser SDK reads it automatically and that it is part of the normal response. Updated the post to describe it as an optional draft response header for custom correlation code.
- The multiple-origin regex construction only escaped dots and was not anchored, which could match unintended hosts. Updated it to escape regex metacharacters and anchor matches to the configured origin.
- The `ignoreUrls` explanation claimed missing ignore rules would create an infinite loop of traces. Updated it to the safer and more accurate claim that it avoids unwanted telemetry/monitoring spans.

## Review Notes
- The OpenTelemetry Fetch instrumentation package is marked experimental in the official docs, so future breaking changes are possible.
- The `ZoneContextManager` documentation notes that it does not work with code targeting ES2017+ unless transpiled back to ES2015; this is a version/build-target caveat to consider for production apps.
