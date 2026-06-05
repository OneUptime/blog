# Validation Summary: How to Trace Online Exam Proctoring System Workflows with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry metrics
- Python OpenTelemetry API
- JavaScript OpenTelemetry API
- Distributed tracing for online exam proctoring workflows

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API reference: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry JavaScript documentation: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry JavaScript API reference for Tracer and Span: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Tracer.html and https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Span.html
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/

## Issues Found
- The Python identity verification snippet imported `StatusCode` but not `Status`, and called `span.set_status(StatusCode.ERROR, "...")`. The current OpenTelemetry Python documentation demonstrates setting error status with `Status(StatusCode.ERROR)`, and the trace API documents `Status` as the status object. Updated the import to include `Status` and changed the call to `span.set_status(Status(StatusCode.ERROR, "No face detected in webcam frame"))`.

## Review Notes
- The JavaScript examples correctly use `@opentelemetry/api`, `trace.getTracer`, `tracer.startSpan`, `span.addEvent`, `span.setAttribute`, and `span.end` according to the official API reference. In production browser instrumentation, context propagation and SDK setup would also be required to export and correlate spans.
- The metrics snippet uses current OpenTelemetry Python meter APIs and appropriate instrument types for active session counts and latency histograms. The post defines instruments but does not show recording values, which is acceptable for this overview.
