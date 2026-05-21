# Validation Summary: How to Write Telemetry API Configuration (Cheat Sheet)

## Status
validated

## Post Type
Reference / Cheat Sheet

## Technologies Covered
- Istio Telemetry API
- Kubernetes YAML custom resources
- Istio access logging
- Istio metrics
- Istio distributed tracing
- OpenTelemetry and Zipkin providers
- CEL expressions

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API overview: https://istio.io/latest/docs/tasks/observability/telemetry/
- Istio Envoy Access Logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Configure access logs with Telemetry API task: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio Configure trace sampling task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio Zipkin tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/zipkin/
- Istio OpenTelemetry tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio MeshConfig extension provider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/

## Issues Found
- The mesh-wide scope wording implied that `istio-system` is always the mesh root namespace. Updated it to say the Istio root configuration namespace, usually `istio-system`, which matches Istio's documented hierarchy.
- Metric tag override examples used plain YAML strings such as `value: "production"` for `tagOverrides.value`. Istio treats this field as a CEL expression, so literal strings need to be CEL string literals. Updated those examples to `value: "'production'"` and `value: "'cluster-east-1'"`.
- Several metric tag removal examples referenced labels that are not current standard Istio metric labels, including `request_path`, `destination_ip`, `source_ip`, and `request_host`. Replaced them with documented labels such as `response_code`, `source_principal`, `destination_principal`, and `response_flags`.
- The tracing examples used a `zipkin` provider without stating that the provider must be configured. Added a note that `zipkin` must be configured in mesh config extension providers.

## Review Notes
The examples use `apiVersion: telemetry.istio.io/v1`, which is current for Istio v1 APIs. Access logging filters and tracing sampling examples match the current Telemetry API model. Tracing provider names such as `zipkin` and `otel-tracing` are installation-specific and must correspond to MeshConfig extension provider names.
