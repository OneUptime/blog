# Validation Summary: How to Handle Span Context Propagation in OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry context propagation
- W3C Trace Context
- W3C Baggage
- OpenTelemetry JavaScript SDK and API
- OpenTelemetry Python SDK and API
- Node.js and Express
- Python Flask
- Kafka / KafkaJS
- B3 propagation
- OpenTelemetry SDK environment variables

## Sources Consulted
- OpenTelemetry JavaScript propagation documentation: https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript context documentation: https://opentelemetry.io/docs/languages/js/context/
- OpenTelemetry JavaScript NodeSDKConfiguration API reference: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-node.NodeSDKConfiguration.html
- OpenTelemetry JavaScript `@opentelemetry/api` 1.9.1 package type definitions: https://registry.npmjs.org/@opentelemetry/api/-/api-1.9.1.tgz
- OpenTelemetry SDK environment variable documentation: https://opentelemetry.io/docs/languages/sdk-configuration/general/
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python CompositePropagator API reference: https://opentelemetry-python.readthedocs.io/en/latest/api/propagators.composite.html
- OpenTelemetry Python trace API reference: https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/

## Issues Found
- The W3C `traceparent` diagram said the version is "always 00". The current W3C version field is `00`, but the field is versioned for protocol evolution, so this was changed to "currently 00".
- The JavaScript HTTP client and Kafka examples used numeric span status codes (`0` and `2`). These were replaced with `SpanStatusCode.OK` and `SpanStatusCode.ERROR` from `@opentelemetry/api` to use the documented API constants.
- The JavaScript HTTP server example created the request span with `startSpan`, which does not make the span current. This made the example's claim that child spans would be linked to the request span unreliable. It now uses `startActiveSpan` for the request and child spans.
- The Python Flask server example started a request span but did not attach a context containing that span, so child spans in route handlers would not necessarily be children of the request span. It now starts the span with the extracted context and attaches `trace.set_span_in_context(span, ctx)`.
- The Python HTTP client example referenced `trace.Status` and `trace.StatusCode` indirectly. It now imports and uses `Status` and `StatusCode` directly from `opentelemetry.trace`.
- The JavaScript baggage example used a non-current `baggage` namespace API. It now uses the documented `propagation.createBaggage`, `propagation.setBaggage`, and `propagation.getBaggage` calls from `@opentelemetry/api`.
- The JavaScript HTTP client example imported Node's `https` module but used `fetch`. The unused import was removed.

## Review Notes
The post is technically relevant and accurate after the fixes above. Some HTTP and messaging semantic convention attribute names shown in examples are older-style names; they remain functional as custom span attributes, but future revisions could update them to the latest stable semantic convention names for stronger convention alignment.
