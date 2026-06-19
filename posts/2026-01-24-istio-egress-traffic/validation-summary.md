# Validation Summary: How to Configure Istio Egress Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Istio ServiceEntry
- Istio Gateway
- Istio DestinationRule
- Istio VirtualService
- Istio egress gateway
- Prometheus metrics

## Sources Consulted
- Istio: Accessing External Services: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Istio: Egress Gateways: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/
- Istio: Egress Gateways with TLS Origination: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway-tls-origination/
- Istio: ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio: Global Mesh Options / OutboundTrafficPolicy: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio: Security Best Practices / Securing egress traffic: https://istio.io/latest/docs/ops/best-practices/security/
- Istio: Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/

## Issues Found
- Updated Istio networking resources from `networking.istio.io/v1beta1` to the current `networking.istio.io/v1` API version used by the official Istio documentation.
- Corrected the egress gateway HTTPS passthrough example. The original example used `protocol: HTTPS` and described a DestinationRule for TLS origination while configuring `PASSTHROUGH`. The revised example uses `protocol: TLS`, keeps the gateway in passthrough mode, and points the DestinationRule at the egress gateway service with a subset, matching Istio's documented egress gateway pattern for HTTPS traffic.
- Corrected the IP-range ServiceEntry example. The original used wildcard HTTPS/HTTP hosts with `resolution: STATIC` and endpoints, which does not accurately represent matching raw IP/CIDR traffic. The revised example uses TCP ports, CIDR `addresses`, and `resolution: NONE` so traffic can be matched by original destination IP.
- Corrected the Prometheus query for the TLS passthrough egress example. `istio_requests_total` applies to HTTP, HTTP/2, and gRPC request metrics, while TLS passthrough traffic is observed as TCP, so the query now uses `istio_tcp_connections_opened_total`.
- Clarified that `REGISTRY_ONLY` is not a strong security boundary or firewall replacement, consistent with Istio security guidance.
- Corrected the troubleshooting note for TLS handshake failures to refer to the VirtualService SNI host rather than a DestinationRule SNI setting that no longer exists in the passthrough example.

## Review Notes
The examples are syntactically valid YAML. The post still uses Istio's IstioOperator install flow, which remains valid, but future updates may consider noting Gateway API alternatives because Istio documentation increasingly presents both Gateway API and Istio API examples.
