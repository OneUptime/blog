# Validation Summary: How to Avoid the Anti-Pattern of Instrumenting Every Function Instead of

## Status
validated

## Post Type
Best-practice guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python tracing API
- Distributed tracing
- Span attributes and span events
- Trace sampling and export

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry trace concepts documentation: https://opentelemetry.io/docs/concepts/signals/traces/
- OpenTelemetry Python trace API reference: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html

## Issues Found
- The post said every span is transmitted to the Collector. OpenTelemetry supports sampling, and spans may be exported to a configured backend directly or through a Collector. Changed this to say every sampled span is exported to the configured backend or Collector.
- The post said anything faster than 1ms is noise. This was too absolute for a best-practice guideline. Changed it to say sub-millisecond operations are usually noise unless business-critical.
- The attributes/events example used a payment gateway call as an event. Since payment processing is I/O-bound and business-critical, it should normally be represented by a span under the post's own criteria and OpenTelemetry's guidance that spans are for operations with start and end times. Changed the example to record a calculation event instead.

## Review Notes
The Python examples use current OpenTelemetry APIs, including `trace.get_tracer`, `tracer.start_as_current_span`, `span.set_attribute`, and `span.add_event`. The article's span-count recommendations are presented as operational guidance rather than a formal OpenTelemetry rule.
