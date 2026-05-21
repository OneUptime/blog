# Validation Summary: How to Handle Service Discovery with Custom DNS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Istio DNS proxying
- Istio ServiceEntry
- Kubernetes DNS
- CoreDNS
- kubectl
- istioctl

## Sources Consulted
- Istio DNS Proxying documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Istio Understanding DNS documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/dns/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio DYNAMIC_DNS wildcard egress blog: https://istio.io/latest/blog/2026/egress-dynamic-dns/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward/

## Issues Found
- The DNS flow explanation said the sidecar routes based on the original hostname rather than the resolved IP. This was too broad for non-HTTP/TLS traffic, so it was narrowed to HTTP `Host` and TLS SNI routing.
- The ServiceEntry wildcard example used `resolution: DNS` for `*.internal.company.com`. Current Istio documentation uses `resolution: DYNAMIC_DNS` for wildcard HTTPS/TLS destinations that should be dynamically resolved, so the snippet was updated.
- The service alias and split-horizon examples used `resolution: STATIC` with DNS-name endpoints. Istio's documented DNS-addressable endpoint examples use `resolution: DNS`, so both snippets were corrected.
- The auto-allocated virtual IP was described as a routable address and the troubleshooting note referred broadly to 240.0.0.0/4. Istio documents non-routable, auto-allocated VIPs from 240.240.0.0/16, so the wording was corrected.
- The performance section implied all ServiceEntry hosts can be answered immediately by the DNS proxy. This was narrowed to ServiceEntry hosts with known or auto-allocated addresses.

## Review Notes
The CoreDNS forwarding example and the kubectl/istioctl troubleshooting commands are consistent with current official documentation. `DYNAMIC_DNS` is current in Istio 1.30 documentation; older Istio versions may need different wildcard egress handling.
