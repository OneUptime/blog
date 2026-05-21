# Validation Summary: How to View Envoy Cluster Configuration with istioctl

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Istio
- Envoy
- istioctl
- Kubernetes
- DestinationRule configuration
- Envoy cluster stats and circuit breakers

## Sources Consulted
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Envoy cluster configuration API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto
- Envoy circuit breakers API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/circuit_breaker.proto
- Envoy cluster manager statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats
- Envoy access log response flags reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html

## Issues Found
- The TLS section described disabled mTLS as "PERMISSIVE mode." This was inaccurate because Istio `PERMISSIVE` peer authentication allows inbound plaintext or mTLS, while outbound mTLS is controlled by DestinationRule TLS settings or auto mTLS. Updated the paragraph to distinguish disabled outbound mTLS from `PERMISSIVE` inbound behavior.

## Review Notes
The `istioctl proxy-config clusters` commands and filters match the current Istio command reference. The DestinationRule examples use current `networking.istio.io/v1` fields. Envoy circuit breaker defaults, response flag `UO`, cluster stat names, and cluster type explanations were consistent with Envoy documentation.
