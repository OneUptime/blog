# Validation Summary: How to Correlate Sentry Error Events with OpenTelemetry Distributed Traces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python
- Sentry Python SDK
- Sentry Events API
- W3C Trace Context
- OTLP trace exporting
- Jaeger trace lookup

## Sources Consulted
- Sentry Python SDK quick start and initialization options: https://docs.sentry.io/platforms/python/
- Sentry Python SDK API documentation: https://getsentry.github.io/sentry-python/api.html
- Sentry Python SDK source/API docs for OpenTelemetry setup behavior: https://getsentry.github.io/sentry-python/_modules/sentry_sdk/client.html
- Sentry trace propagation documentation: https://docs.sentry.io/platforms/native/guides/wasm/tracing/trace-propagation
- Sentry Events API, "Retrieve an Event for a Project": https://docs.sentry.io/api/events/retrieve-an-event-for-a-project/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python tracing API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/

## Issues Found
- The setup snippet imported `OpenTelemetryIntegration` from `sentry_sdk.integrations.opentelemetry`, but current `sentry-sdk` does not export that class from that package path. Replaced the example with a `before_send` hook that reads the active OpenTelemetry span and attaches `otel_trace` context plus an `otel.trace_id` tag to Sentry events.
- The post stated that both Sentry and OpenTelemetry use W3C Trace Context headers. OpenTelemetry Python uses W3C Trace Context by default, while Sentry primarily propagates `sentry-trace` and `baggage` headers, with W3C interoperability depending on SDK/setup. Adjusted the claim to focus on carrying the same trace and span IDs in Sentry event data.
- The bidirectional linking snippet used `trace.StatusCode.ERROR`. Current OpenTelemetry Python examples import `Status` and `StatusCode` from `opentelemetry.trace` and call `span.set_status(Status(StatusCode.ERROR, ...))`. Updated the snippet accordingly.

## Review Notes
All Python code blocks were checked with `ast.parse` after edits. The examples still use placeholder functions and DSNs, so they are illustrative rather than directly runnable as a complete application.
