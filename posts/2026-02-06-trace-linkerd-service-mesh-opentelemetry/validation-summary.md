# Validation Summary: How to Trace Linkerd Service Mesh with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linkerd service mesh
- OpenTelemetry JavaScript SDK
- OpenTelemetry Collector
- OpenTelemetry context propagation
- B3 propagation
- W3C Trace Context
- Kubernetes
- Prometheus scraping
- Node.js and Express instrumentation

## Sources Consulted
- Linkerd distributed tracing documentation: https://linkerd.io/2.18/tasks/distributed-tracing/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript OTLP gRPC trace exporter documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-trace-otlp-grpc.html
- OpenTelemetry JavaScript B3 propagator API reference: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_propagator-b3.B3Propagator.html
- OpenTelemetry propagators specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry Collector exporter documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector Kubernetes attributes documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector Kubernetes attributes processor reference: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/k8sattributesprocessor
- OpenTelemetry Collector logging exporter deprecation reference: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/loggingexporter

## Issues Found
- The post said Linkerd's proxy does not create trace spans and that every span comes from application code. Linkerd documentation states that the proxy can participate in traces and emit proxy spans when tracing is configured and B3 propagation is used. Updated the explanation to distinguish application spans from Linkerd proxy spans.
- The post said Linkerd supports both B3 and W3C Trace Context for active tracing and that W3C propagation works out of the box in Linkerd 2.14 or later. Current Linkerd documentation says Linkerd actively participates only in B3 traces, while unknown headers such as W3C Trace Context are forwarded transparently. Updated the propagation guidance accordingly.
- The Node.js setup used `new Resource(...)` and `SemanticResourceAttributes`, which do not match current OpenTelemetry JavaScript documentation. Updated the snippet to use `resourceFromAttributes()` with `ATTR_SERVICE_NAME` and `ATTR_SERVICE_VERSION`.
- The Node.js setup used `grpc://otel-collector.observability:4317` for the OTLP gRPC exporter. The OpenTelemetry JavaScript OTLP gRPC exporter expects an `http` or `https` URL such as `http://otel-collector.observability:4317`. Updated the endpoint.
- The Node.js setup did not configure B3 propagation even though Linkerd proxy trace participation requires B3. Added `@opentelemetry/propagator-b3` with B3 multi-header injection and kept W3C Trace Context propagation for interoperability.
- The header verification command searched Linkerd proxy logs for `traceparent`, but proxy logs are not a reliable way to verify header forwarding and W3C headers do not make Linkerd proxy spans participate. Updated the example to check receiving application logs or debug output for `x-b3-traceid`.
- The Collector example used the deprecated `logging` exporter with deprecated `loglevel`, and it was not included in the trace pipeline despite the comment saying spans would be logged. Replaced it with the current `debug` exporter using `verbosity` and added it to the trace pipeline exporters.

## Review Notes
- The OpenTelemetry Collector `k8s_attributes`, `resource`, `batch`, OTLP receiver/exporter, and Prometheus receiver snippets match current Collector configuration patterns. The Kubernetes attributes processor requires a Collector distribution that includes the contrib `k8sattributesprocessor` and appropriate Kubernetes RBAC.
- The Prometheus receiver snippet is structurally valid for scraping Linkerd proxy metrics on the admin port, but a production deployment should also include a metrics pipeline and appropriate RBAC/service discovery permissions.
