# Validation Summary: How to Configure Access Log Sampling in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Telemetry API
- Istio MeshConfig and IstioOperator
- Envoy access logs
- EnvoyFilter
- Common Expression Language (CEL)
- kubectl and istioctl

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Telemetry API task documentation: https://istio.io/latest/docs/tasks/observability/telemetry/
- Istio access logs with Telemetry API task: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio Envoy access logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy access log filter API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/accesslog/v3/accesslog.proto
- Envoy HTTP connection manager API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto

## Issues Found
- The first Telemetry example was described as sampling 10% of access logs, but its CEL filter only conditionally logs mTLS `/api/` traffic. Updated the description to match what the configuration actually does.
- The post said `randomSamplingPercentage` can be used for access log sampling. That field is for tracing, not access logging. Updated the text and added an Envoy access log `runtime_filter` example for percentage-based access log sampling.
- The EnvoyFilter example set `access_log_flush_interval`, which controls periodic flushing for long-lived streams and does not sample logs. Replaced it with an Envoy access log filter using `percent_sampled`.
- The combined Telemetry example used `response.code == 0` for failed requests and claimed percentage sampling of successes. Updated it to use `!has(response.code)` for missing response codes and a conditional successful-request filter.
- The MeshConfig example included `proxyStatsMatcher`, which configures Envoy stats collection rather than access logging. Removed that unrelated block.
- The verification command used `istioctl proxy-config log`, which inspects or changes Envoy logger levels, not listener/access-log configuration. Replaced it with `istioctl proxy-config listener <pod-name> -o json`.

## Review Notes
The Telemetry API supports access log enablement, disablement, provider selection, workload mode matching, and CEL filtering. It does not currently expose a first-class random percentage field for access logs comparable to tracing's `randomSamplingPercentage`. EnvoyFilter-based sampling can work, but it should be monitored during Istio and Envoy upgrades because EnvoyFilter patches depend on generated xDS internals.
