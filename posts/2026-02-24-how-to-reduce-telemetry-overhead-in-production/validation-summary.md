# Validation Summary: How to Reduce Telemetry Overhead in Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio Telemetry API
- Istio standard metrics
- Envoy proxy statistics and access logs
- Kubernetes `kubectl top` and `kubectl exec`
- Prometheus HTTP API

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio access logging with Telemetry API: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio Envoy access logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Kubernetes generated `kubectl` command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Prometheus HTTP API reference: https://prometheus.io/docs/prometheus/latest/querying/api/
- Envoy administration interface documentation: https://www.envoyproxy.io/docs/envoy/latest/operations/admin

## Issues Found
- The post showed several selector-less mesh-wide `Telemetry` resources in `istio-system`. Istio allows only one selector-less `Telemetry` resource per namespace, including the root configuration namespace, so I added a note telling readers to merge multiple mesh-wide changes into one resource.
- The access-log filter used `response.duration > 1000`, but the official Telemetry API filter examples document `response.code`, connection attributes, and request fields, not `response.duration`. I changed the example to a documented and safer expression, `!has(response.code) || response.code >= 400`, and updated the surrounding explanation from "errors and slow requests" to "failed connections and error responses."
- The final `kubectl top` aggregation commands summed raw CPU and memory strings as if all values used one unit. I replaced them with `awk` commands that handle `Ki`, `Mi`, and `Gi` for memory and cores versus `m` for CPU.

## Review Notes
The Telemetry API snippets use current `telemetry.istio.io/v1` fields and valid Istio metric names. Provider names such as `prometheus`, `otel`, and `envoy` assume matching providers are configured in `MeshConfig`.
