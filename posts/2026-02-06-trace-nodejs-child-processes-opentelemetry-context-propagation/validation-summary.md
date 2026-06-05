# Validation Summary: How to Trace Node.js Child Processes with OpenTelemetry Context Propagation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry context propagation
- W3C Trace Context
- Node.js child_process spawn and fork
- TypeScript
- Node.js process environment variables and IPC messaging

## Sources Consulted
- OpenTelemetry JavaScript propagation documentation: https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry API propagators specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry environment variables as context propagation carriers specification: https://opentelemetry.io/docs/specs/otel/context/env-carriers/
- OpenTelemetry JavaScript SpanStatusCode API reference: https://open-telemetry.github.io/opentelemetry-js/enums/_opentelemetry_api._opentelemetry_api.SpanStatusCode.html
- Node.js child_process documentation: https://nodejs.org/api/child_process.html
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/

## Issues Found
- The tracing setup used `new Resource(...)` from `@opentelemetry/resources`, which is not exported by the current OpenTelemetry JavaScript resources package. Updated the example to use `resourceFromAttributes()` with `ATTR_SERVICE_NAME` and `ATTR_SERVICE_VERSION`, matching current OpenTelemetry JavaScript documentation.
- The context propagation utility imported unused OpenTelemetry types and instantiated an unused `W3CTraceContextPropagator`. Removed those imports and the unused instance; the examples use the registered OpenTelemetry propagator via `propagation.inject()` and `propagation.extract()`.
- Several examples used raw numeric span status codes (`1` and `2`). Replaced them with `SpanStatusCode.OK` and `SpanStatusCode.ERROR` so the code uses the public OpenTelemetry API instead of relying on enum numeric values.
- Child worker task spans were started without passing the active context, so they could become root spans instead of children of the extracted process context. Updated nested task spans to use `otelContext.active()`.
- The worker process exited immediately after ending spans without shutting down the SDK, risking unflushed telemetry. Updated the worker to keep the SDK returned by `initializeTracing()` and await `sdk.shutdown()` before `process.exit()`.
- The IPC worker could pass `null` as the parent context to `tracer.startSpan()`, which does not match the current TypeScript API. Updated it to pass `undefined` when no base context exists.
- The process pool stored queued tasks without their own spans, then reused the completed task span when dispatching queued work. Updated the queue to store each task's span and use it when the task is eventually assigned.
- The process pool returned a worker to the available list before immediately assigning it to a queued task, which could duplicate worker availability. Updated the logic so a worker is only returned to the available list when no queued task is dispatched.
- The process pool timeout path rejected the task without ending the span or removing the message listener. Updated it to mark the span as error, end it, and remove the listener.

## Review Notes
- Verified the TypeScript code blocks by extracting them into temporary files and running `tsc --noEmit` against current OpenTelemetry packages.
- The custom `OTEL_TRACE_PARENT` and `OTEL_TRACE_STATE` environment variables are application-defined carrier fields in this tutorial, not standardized OpenTelemetry SDK configuration variables.
