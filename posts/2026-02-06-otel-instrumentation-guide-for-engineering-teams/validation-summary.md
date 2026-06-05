# Validation Summary: How to Write an OpenTelemetry Instrumentation Guide for Your Engineering Team

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry JavaScript API
- OpenTelemetry Python API
- Distributed tracing
- Metrics
- Context propagation
- W3C Trace Context

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript instrumentation libraries documentation: https://opentelemetry.io/docs/languages/js/libraries/
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python propagation API reference: https://opentelemetry-python.readthedocs.io/en/latest/api/propagate.html
- OpenTelemetry semantic convention naming documentation: https://opentelemetry.io/docs/specs/semconv/general/naming/
- OpenTelemetry semantic conventions overview: https://opentelemetry.io/docs/specs/semconv/
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/

## Issues Found
- The post said automatic instrumentation is provided by the OpenTelemetry SDK out of the box. Current OpenTelemetry documentation distinguishes the SDK from instrumentation libraries and zero-code instrumentation, so I changed the wording to say automatic instrumentation comes from installed and registered instrumentation libraries or zero-code instrumentation.
- The metrics guidance said to always specify units in the metric description. OpenTelemetry semantic convention guidance treats units as part of metric instrument creation metadata, so I changed the sentence to say units should be specified in metric instrument metadata and included in descriptions when helpful.
- The Python propagation example imported `inject` from `opentelemetry.propagators`, which is not the current public import path used by the OpenTelemetry Python API. I changed it to `from opentelemetry.propagate import inject`.

## Review Notes
The TypeScript tracing example uses current OpenTelemetry JavaScript APIs, including `trace.getTracer`, `startActiveSpan`, `recordException`, and `SpanStatusCode.ERROR`. The W3C Trace Context header names `traceparent` and `tracestate` are correct. The custom naming conventions are reasonable as team-level conventions, but teams should still check OpenTelemetry semantic conventions first and avoid clashing with existing semantic convention namespaces.
