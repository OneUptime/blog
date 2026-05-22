# Validation Summary: How to Configure Access Log Settings in MeshConfig

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio MeshConfig
- Istio Telemetry API
- Envoy access logs
- OpenTelemetry access log service providers
- Kubernetes ConfigMaps and kubectl logs

## Sources Consulted
- Istio Envoy Access Logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Configure access logs with Telemetry API task: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Global Mesh Options reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Envoy access log usage and command operators: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage
- Envoy attributes reference for CEL expressions: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/advanced/attributes.html

## Issues Found
- Updated Telemetry API snippets from `telemetry.istio.io/v1alpha1` to `telemetry.istio.io/v1`, matching Istio's current stable Telemetry API examples and reference documentation.
- Changed the namespace filter from `response.duration > duration('1s')` to `request.duration > duration('1s')` because Envoy documents `request.duration` as the total request duration attribute available after request completion.
- Corrected the `UAEX` response flag description. Envoy defines `UAEX` as a request denied by the external authorization service, not as an Istio `REGISTRY_ONLY` outbound traffic condition.
- Fixed the sampling example. `request.id` is a string attribute, so `request.id % 10 == 0` is not a valid CEL numeric modulo expression. The example now uses the documented unsigned `connection.id` attribute with explicit `uint` literals.

## Review Notes
The post is technically relevant and the MeshConfig, access log encoding, custom format string, provider configuration, and kubectl examples are consistent with current Istio and Envoy documentation. The sampling example is a rough connection-ID-based filter, not true random request sampling; future revisions could discuss that distinction in more depth.
