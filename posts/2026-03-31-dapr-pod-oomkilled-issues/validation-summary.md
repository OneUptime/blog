# Validation Summary: How to Fix Dapr Pod OOMKilled Issues

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (sidecar architecture, actors, pub/sub, metrics)
- Kubernetes (pods, OOMKilled, resource limits, LimitRange, events)
- Go pprof (heap profiling)
- Helm (chart upgrades)

## Sources Consulted
- Dapr production guidelines for Kubernetes: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Dapr arguments and annotations overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Helm chart values.yaml: https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_sidecar_injector/values.yaml
- Dapr profiling and debugging docs: https://docs.dapr.io/operations/troubleshooting/profiling-debugging/
- Dapr actor runtime configuration: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-runtime-config/
- Dapr metrics configuration: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Configuration schema spec: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr source code pkg/config/configuration.go and pkg/runtime/config.go

## Issues Found

1. **Incorrect default memory limit claim (High severity)**: The post stated "By default, Dapr injects sidecars with 256Mi memory limit." This is false — Dapr does not set any default resource limits on injected sidecar containers. Fixed the text to accurately state that no defaults are set and explain the implications.

2. **Incorrect Helm values for sidecar resources (High severity)**: The post showed `dapr_sidecar_injector.injectorResources` as the Helm key for setting default sidecar resources. This key does not exist; the actual `resources` key under `dapr_sidecar_injector` controls the injector pod itself, not injected sidecars. There is no Helm value to globally set default resource limits on all injected sidecar containers. Replaced the section with a Kubernetes `LimitRange` approach, which is the correct way to enforce default resource limits across a namespace.

3. **ActorStateTTL section mismatch (High severity)**: The section was titled "Configuring Actor Memory Thresholds" and described tuning "the actor scan interval to garbage collect inactive actors sooner," but the YAML only enabled the `ActorStateTTL` preview feature flag, which controls TTL expiration of actor state entries in the state store — unrelated to actor deactivation/GC. Replaced with correct actor runtime configuration (`actorIdleTimeout`, `actorScanInterval`) returned from the application's `/dapr/config` endpoint.

4. **Metrics configuration field name (Low severity)**: The post used `spec.metric` (singular). While this works for backward compatibility, the current Dapr documentation consistently uses `spec.metrics` (plural). Changed to `spec.metrics`.

5. **Incorrect metric name (Low severity)**: The post used `dapr_service_invocation_req_sent_total` but the actual metric name includes the `_runtime_` prefix: `dapr_runtime_service_invocation_req_sent_total`. Fixed.

## Review Notes
- The regex-based metric rules approach shown in the post is considered legacy. The newer recommended approach for reducing HTTP metric cardinality is `spec.metrics.http.increasedCardinality: false` with `spec.metrics.http.pathMatching`. The regex approach still works, so this was not changed.
- The profiling port 7777 is correct as the default constant, though the Dapr docs note that if `--profile-port` is not explicitly set, Dapr may pick an available port. The post's usage is standard and correct for most scenarios.
- The kubectl commands, OOMKilled exit code 137, and pprof workflow are all correct.
