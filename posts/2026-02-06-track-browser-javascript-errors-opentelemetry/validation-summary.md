# Validation Summary: How to Track Browser JavaScript Errors with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry Web Tracer Provider
- OpenTelemetry OTLP HTTP trace exporter
- OpenTelemetry semantic conventions
- Browser JavaScript error handling
- Fetch API
- React error boundaries

## Sources Consulted
- OpenTelemetry JavaScript documentation: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry Web SDK API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-trace-web.html
- OpenTelemetry WebTracerProvider API docs: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-trace-web.WebTracerProvider.html
- OpenTelemetry Resources API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry exception recording specification: https://opentelemetry.io/docs/specs/otel/trace/exceptions/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry code attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/code/
- MDN Window error event documentation: https://developer.mozilla.org/en-US/docs/Web/API/Window/error_event
- MDN Window unhandledrejection event documentation: https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event
- MDN Fetch API documentation: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
- React Component and Error Boundary documentation: https://react.dev/reference/react/Component

## Issues Found
- The OpenTelemetry setup used `new Resource(...)`, but current OpenTelemetry JavaScript exposes `Resource` as an interface and documents `resourceFromAttributes(...)` for creating resources. Updated the import and provider configuration.
- The setup used `provider.addSpanProcessor(...)`, but current `WebTracerProvider` examples configure processors with the `spanProcessors` constructor option. Updated the snippet accordingly.
- The text described `ZoneContextManager` as critical without mentioning the official ES2017+ caveat. Updated the explanation to call it useful for async context and note the ES2015 transpilation requirement.
- Several span attributes used deprecated or outdated semantic convention names, including `code.filepath`, `code.lineno`, `code.column`, `http.method`, `http.url`, and `http.status_code`. Updated them to `code.file.path`, `code.line.number`, `code.column.number`, `http.request.method`, `url.full`, and `http.response.status_code`.
- The fetch wrapper did not handle `URL` inputs correctly and ignored the method on `Request` inputs. Updated URL and method extraction to cover string, `Request`, and `URL` inputs.
- The network error snippet imported unused OpenTelemetry API symbols. Removed the unused imports.
- The user context snippet imported `tracer` but never used it. Removed the unused import.
- The final startup snippet imported and called `initTracing`, but the setup snippet exports only `tracer` and initializes tracing as a module side effect. Updated the startup snippet to import `./tracing/init` directly.

## Review Notes
- Browser-side OpenTelemetry support is documented as experimental and mostly unspecified. The post is still technically relevant, but future readers may need to adjust examples for specific OpenTelemetry JS versions and bundler targets.
- The fetch wrapper is suitable for a tutorial, but production applications should avoid double-instrumenting requests if OpenTelemetry fetch instrumentation is already enabled.
