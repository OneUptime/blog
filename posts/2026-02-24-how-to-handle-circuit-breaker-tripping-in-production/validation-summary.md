# Validation Summary: How to Handle Circuit Breaker Tripping in Production

## Status
validated

## Post Type
Production runbook / technical guide

## Technologies Covered
- Istio service mesh
- Envoy circuit breaking and outlier detection
- Kubernetes Deployments and lifecycle hooks
- kubectl commands
- Istio DestinationRule configuration

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Circuit Breaking task: https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/
- Istio Envoy Statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Envoy circuit breaking documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/circuit_breaking
- Envoy cluster statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes kubectl scale reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/
- Kubernetes container lifecycle hooks documentation: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/

## Issues Found
- The original diagnostic commands queried the `affected-service` proxy. Istio upstream circuit breaker and outlier detection decisions for a destination are observed in the caller's Envoy proxy, so the commands were changed to query `deploy/caller-service`.
- The original commands used `curl localhost:15000` from inside the `istio-proxy` container. Istio's documented approach is `pilot-agent request GET stats`, which works reliably with Istio proxy images, so the stats and clusters commands were updated.
- The original overflow check only called out `upstream_rq_pending_overflow`. Envoy also exposes `upstream_cx_overflow` for connection circuit breaker overflow and `upstream_rq_active_overflow` for active request overflow, so the metric guidance was expanded.
- The post-incident command used `ejections_total`, which Envoy documents as deprecated. It was changed to `ejections_enforced_total`.
- The DestinationRule example used `networking.istio.io/v1beta1`. The current Istio reference uses `networking.istio.io/v1`, so the example was updated.
- The restart command deleted every pod with `app=affected-service` while the text said to restart failing pods. It was changed to delete a specific failing pod by name.
- The quick-reference command for "disable circuit breaking" deleted the entire DestinationRule, which can remove unrelated traffic policy such as TLS, subsets, or load balancing. It was changed to remove the top-level `connectionPool` field with a merge patch.
- The quick-reference command for "disable outlier detection" set only `consecutive5xxErrors` to a high value, which does not disable all outlier detection settings. It was changed to remove the top-level `outlierDetection` field with a merge patch.

## Review Notes
The runbook remains intentionally generic. In real incidents, operators should filter Envoy stats for the specific outbound cluster for the affected service, and should account for any per-subset or per-port DestinationRule traffic policies before applying emergency patches.
