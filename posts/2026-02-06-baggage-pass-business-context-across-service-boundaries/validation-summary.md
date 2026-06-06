# Validation Summary: How to Use Baggage to Pass Business Context Across Service Boundaries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Baggage
- OpenTelemetry context propagation
- W3C Baggage
- W3C Trace Context
- Python OpenTelemetry API and SDK
- JavaScript OpenTelemetry API and SDK
- Flask
- Express
- OTLP trace exporting

## Sources Consulted
- OpenTelemetry Python baggage API: https://opentelemetry-python.readthedocs.io/en/latest/api/baggage.html
- OpenTelemetry Python propagate API: https://opentelemetry-python.readthedocs.io/en/latest/api/propagate.html
- OpenTelemetry Python trace propagation source docs: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/trace/propagation.html
- OpenTelemetry Python SpanProcessor source docs: https://opentelemetry-python.readthedocs.io/en/stable/_modules/opentelemetry/sdk/trace.html
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript W3CBaggagePropagator API docs: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_core.W3CBaggagePropagator.html
- OpenTelemetry context propagation concepts and security notes: https://opentelemetry.io/docs/concepts/context-propagation/
- W3C Baggage specification: https://www.w3.org/TR/baggage/

## Issues Found
- The Python setup example imported `TraceContextTextMapPropagator` from `opentelemetry.trace.propagation`, but the documented import path is `opentelemetry.trace.propagation.tracecontext`. Updated the import so the snippet uses the current public module path.
- The Python request handler said each `baggage.set_baggage` call returns a context token. The API returns an updated `Context`; `attach()` returns the token used by `detach()`. Updated the wording.
- The downstream Python snippet used `attach()` and `detach()` without importing them. Added `from opentelemetry.context import attach, detach`.
- The text said `CompositePropagator` was essential because otherwise only trace context gets propagated. OpenTelemetry Python defaults to `tracecontext,baggage`, so this was too broad. Updated the explanation to say the composite setup is important when overriding propagation settings.

## Review Notes
The examples remain partly illustrative and assume surrounding application code such as `authenticate`, `tracer`, `order_data`, and `call_inventory_service` exists. The W3C Baggage size discussion is directionally correct; the specification requires propagation up to 64 list-members and 8192 bytes and allows implementations to define higher limits.
