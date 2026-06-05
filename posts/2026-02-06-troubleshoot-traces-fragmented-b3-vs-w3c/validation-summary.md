# Validation Summary: How to Troubleshoot Traces Breaking into Disconnected Fragments When One

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry context propagation
- W3C Trace Context
- W3C Baggage
- Zipkin B3 single-header and multi-header propagation
- OpenTelemetry Python propagators
- OpenTelemetry Go propagators
- Kubernetes `kubectl exec`
- Istio distributed tracing

## Sources Consulted
- OpenTelemetry Propagators API specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python B3 propagator source: https://github.com/open-telemetry/opentelemetry-python/blob/main/propagator/opentelemetry-propagator-b3/src/opentelemetry/propagators/b3/__init__.py
- OpenTelemetry Go B3 propagator package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/propagators/b3
- OpenTelemetry Go propagation package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/propagation
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- B3 propagation specification: https://github.com/openzipkin/b3-propagation

## Issues Found
- The diagnostic middleware did not include several B3 multi-header fields. Added `x-b3-parentspanid`, `x-b3-sampled`, and `x-b3-flags` so the example covers the B3 multi-header fields documented by OpenTelemetry and Istio.
- The example outgoing propagation headers used abbreviated trace and span IDs with ellipses, which are not valid `traceparent` or B3 values. Replaced them with syntactically valid 32-hex-character trace ID and 16-hex-character span ID examples.
- The Collector/service mesh section suggested propagation header translation that is not supported by the OpenTelemetry Collector and is not how Istio documents tracing propagation. Rewrote the section to state that the Collector does not rewrite service-to-service HTTP propagation headers, and that service mesh users still need applications to forward trace headers.

## Review Notes
The composite propagator examples for Python and Go align with current OpenTelemetry APIs. For Python, `B3MultiFormat` is valid in the current B3 propagator package; the older `B3Format` class exists but is deprecated in favor of `B3MultiFormat`.
