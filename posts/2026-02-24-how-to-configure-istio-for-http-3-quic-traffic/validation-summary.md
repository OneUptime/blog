# Validation Summary: How to Configure Istio for HTTP/3 (QUIC) Traffic

## Status
not-technically-relevant

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ingress gateways
- Kubernetes Services and LoadBalancers
- Envoy HTTP/3 and QUIC
- HTTP/3, QUIC, and Alt-Svc
- AWS Network Load Balancer
- curl HTTP/3 testing

## Sources Consulted
- Istio Protocol Selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio 1.22.0 release announcement: https://istio.io/latest/news/releases/1.22.x/announcing-1.22/
- Istio 1.22.0 change notes: https://istio.io/latest/news/releases/1.22.x/announcing-1.22/change-notes/
- Istio 1.22 end-of-life notice: https://istio.io/latest/news/support/announcing-1.22-eol-final/
- Envoy HTTP/3 overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/http3
- Kubernetes Service protocols documentation: https://kubernetes.io/docs/reference/networking/service-protocols/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The central claim that Istio 1.22 or later has experimental HTTP/3/QUIC ingress gateway support is not supported by official Istio documentation. Istio's protocol selection documentation states that UDP is not proxied and cannot be used in proxy-only components such as ingress or egress gateways.
- The IstioOperator example adds UDP ports to the gateway Deployment and Service, but that does not make Istio generate the Envoy HTTP/3 listener configuration required for QUIC. Envoy's own HTTP/3 documentation requires QUIC options, a QUIC downstream transport socket, and HTTP/3 codec configuration.
- The Gateway example uses `protocol: HTTPS`, which Istio documents as TLS-encrypted HTTP/1.1 or HTTP/2 traffic at gateways, not HTTP/3 over UDP.
- The statement that the same Istio Gateway resource handles both HTTPS over TCP and HTTP/3 over QUIC is inaccurate for native Istio Gateway configuration.
- The EnvoyFilter example only adds an `Alt-Svc` response header. Advertising HTTP/3 does not create a UDP listener or enable HTTP/3 handling in Envoy.
- The monitoring metric names shown in the post could not be verified as Istio gateway stats produced by a valid native HTTP/3 Istio configuration.
- Istio 1.22 is no longer supported as of January 22, 2025, and the post's prerequisite points readers to an end-of-life release line.

Because the tutorial's premise is contradicted by current official Istio documentation, the post should not be published as a working configuration guide. I did not edit the README because the required correction would be a full rewrite into a warning or alternatives article rather than a narrow technical fix.

## Review Notes
Envoy itself supports downstream HTTP/3, and Kubernetes Services can define UDP ports when the load balancer implementation supports them. Those facts do not make the Istio Gateway examples valid: native Istio ingress gateways do not expose the required HTTP/3/QUIC listener configuration through the shown APIs.
