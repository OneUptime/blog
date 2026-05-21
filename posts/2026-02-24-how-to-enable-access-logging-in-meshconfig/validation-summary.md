# Validation Summary: How to Enable Access Logging in MeshConfig

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio MeshConfig
- Istio Telemetry API
- Envoy access logs
- OpenTelemetry access log service
- Kubernetes kubectl logs
- CEL filter expressions

## Sources Consulted
- Istio Envoy Access Logs documentation: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Configure access logs with Telemetry API documentation: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Global Mesh Options reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio OpenTelemetry access log provider documentation: https://istio.io/latest/docs/tasks/observability/logs/otel-provider/
- Istio v1 APIs announcement: https://istio.io/latest/blog/2024/v1-apis/
- Envoy access log response flags documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- Envoy attributes documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/advanced/attributes.html

## Issues Found
- Updated Telemetry API examples that do not use alpha-only fields from `telemetry.istio.io/v1alpha1` to `telemetry.istio.io/v1`, because Istio promoted the Telemetry API to `v1` in Istio 1.22 and current docs use `v1` for stable access logging examples.
- Left Telemetry examples that use `accessLogging.filter` on `telemetry.istio.io/v1alpha1`, because Istio notes that `accessLogging.filter` was not promoted as a stable `v1` field.
- Changed slow-request CEL filters from `response.duration` to `request.duration`, because Envoy exposes total request duration as `request.duration`.
- Changed error filter examples to include `!has(response.code)` where appropriate, because Istio documents that `response.code` is absent when connections fail.
- Corrected the `UAEX` response flag description from outbound-policy blocking to denial by an external authorization service, matching Envoy's response flag documentation.
- Clarified that HTTP status codes such as 404 and 403 are not always Istio routing or authorization failures by themselves; the response flags and response code details provide the proxy-level cause.
- Combined the stdout and OpenTelemetry provider example into a single provider list, which matches the Telemetry API's provider list model.

## Review Notes
The post is technically relevant and the MeshConfig, `istioctl install`, `kubectl logs`, OpenTelemetry provider, and access log encoding examples align with current Istio documentation after the corrections above.
