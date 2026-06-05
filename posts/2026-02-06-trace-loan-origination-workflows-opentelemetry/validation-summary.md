# Validation Summary: How to Trace Loan Origination System Workflows with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry distributed tracing
- OpenTelemetry Python SDK and API
- OpenTelemetry span links
- OpenTelemetry baggage
- OpenTelemetry metrics
- OTLP trace exporting
- Loan origination workflow observability

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python baggage API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/baggage.html
- OpenTelemetry baggage concepts documentation: https://opentelemetry.io/docs/concepts/signals/baggage/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry overview and SpanContext/linking concepts: https://opentelemetry.io/docs/reference/specification/overview/

## Issues Found
- The tracing setup imported and used `BatchSpanExporter`, which is not the current OpenTelemetry Python SDK span processor API. Changed it to `BatchSpanProcessor`, matching the official exporter setup documentation.
- The post said the loan application ID should be attached as baggage, but the first code sample did not actually set or attach baggage. Added `baggage.set_baggage("loan.id", loan_id)` and attached/detached that context around the asynchronous credit-pull trigger.
- The manual review example claimed a span would stay open until a callback after returning from a `with tracer.start_as_current_span(...)` block. In Python, the span closes when the `with` block exits. Updated the example to create a discrete assignment span and link the later decision callback back to that stored span context.

## Review Notes
- The examples use domain-specific placeholder functions such as `generate_loan_id`, `create_application`, and `store_span_context`; these are acceptable for a conceptual instrumentation guide.
- The metrics snippet uses the current OpenTelemetry Python metrics API method names. A production implementation would also configure a metrics SDK provider and exporter, but the snippet is focused on instrument creation and recording.
