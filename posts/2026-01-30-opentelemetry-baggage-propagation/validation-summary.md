# Validation Summary: How to Create OpenTelemetry Baggage Propagation

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Baggage
- OpenTelemetry JavaScript API and SDK for Node.js
- W3C Baggage and Trace Context propagation
- Express HTTP services
- gRPC metadata propagation
- Kafka message headers
- OTLP trace export

## Sources Consulted
- OpenTelemetry Baggage API specification: https://opentelemetry.io/docs/specs/otel/baggage/api/
- W3C Baggage specification: https://www.w3.org/TR/baggage/
- OpenTelemetry JavaScript Node.js getting started docs: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- OpenTelemetry JavaScript exporters docs: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript resources docs: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript SDK 2.x upgrade guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry JavaScript TypeDoc for NodeSDK configuration and W3CBaggagePropagator: https://open-telemetry.github.io/opentelemetry-js/
- Current npm package metadata for @opentelemetry/api, @opentelemetry/sdk-node, @opentelemetry/resources, @opentelemetry/sdk-trace-base, and @opentelemetry/exporter-trace-otlp-http.

## Issues Found
- The post used a non-existent/currently incorrect `@opentelemetry/exporter-otlp-http` package for `OTLPTraceExporter`. Changed install commands and imports to `@opentelemetry/exporter-trace-otlp-http`.
- The post imported and used a non-existent `baggage` namespace from `@opentelemetry/api`. Updated examples to use the current JavaScript API: `propagation.createBaggage()` and `propagation.setBaggage()`.
- The Node.js setup used `new Resource(...)`, which is not the current OpenTelemetry JS 2.x resource construction pattern. Changed it to `resourceFromAttributes(...)`.
- The setup awaited `sdk.start()`, but current `NodeSDK.start()` returns `void`. Removed the `await` and made the helper synchronous.
- The custom span processor used the old `onStart(span)` shape and read from `context.active()`. Updated it to `onStart(span, parentContext)` and read baggage from the provided parent context.
- The span processor registration example used `provider.addSpanProcessor(...)`, which is no longer available on current `NodeTracerProvider`/`BasicTracerProvider`. Changed the example to register the processor via `NodeSDK({ spanProcessors: [...] })`.
- Several Express middleware examples used `context.with(extractedContext, () => next())`, which does not reliably keep the extracted context active for later middleware and route handlers. Updated those examples to bind `next` with `context.bind(...)`.
- Corrected the W3C baggage key/value explanation: keys are HTTP tokens, while values outside the allowed baggage value range are percent-encoded in the header.
- Removed precise unsourced performance estimates from the performance diagram and replaced them with qualitative descriptions.
- Fixed imports and comments affected by the API changes so the examples remain internally consistent.

## Review Notes
The examples are still illustrative and omit surrounding application setup such as declared Express/Kafka/gRPC client variables, service startup orchestration, and production error handling. A focused TypeScript check was run against current OpenTelemetry JavaScript packages to verify the corrected OpenTelemetry imports and method signatures.
