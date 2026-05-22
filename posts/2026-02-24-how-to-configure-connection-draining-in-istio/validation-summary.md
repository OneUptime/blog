# Validation Summary: How to Configure Connection Draining in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Envoy
- Kubernetes
- IstioOperator
- DestinationRule
- Envoy metrics and `pilot-agent`

## Sources Consulted
- Istio Global Mesh Options / ProxyConfig: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio Resource Annotations (`proxy.istio.io/config`): https://istio.io/latest/docs/reference/config/annotations/
- Istio DestinationRule / OutlierDetection API: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Envoy statistics guide: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- IstioOperator Options / KubernetesResourcesSpec: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Kubernetes Pod lifecycle and termination flow: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Envoy draining architecture overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/operations/draining
- Envoy command-line drain strategy reference: https://www.envoyproxy.io/docs/envoy/latest/operations/cli
- Envoy server statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/statistics

## Issues Found
- The Kubernetes termination sequence was described as SIGTERM first and endpoint removal second. Kubernetes documents that pod termination starts the grace period, runs container `preStop` hooks before TERM for those containers, and updates EndpointSlices during shutdown. Updated the sequence and explanation.
- The Envoy drain section said Envoy simply receives SIGTERM and stops accepting new connections. Istio documents this as `istio-agent` receiving SIGTERM/SIGINT, asking Envoy to drain, sleeping for `terminationDrainDuration`, then terminating remaining Envoy processes. Envoy drain behavior discourages new work and sends close/GOAWAY signals rather than always immediately refusing every new connection. Updated the description.
- The example timeline implied the application receives SIGTERM before its `preStop` sleep. Kubernetes runs `preStop` before TERM for that container. Updated the timeline and clarified that the sidecar can start draining independently because it has no `preStop` hook in that example.
- The outlier detection section claimed Envoy returns 503 during drain and that ejection happens after exactly 3 errors. Updated it to describe the documented `consecutive5xxErrors` / connection-failure behavior more accurately and to note that ejection occurs in each client proxy after the configured threshold is reached.
- The ingress gateway drain example used the `TERMINATION_DRAIN_DURATION_SECONDS` environment variable. Replaced it with the documented `proxy.istio.io/config` pod annotation through `components.ingressGateways[].k8s.podAnnotations`.
- The Prometheus metric `envoy_server_drain_count` was not supported by the Envoy server stats reference. Replaced it with `envoy_server_live` alongside `envoy_server_state`.

## Review Notes
The examples are version-neutral and align with current Istio and Kubernetes documentation as of 2026-05-22. The `pilot-agent request GET stats` examples depend on the relevant Envoy stats being emitted by the proxy; Istio's default stats set is intentionally reduced, so production monitoring may require explicit stats inclusion depending on the metric.
