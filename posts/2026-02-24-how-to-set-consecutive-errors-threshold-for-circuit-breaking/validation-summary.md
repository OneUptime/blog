# Validation Summary: How to Set Consecutive Errors Threshold for Circuit Breaking

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio DestinationRule
- Istio outlier detection
- Envoy outlier detection
- Kubernetes kubectl exec
- Fortio load testing

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio Debugging Envoy and Istiod documentation: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Envoy outlier detection architecture overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier
- Envoy cluster outlier detection statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy OutlierDetection API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/outlier_detection.proto.html

## Issues Found
- The DestinationRule examples used `networking.istio.io/v1beta1`. Istio's current reference examples use `networking.istio.io/v1`, and Istio encourages migration to the v1 APIs. I updated the examples to `networking.istio.io/v1`.
- The descriptions of `consecutive5xxErrors` and `consecutiveGatewayErrors` only covered HTTP response codes. Istio and Envoy also treat opaque TCP connection failures and timeouts as qualifying errors for these fields. I updated those descriptions.
- The post did not mention that gateway errors are also included in the 5xx counter. I added the caveat that `consecutiveGatewayErrors` only changes behavior when it is lower than `consecutive5xxErrors`.
- The monitoring examples queried the service pod's own sidecar. Outlier detection ejections are recorded by the Envoy proxy doing the upstream load balancing, usually a client sidecar or gateway. I changed the examples to query the load-generating/client proxy and used Istio's documented `pilot-agent request GET stats` command instead of assuming `curl` exists in the proxy container.

## Review Notes
- The remaining threshold recommendations are operational guidance rather than fixed API requirements. They are reasonable, but production values should still be tuned with service-specific traffic and error behavior.
