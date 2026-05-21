# Validation Summary: How to Handle DNS Resolution for External Services in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy sidecar proxy
- Kubernetes DNS/CoreDNS
- Istio ServiceEntry
- Istio DNS proxying
- Istio egress traffic management

## Sources Consulted
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio Understanding DNS documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/dns/
- Istio DNS Proxying documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Istio Debugging Envoy and Istiod / proxy-config documentation: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio wildcard egress with DYNAMIC_DNS blog: https://istio.io/latest/blog/2026/egress-dynamic-dns/
- Istio 1.25 change notes for DNS auto-allocation deprecation: https://istio.io/latest/news/releases/1.25.x/announcing-1.25/change-notes/

## Issues Found
- The post said `resolution: DNS` resolves when the proxy needs to establish a connection and caches results based on DNS TTL. Current Istio documentation says the proxy performs asynchronous periodic DNS resolution for DNS ServiceEntries, with a fixed 30-second interval. Updated the explanation, troubleshooting note, and TTL best practice.
- The post described `ISTIO_META_DNS_AUTO_ALLOCATE` as the way to enable auto-allocation. Istio 1.25 deprecated that proxy metadata setting in favor of the newer status-based controller. Updated the example to use `PILOT_ENABLE_IP_AUTOALLOCATE` and kept `ISTIO_META_DNS_CAPTURE` for sidecar DNS capture.
- The post said `resolution: NONE` is required and the only option for wildcard hosts. Current Istio supports `resolution: DYNAMIC_DNS` for wildcard HTTP/TLS egress based on Host or SNI. Updated the wildcard guidance while preserving `NONE` for passthrough to application-resolved IPs.
- The post implied DNS auto-allocation applies broadly to ServiceEntry hosts. Current documentation notes that auto-allocation applies to ServiceEntries without explicit addresses as long as they do not use wildcard hosts. Added that caveat.
- The post said one DNS resolution is shared across all ServiceEntry ports. Istio creates per-port proxy configuration, so this wording was too strong. Updated it to say the resolution mode and host apply to all ports without implying a single shared DNS cache.

## Review Notes
The remaining examples use current Istio `networking.istio.io/v1` ServiceEntry syntax and the `istioctl proxy-config` commands match official diagnostic documentation. The article is technically valid after the corrections above.
