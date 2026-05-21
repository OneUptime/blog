# Validation Summary: How to Override Telemetry Configuration per Workload in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Telemetry API
- Kubernetes custom resources
- Istio tracing providers
- Istio standard metrics
- Istio access logging
- kubectl
- istioctl
- Python JSON parsing

## Sources Consulted
- Istio Telemetry API task documentation: https://istio.io/latest/docs/tasks/observability/telemetry/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio access log Telemetry API task documentation: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The override hierarchy described mesh-wide and namespace-level Telemetry resources as `default` resources. Istio requires selector-less Telemetry resources at those scopes, but the resource name is not fixed. Updated the hierarchy wording to describe selector-less resources in the root configuration namespace and workload namespace.
- The examples used a `zipkin` tracing provider without noting that it must be configured. Istio's built-in provider names include `prometheus`, `stackdriver`, and `envoy`; tracing providers such as Zipkin are configured as extension providers. Added a note that the examples assume a configured provider named `zipkin`.
- The noisy workload example said the workload was completely silenced from a telemetry perspective. Istio can still propagate trace context, and provider-specific overrides only apply to the named providers. Softened the claim to say the configuration greatly reduces telemetry and noted that other providers need their own overrides.
- The verbose logging example used an empty access-log filter expression to log every request. Istio access-log filters are CEL expressions used to select requests; to log every request, omit the filter. Removed the empty filter and updated the explanation.
- The selector overlap best practice said overlapping Telemetry resources depend on merge behavior. Istio documents that two Telemetry resources selecting the same workload are invalid. Updated the wording accordingly.

## Review Notes
The YAML examples use the current `telemetry.istio.io/v1` API and valid field names for workload selectors, tracing sampling, custom tags, metrics overrides, tag overrides, and access logging. The `istioctl proxy-config bootstrap ... -o json` command and Kubernetes commands are current.
