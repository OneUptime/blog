# Validation Summary: How to Configure Istio for HTTP/3 QUIC Support

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Istio
- Envoy
- HTTP/3
- QUIC
- Kubernetes Services and LoadBalancers
- AWS Network Load Balancer
- Google Cloud external passthrough Network Load Balancer
- curl

## Sources Consulted
- Istio istioctl environment variable reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio installation customization documentation: https://istio.io/latest/docs/setup/additional-setup/customize-installation/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Envoy HTTP/3 overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/http3.html
- Envoy HTTP connection manager statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/stats
- Envoy QUIC protocol options reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/protocol.proto
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service protocol documentation: https://kubernetes.io/docs/reference/networking/service-protocols/
- AWS EKS Network Load Balancer documentation: https://docs.aws.amazon.com/eks/latest/userguide/network-load-balancing.html
- Google Cloud passthrough Network Load Balancer documentation: https://cloud.google.com/load-balancing/docs/passthrough-network-load-balancer
- curl HTTP/3 documentation: https://curl.se/docs/http3.html
- RFC 9000, QUIC transport: https://www.rfc-editor.org/rfc/rfc9000.html

## Issues Found
- The IstioOperator example used `ISTIO_ENABLE_QUIC_LISTENERS` under proxy metadata. Current Istio documents the required flag as `PILOT_ENABLE_QUIC_LISTENERS` on Pilot/istiod, so the example was changed to `spec.values.pilot.env.PILOT_ENABLE_QUIC_LISTENERS`.
- The Kubernetes prerequisite only mentioned UDP load balancer support. Mixed TCP/UDP LoadBalancer Services are also required for exposing TCP 443 and UDP 443 in one Service, so the prerequisite now calls out mixed-protocol LoadBalancer support.
- The IstioOperator gateway Service port override omitted the status port, which can break the standard ingress gateway Service shape and health checks. The `status-port` entry was added to the examples.
- The Alt-Svc explanation said clients "upgrade" after first connecting over HTTP/2. HTTP/3 uses a new QUIC connection advertised by Alt-Svc, and the first TCP connection can be HTTP/1.1 or HTTP/2, so the wording was corrected.
- The EnvoyFilter example attempted to merge a QUIC transport socket into a filter chain without actually changing a supported HTTP/3 setting. It was replaced with a narrower, valid HTTP connection manager merge example and a warning about EnvoyFilter version sensitivity.
- The Envoy stats examples listed non-authoritative counters like `http3.downstream.rx` and `http3.downstream.tx`. The verification text now points to the documented `http3.downstream` prefix plus UDP listener and QUIC error stats.
- The connection migration section implied migration works automatically with Istio and Envoy. RFC 9000 supports migration through connection IDs, but Kubernetes load balancers can still break migrated connections if packets are routed to a different gateway instance. The section now describes that limitation.
- The troubleshooting section described this as a certificate issue. QUIC uses TLS 1.3, but TLS version support is not a certificate property, so the wording now refers to TLS settings, certificates, and client TLS 1.3 support.
- The AWS Service annotation used an older NLB style. The example now uses the current AWS Load Balancer Controller/EKS annotation pattern with `aws-load-balancer-type: "external"` and an explicit NLB target type.
- The conclusion referred to enabling QUIC listeners in "mesh config"; this was corrected to the Istio control plane.

## Review Notes
HTTP/3 support remains version-sensitive in Istio because it depends on Istio-generated Envoy listener configuration and the `PILOT_ENABLE_QUIC_LISTENERS` feature flag. Operators should verify the generated listener and route configuration with their exact Istio and cloud load balancer versions before relying on it in production.
