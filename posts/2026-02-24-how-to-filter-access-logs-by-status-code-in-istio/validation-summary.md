# Validation Summary: How to Filter Access Logs by Status Code in Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Istio Telemetry API
- Envoy access logging
- Kubernetes kubectl
- CEL filter expressions

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Configure access logs with Telemetry API task: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio Envoy access logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio MeshConfig extension provider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Envoy access log filter reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/accesslog/v3/accesslog.proto

## Issues Found
- The health-check section introduced an expression as if it excluded health checks while keeping everything else, even though the post immediately explained that expression did not do that. I changed the wording to present it as a first attempt/pitfall.
- The sampling section claimed that multiple Telemetry access logging configurations could sample successful requests. Istio Telemetry access logging supports CEL filtering, but not built-in percentage sampling. I changed the wording to say the shown configuration separates error logs from a full stream and that sampling should happen downstream.

## Review Notes
- Istio's official Telemetry task notes that `response.code` may be absent when connections fail, so filters such as `response.code >= 500` are accurate for HTTP status-code filtering but will not include all connection-level failures unless expanded with an existence check.
