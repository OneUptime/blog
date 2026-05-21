# Validation Summary: How to Debug mTLS Issues in Ambient Mode

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio ambient mode
- ztunnel
- HBONE
- mutual TLS
- SPIFFE workload identities
- Kubernetes kubectl debugging
- Istio PeerAuthentication

## Sources Consulted
- Istio ambient mode overview: https://istio.io/latest/docs/ambient/overview/
- Istio verify mutual TLS in ambient mode: https://istio.io/latest/docs/ambient/usage/verify-mtls-enabled/
- Istio troubleshoot connectivity issues with ztunnel: https://istio.io/latest/docs/ambient/usage/troubleshoot-ztunnel/
- Istio HBONE architecture: https://istio.io/latest/docs/ambient/architecture/hbone/
- Istio add workloads to ambient mesh: https://istio.io/latest/docs/ambient/usage/add-workloads/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio istioctl command reference for ztunnel-config: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio pilot-discovery environment variable reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio ztunnel project README for metrics and logging behavior: https://github.com/istio/ztunnel

## Issues Found
- The post used `ztunnel_connections` as the metric name. Updated it to check Istio TCP metrics such as `istio_tcp_connections_*`, which are the documented ambient L4 metrics.
- The post suggested validating ambient mTLS with the `X-Forwarded-Client-Cert` HTTP header. Removed that check because ztunnel is an L4 proxy and does not parse or modify workload HTTP headers; replaced it with ztunnel access log validation using source and destination identities.
- The post used `curl http://istiod.istio-system:15012/` to test the CA endpoint. Replaced it with a TCP connectivity check to port 15012 because that port is the secured gRPC endpoint and a plain HTTP request is not a reliable test.
- The post used `localhost:15000/certs`, which is not the documented ztunnel certificate inspection path. Replaced it with `istioctl ztunnel-config certificates`.
- The post used `CITADEL_WORKLOAD_CERT_TTL`, which is not the current documented workload certificate TTL variable. Replaced it with `DEFAULT_WORKLOAD_CERT_TTL`.
- The post used Envoy-style runtime logging through `localhost:15000/logging`. Replaced it with ztunnel's documented `RUST_LOG`-based logging configuration.
- The post tested HBONE port 15008 with a normal HTTPS curl request. Replaced it with a TCP reachability check because HBONE expects HTTP/2 CONNECT over mTLS, so a simple HTTPS GET is not a meaningful protocol test.
- The post stated that multi-cluster setups must share the same root CA. Adjusted the wording to compatible trust anchors or root CA configuration, which is more accurate for Istio trust setups.

## Review Notes
The guide is now technically consistent with current Istio ambient mode documentation. The example debug commands still assume the user has `istioctl`, `kubectl`, and permission to create ephemeral debug containers.
