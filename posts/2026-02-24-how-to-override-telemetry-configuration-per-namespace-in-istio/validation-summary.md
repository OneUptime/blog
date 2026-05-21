# Validation Summary: How to Override Telemetry Configuration per Namespace in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Telemetry API
- Kubernetes custom resources
- Istio MeshConfig extension providers
- Envoy access logging, metrics, and tracing
- `kubectl`
- `istioctl`

## Sources Consulted
- Istio Telemetry API task documentation: https://istio.io/latest/docs/tasks/observability/telemetry/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio metrics customization with Telemetry API: https://istio.io/latest/docs/tasks/observability/metrics/telemetry-api/
- Istio access logging with Telemetry API: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio `istioctl` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio MeshConfig extension provider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Envoy CEL attributes reference: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/advanced/attributes

## Issues Found
- The post incorrectly said mesh-wide and namespace-level Telemetry resources must be named `default`. Istio requires a single selector-less Telemetry resource for those scopes, but the Kubernetes resource name can vary. Updated the hierarchy and gotcha text accordingly.
- The post described merge behavior as per-section and said tracing must be fully specified. Istio inheritance is field-based: specified fields override inherited fields, while unspecified fields continue to inherit. Updated the explanation and gotcha text.
- The full access logging example used an empty CEL filter expression. Istio documents `filter.expression` as a CEL expression, so an empty expression should not be used. Removed the filter field and clarified that omitting the filter logs all requests.
- The custom metric label example used `request.headers['x-tenant-id'] || 'default'`, which is not valid CEL for a string fallback because `||` is boolean OR. Replaced it with a CEL conditional expression using map membership.
- The verification section used `istioctl proxy-config log --level trace:debug` as a tracing config check. That command retrieves or updates Envoy logger levels, not Telemetry tracing configuration. Removed it and kept the bootstrap inspection command.

## Review Notes
The examples assume referenced providers such as `zipkin`, `json-access-log`, `otel-access-log`, and `otel-tracing` are defined in MeshConfig where they are not Istio built-ins. The post already calls out that provider requirement.
