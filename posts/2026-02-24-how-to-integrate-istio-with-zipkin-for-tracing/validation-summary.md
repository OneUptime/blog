# Validation Summary: How to Integrate Istio with Zipkin for Tracing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Zipkin
- Envoy distributed tracing
- Kubernetes
- Istio Telemetry API
- IstioOperator
- B3 and W3C trace context headers
- Node.js / Express / Axios
- Java Spring Boot / RestTemplate
- Go net/http
- Elasticsearch-backed Zipkin storage

## Sources Consulted
- Istio Zipkin distributed tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/zipkin/
- Istio Telemetry API tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/telemetry-api/
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio distributed tracing FAQ: https://istio.io/latest/about/faq/distributed-tracing/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio Zipkin integration docs: https://istio.io/latest/docs/ops/integrations/zipkin/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- OpenZipkin server documentation: https://github.com/openzipkin/zipkin
- OpenZipkin Dependencies documentation: https://github.com/openzipkin/zipkin-dependencies

## Issues Found
- The IstioOperator example mixed the current Telemetry API extension provider configuration with legacy `defaultConfig.tracing.zipkin.address` and `sampling` fields. Updated it to match Istio's current Zipkin tracing example by using `defaultConfig.tracing: {}` and defining the Zipkin `extensionProviders` entry.
- The manual Zipkin UI URL used `http://localhost:9411`. Updated it to `http://localhost:9411/zipkin`, which is the documented Zipkin UI path.
- The dependency graph section implied the graph is always available once Zipkin receives spans. Added the requirement to run `zipkin-dependencies` when using persistent storage such as Elasticsearch or Cassandra, because dependency links must be aggregated for the UI.
- The production storage section recommended Elasticsearch or Cassandra but did not mention the matching `zipkin-dependencies` job for dependency graphs. Added a short note to run it against the same backend when dependency graph support is needed.

## Review Notes
The examples are suitable as tutorial snippets, but production users should pin container image versions instead of using `openzipkin/zipkin:latest`, configure authentication/TLS for persistent storage where required, and prefer application tracing libraries such as OpenTelemetry for header propagation in larger services.
