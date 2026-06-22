# Validation Summary: How to Handle Baggage Propagation in OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry JavaScript API
- OpenTelemetry JavaScript SDK for Node.js
- W3C Trace Context propagation
- W3C Baggage propagation
- Express.js
- Node.js HTTP, HTTPS, Undici, and fetch clients

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript propagation documentation: https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry Baggage API specification: https://opentelemetry.io/docs/specs/otel/baggage/api/
- OpenTelemetry Context Propagators API specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- W3C Baggage specification: https://www.w3.org/TR/baggage/
- OpenTelemetry JavaScript API TypeDoc: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_api.html
- OpenTelemetry JavaScript Core TypeDoc for `CompositePropagator` and `W3CBaggagePropagator`: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_core.CompositePropagator.html and https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_core.W3CBaggagePropagator.html
- OpenTelemetry Node SDK TypeDoc: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry HTTP instrumentation README: https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/opentelemetry-instrumentation-http
- OpenTelemetry Undici instrumentation package documentation: https://www.npmjs.com/package/@opentelemetry/instrumentation-undici
- Current npm package metadata and type declarations for `@opentelemetry/api`, `@opentelemetry/core`, `@opentelemetry/sdk-trace-node`, `@opentelemetry/instrumentation-http`, `@opentelemetry/instrumentation-express`, and `@opentelemetry/instrumentation-undici`.

## Issues Found
- The setup example used `fetch` later in the post but only registered `@opentelemetry/instrumentation-http`. Current HTTP instrumentation covers `node:http` and `node:https`; Node.js `fetch` is covered by `@opentelemetry/instrumentation-undici`. Added `UndiciInstrumentation` to setup and clarified the HTTP client section.
- The baggage metadata example passed a plain string as metadata. The OpenTelemetry JavaScript API exposes `baggageEntryMetadataFromString()` for serializable baggage metadata. Updated the import and metadata example.
- The first baggage code block imported a nonexistent/unused `baggage` binding from `@opentelemetry/api`. Removed it and imported the correct metadata helper.
- The Express route used numeric span status codes. The numeric values were technically mapped to OpenTelemetry status codes, but the example set success to `0` (`UNSET`) while intending success. Updated the example to use `SpanStatusCode.OK` and `SpanStatusCode.ERROR`.
- The Express section described the snippet as a "complete example" while it relied on placeholder downstream service functions. Changed the wording to "an example".
- The async pitfall said context is lost in `setTimeout`. With the default OpenTelemetry Node context manager, timer callbacks generally preserve async context. Reworded the pitfall to cover unbound callbacks invoked outside the active context and kept the capture/restore guidance.

## Review Notes
- The post remains version-general. The review used current OpenTelemetry JavaScript package versions as of 2026-06-19 because the post does not pin versions.
- `NodeTracerProvider.register()` remains available in the current `@opentelemetry/sdk-trace-node` package, and it defaults to a composite W3C Trace Context plus Baggage propagator when no propagator is provided.
- For production code, avoid placing sensitive or high-cardinality values in baggage unless they are explicitly intended to cross service boundaries.
