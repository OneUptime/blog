# Validation Summary: How to Fix Circuit Breaker Not Working in Istio

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy
- DestinationRule
- VirtualService
- Prometheus
- Fortio

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Circuit Breaking task: https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Envoy Statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Envoy circuit breaking documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/circuit_breaking
- Envoy cluster statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats
- Istio httpbin sample manifest: https://github.com/istio/istio/blob/master/samples/httpbin/httpbin.yaml

## Issues Found
- Updated Istio `DestinationRule` and `VirtualService` examples from `networking.istio.io/v1beta1` to the current `networking.istio.io/v1` API used in the latest Istio documentation.
- Corrected the host-name explanation to mention service-registry matching and namespace-based short-name resolution, matching Istio's DestinationRule reference.
- Reworded the VirtualService retry/timeout claim because VirtualService settings do not override DestinationRule circuit breaker settings directly, but retries can change how failures are observed.
- Corrected the single-replica outlier-detection explanation. A single endpoint can be ejected, but doing so may leave no healthy upstream; outlier detection is simply more useful with multiple endpoints.
- Corrected the `minHealthPercent` explanation. It is a healthy-host percentage threshold, not a minimum request-count threshold.
- Clarified `consecutiveGatewayErrors` usage because gateway errors are also counted by `consecutive5xxErrors`; the gateway threshold must be lower to have a distinct effect.
- Updated the Fortio sample URL from Istio `release-1.20` to `release-1.30`, matching the current Istio release line.
- Fixed the outlier-detection test workload. The previous `kennethreitz/httpbin` deployment did not fail 50% of the time as claimed, so the example now uses Istio's current httpbin image and instructs readers to call a 500-status path.
- Replaced the Envoy stats command with `pilot-agent request GET stats`, matching Istio documentation and avoiding reliance on `curl` being present in the proxy image.
- Updated deprecated Envoy outlier stat names from `ejections_total` and `ejections_consecutive_5xx` to `ejections_enforced_total` and `ejections_enforced_consecutive_5xx`.
- Corrected the Envoy Prometheus grouping label from `cluster_name` to `envoy_cluster_name`.

## Review Notes
Envoy cluster-level metrics may require `proxyStatsMatcher` configuration in Istio before they appear in proxy stats or Prometheus, depending on mesh defaults. The post now uses current stat names, but readers should confirm metric labels in their own Prometheus setup before copying dashboard queries.
