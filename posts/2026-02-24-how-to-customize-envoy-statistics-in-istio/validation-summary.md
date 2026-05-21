# Validation Summary: How to Customize Envoy Statistics in Istio

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Istio
- Envoy
- Istio Telemetry API
- EnvoyFilter
- Prometheus
- Kubernetes
- istioctl

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio custom metrics with Telemetry API task: https://istio.io/latest/docs/tasks/observability/metrics/telemetry-api/
- Istio Envoy statistics operations guide: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy bootstrap API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/bootstrap/v3/bootstrap.proto.html
- Envoy stats API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/metrics/v3/stats.proto.html

## Issues Found
- The examples used `upstream_peer.name` directly for peer metadata. Istio's current custom metrics documentation shows peer metadata access through `filter_state.upstream_peer.*` and `filter_state.downstream_peer.*`, so the examples were updated to use `filter_state.upstream_peer.app` and `filter_state.upstream_peer.name`.
- The EnvoyFilter section said Envoy stats configuration can create entirely new metrics. Envoy `stats_tags` config extracts tags from existing stats rather than creating new metrics, so the wording was corrected.
- The EnvoyFilter example uses `applyTo: BOOTSTRAP`, which current Istio documentation marks as deprecated. The section now warns that this should be treated as a last-resort, version-sensitive advanced customization and recommends the Telemetry API and `proxyStatsMatcher` for normal customization.

## Review Notes
The Telemetry API examples, standard Istio metric names, `proxyStatsMatcher` fields, TCP metric disabling examples, `istioctl proxy-config bootstrap`, `kubectl exec` proxy stats check, and Prometheus port-forward command are consistent with current Istio documentation. Bootstrap-level proxy configuration changes require workload restart.
