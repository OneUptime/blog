# Validation Summary: How to Implement Context Management in OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry JavaScript API and SDK
- OpenTelemetry Python API
- Context propagation
- Distributed tracing
- W3C Trace Context
- W3C Baggage
- B3 propagation
- Express
- Flask
- Node.js async context
- Python asyncio

## Sources Consulted
- OpenTelemetry JavaScript Context documentation: https://opentelemetry.io/docs/languages/js/context/
- OpenTelemetry JavaScript Instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript API reference: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_api.html
- OpenTelemetry JavaScript Core reference: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_core.html
- OpenTelemetry Node SDK reference: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry Python Cookbook: https://opentelemetry.io/docs/languages/python/cookbook/
- OpenTelemetry Python propagation API reference: https://opentelemetry-python.readthedocs.io/en/latest/api/propagate.html
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Context Propagation concepts: https://opentelemetry.io/docs/concepts/context-propagation/
- OpenTelemetry Flask instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html

## Issues Found
- The introduction described OpenTelemetry Context as carrying only Trace ID, Span ID, and Trace Flags. Updated the wording to clarify that Context is broader, and that those fields are part of the tracing SpanContext stored in Context.
- JavaScript examples used raw status code value `2` for errors. Replaced those with `SpanStatusCode.ERROR` from `@opentelemetry/api`, matching the public API.
- The Python Flask example imported `propagation` from `opentelemetry`, but Python uses `opentelemetry.propagate.extract` for the global propagator API. Updated the import and extraction call.
- The Python Flask example attached `trace.set_span_in_context(span)` without preserving the extracted remote context. Changed it to `trace.set_span_in_context(span, ctx)` so baggage and other extracted context values are retained.
- The JavaScript baggage example used a non-existent `baggage` export and methods such as `baggage.active()`. Replaced it with the current `propagation.createBaggage`, `propagation.setBaggage`, and `propagation.getBaggage` APIs.
- The JavaScript baggage request function did not return or await the async callback passed to `context.with`. Changed it to an `async` function that returns the `context.with` result.
- Clarified that W3C Trace Context is the default for trace context, while Node SDK defaults use a composite propagator that includes W3C Trace Context and Baggage.

## Review Notes
The manual Express and Flask examples are technically valid for demonstrating context extraction, but production applications should usually prefer the official OpenTelemetry instrumentation packages for framework integrations where possible.
