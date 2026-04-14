# Validation Summary: How to Use Dapr with Istio Ingress Gateway

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (mTLS configuration, sidecar ports)
- Istio (Ingress Gateway, PeerAuthentication, VirtualService, DestinationRule)
- Kubernetes
- Kiali (observability dashboard)

## Sources Consulted
- Dapr arguments and annotations overview — https://docs.dapr.io/reference/arguments-annotations-overview/
- Istio PeerAuthentication reference — https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Gateway reference — https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference — https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference — https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Envoy retry policies — https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter#x-envoy-retry-on
- Istio v1 APIs blog post — https://istio.io/latest/blog/2024/v1-apis/

## Issues Found

1. **Misleading mTLS introductory text**: The paragraph before the Dapr Configuration YAML said "disable Istio mTLS to avoid conflicts with Dapr mTLS" but the YAML shown actually *enables* Dapr mTLS. The actual disabling of Istio mTLS happens in the subsequent PeerAuthentication resource. Fixed by rewriting the text to clearly explain the two-step process: keep Dapr mTLS enabled, then disable Istio mTLS on Dapr-specific ports.

2. **Incorrect Dapr port 3501 in PeerAuthentication**: Port 3501 is not a standard Dapr sidecar port. The default Dapr sidecar ports are 3500 (HTTP API), 50001 (gRPC API), and 50002 (internal gRPC for sidecar-to-sidecar communication). Changed 3501 to 50002 to match the actual Dapr port that needs Istio mTLS disabled.

## Review Notes
- The Istio API versions used (`networking.istio.io/v1beta1`, `security.istio.io/v1beta1`) are still valid and supported, but since Istio 1.22 (May 2024) the `v1` versions are available and preferred. For new content, `v1` would be more future-proof.
- The hardcoded Istio version `istio-1.21.0` in the install section will become outdated over time; readers should check for the latest version.
- The Dapr metrics port (9090) could also be added to the PeerAuthentication exclusion list if metrics scraping is needed, but this is optional and depends on the deployment setup.
