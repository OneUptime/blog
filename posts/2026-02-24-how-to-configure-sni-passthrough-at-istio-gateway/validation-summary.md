# Validation Summary: How to Configure SNI Passthrough at Istio Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Gateway
- Istio VirtualService
- Istio DestinationRule
- Kubernetes Services, Deployments, ConfigMaps, and Secrets
- TLS, HTTPS, SNI, and mTLS
- nginx
- kubectl, istioctl, openssl, and curl

## Sources Consulted
- Istio Ingress Gateway without TLS Termination: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-sni-passthrough/
- Istio Understanding TLS Configuration: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/

## Issues Found
- The Gateway examples used `protocol: TLS` and the text said to use `TLS`, not `HTTPS`. Istio's own ingress SNI passthrough example uses `protocol: HTTPS` for HTTPS passthrough, while the protocol selection documentation distinguishes HTTPS traffic from raw TCP protocols wrapped in TLS. Updated the examples to use `protocol: HTTPS` and clarified when `HTTPS` versus `TLS` is appropriate.
- The sidecar/DestinationRule section implied that a backend sidecar generally needs mesh TLS disabled because the application handles TLS. Istio documentation says DestinationRule controls outbound TLS origination, PeerAuthentication controls accepted mTLS, and local inbound traffic is forwarded as-is. Reworded the section to avoid recommending `DISABLE` by default and to warn that it can break traffic when mesh mTLS is required.

## Review Notes
- The VirtualService `tls` routing examples and `sniHosts` usage match the Istio VirtualService reference for unterminated TLS traffic.
- The testing commands are plausible for a LoadBalancer ingress IP, but clusters that expose only a hostname rather than `.status.loadBalancer.ingress[0].ip` may need a hostname-oriented variant.
