# Validation Summary: How to Trace Order Fulfillment Across Microservices with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Python tracing API
- OpenTelemetry Python context propagation
- W3C Trace Context propagation
- OpenTelemetry Collector OTLP receiver and OTLP exporter
- OpenTelemetry Collector tail sampling processor
- OpenTelemetry Python metrics API
- Distributed tracing across asynchronous message brokers

## Sources Consulted
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Propagators API specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector groupbytrace processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/groupbytraceprocessor

## Issues Found
- The Python examples imported `TraceContextTextMapPropagator` from `opentelemetry.trace.propagation`, but the documented import path is `opentelemetry.trace.propagation.tracecontext`. Updated all snippets to use the documented import.
- The Python examples used `span.set_status(trace.StatusCode.ERROR, "...")`. Updated these examples to import `Status` and `StatusCode` and call `span.set_status(Status(StatusCode.ERROR, "..."))`, matching the official Python instrumentation examples.
- The payment failure branch published an event with `next_headers` before defining it. Added header creation and trace-context injection in that branch.
- The warehouse scan docstring described span events and span links, but the code created a child span and did not use links. Updated the docstring to match the code and removed the unused `Link` import.
- The warehouse example retrieved stored trace context later but never showed where it was stored during stock reservation. Added `store_trace_context(order_id)` after the warehouse fulfillment span becomes current.
- The trace context storage snippet used `json.dumps` and `json.loads` without importing `json`. Added the missing import.
- The Collector config used `groupbytrace` before `tail_sampling` and described it as required. Current tail sampling documentation states that `tail_sampling` groups spans by trace ID internally and can be used without `groupbytrace`. Removed `groupbytrace` from the config and updated the explanation.
- The Collector text said the sampling strategy keeps "complete traces" for long-running fulfillment flows. Adjusted the wording because tail sampling makes decisions after `decision_wait`, and very late spans require careful routing and buffering.
- The message-broker propagation explanation said standard HTTP header propagation does not work. Reworded it to clarify that automatic HTTP instrumentation usually does not cover broker messages, while explicit text-map propagation through message headers is still valid.

## Review Notes
The examples remain illustrative and depend on application-specific functions such as `publish_event`, `generate_order_id`, and `db.execute`. For production systems, long-running fulfillment traces need careful Collector sizing, trace-ID-based routing when multiple collectors are deployed, and a `decision_wait`/cache strategy that accounts for late-arriving spans.
