# Validation Summary: How to Debug SSL/TLS Handshake Failures in Istio

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- Istio
- Envoy
- Kubernetes
- TLS and mTLS
- Istio Gateway
- Istio PeerAuthentication
- Istio DestinationRule
- istioctl
- OpenSSL

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Mutual TLS Migration task: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Istio Understanding TLS Configuration: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio Secure Gateways task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Managing In-Mesh Certificates: https://istio.io/latest/docs/ops/configuration/traffic-management/manage-mesh-certificates/
- Istio Introducing v1 APIs: https://istio.io/latest/blog/2024/v1-apis/
- Envoy listener statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/stats
- Envoy TLS parameters reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/transport_sockets/tls/v3/common.proto.html

## Issues Found
- The PeerAuthentication and Gateway YAML snippets used `security.istio.io/v1beta1` and `networking.istio.io/v1beta1`. These APIs are still supported, but Istio promoted these resources to stable `v1` in Istio 1.22 and current official examples use `v1`, so the snippets were updated to `security.istio.io/v1` and `networking.istio.io/v1`.
- The certificate section said sidecars get certificates from istiod "using the Citadel component." Current Istio documentation describes the Istio CA in istiod and no longer presents Citadel as the active component, so the wording was changed to "the Istio CA in istiod."

## Review Notes
The remaining commands, TLS modes, Envoy SSL statistics, Gateway TLS fields, `istioctl proxy-config secret` usage, and TLS protocol version examples were consistent with current Istio and Envoy documentation. The post focuses on sidecar-mode debugging; ambient-mode behavior differs in some mTLS details and could be called out in a future update if the article is expanded.
