# Validation Summary: How to Set Up Distributed Tracing with Istio and Jaeger

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio service mesh
- Jaeger distributed tracing
- OpenTelemetry Protocol (OTLP)
- Kubernetes manifests and services
- Istio Telemetry API and IstioOperator
- Envoy trace context propagation
- Prometheus alerting rules
- Python Flask, Node.js Express, and Go HTTP examples

## Sources Consulted
- Istio Jaeger tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/jaeger/
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio tracing with Telemetry API: https://istio.io/latest/docs/tasks/observability/distributed-tracing/telemetry-api/
- Istio trace sampling documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Jaeger Kubernetes deployment documentation: https://www.jaegertracing.io/docs/2.19/deployment/kubernetes/
- Jaeger v1 Operator documentation: https://www.jaegertracing.io/docs/1.76/deployment/operator/
- Jaeger v1 deployment and CLI documentation: https://www.jaegertracing.io/docs/1.76/deployment/
- Jaeger Service Performance Monitoring documentation: https://www.jaegertracing.io/docs/1.76/deployment/spm/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- B3 propagation specification: https://github.com/openzipkin/b3-propagation
- Prometheus PromQL operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- Corrected the tracing architecture explanation: Envoy proxies generate/report spans and inject trace headers, but applications must forward headers on downstream calls for trace correlation.
- Updated Istio Telemetry resources from `telemetry.istio.io/v1alpha1` to the stable `telemetry.istio.io/v1` API.
- Removed an incorrect `defaultProviders` verification command and aligned the IstioOperator example with current extension-provider guidance, including `defaultConfig.tracing: {}`.
- Updated the Jaeger all-in-one image from `1.53` to `1.76.0` and removed the misleading `METRICS_STORAGE_TYPE=prometheus` setting from the development deployment.
- Added the Jaeger v1/operator caveat and cert-manager prerequisite; current Jaeger documentation recommends Jaeger v2 with the OpenTelemetry Operator or Helm chart for new Kubernetes deployments.
- Corrected trace header guidance by removing obsolete/non-recommended headers and marking the header list as text instead of YAML.
- Fixed the Flask example so it returns a JSON-serializable list instead of `[...]`.
- Updated the Bookinfo reviews workload to use `reviews-v2`, which actually calls the ratings service.
- Added hostname fallback for ingress gateway discovery when a cloud load balancer exposes DNS instead of an IP address.
- Corrected sampling language so sampled requests, not every request, are described as producing traces.
- Fixed the propagation-format IstioOperator example to use `opentelemetry.context` and `maxTagLength`.
- Reworked Prometheus alert examples to use spanmetrics-generated metrics and valid PromQL aggregation syntax.
- Removed the inaccurate "100% sampling for error responses" Telemetry resource because Istio percentage sampling does not sample based on response status by itself.
- Changed the troubleshooting connectivity check to target the OTLP HTTP port instead of sending HTTP traffic to the OTLP gRPC port.

## Review Notes
- Python snippets passed `py_compile`, JavaScript passed `node --check`, and YAML blocks parsed successfully with PyYAML.
- Go tooling was not installed in the workspace, so the Go example was reviewed by inspection rather than compiled.
- The Jaeger Operator examples are now framed as Jaeger v1 legacy guidance. A future update could add a full Jaeger v2/OpenTelemetry Operator path, but that would be a larger rewrite beyond validation fixes.
- The alerting section now assumes an OpenTelemetry Collector spanmetrics connector pipeline; the post does not include the full collector configuration.
