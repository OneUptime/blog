# Validation Summary: How to Configure Access Logging with Telemetry API in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Telemetry API
- Istio MeshConfig extension providers
- Envoy access logging
- OpenTelemetry access log service
- Kubernetes kubectl commands
- CEL access log filters

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Envoy Access Logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Configure access logs with Telemetry API task: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio OpenTelemetry access log provider task: https://istio.io/latest/docs/tasks/observability/logs/otel-provider/
- Istio Global Mesh Options / MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Envoy access log command operators reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- Envoy attributes reference for CEL expressions: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/advanced/attributes.html

## Issues Found
- The slow-request filter examples used `response.duration`, which is not an Envoy CEL attribute. Envoy exposes total request duration as `request.duration` with a duration type, so the examples now use `request.duration > duration('1s')` and `request.duration > duration('2s')`.
- The namespace and workload examples for disabling access logging entirely specified only the `envoy` provider. Istio's Telemetry API treats `disabled` as applying to the selected providers, so those examples could leave other configured access log providers enabled. Removed the provider list so the examples disable access logging for the selected scope.

## Review Notes
- The `telemetry.istio.io/v1` API version is current in Istio 1.30.
- The built-in `envoy` provider, custom `envoyFileAccessLog` provider, `envoyOtelAls` provider, `logFormat.labels`, and CEL filter field are documented in current Istio references.
- Istio documentation notes that `response.code` can be absent for some connection failures. The post's status-code filters remain valid for HTTP responses, but future revisions could mention `!has(response.code)` when the intent is to include connection failures as error logs.
