# Validation Summary: How to Handle DNS-Based Egress in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio ServiceEntry
- Istio DNS proxying
- Envoy sidecar proxy
- Kubernetes DNS/CoreDNS
- istioctl proxy-config

## Sources Consulted
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio Understanding DNS documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/dns/
- Istio DNS Proxying documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio pilot-agent command and metrics reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio pilot-discovery command and metrics reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio 1.25 change notes for DNS auto-allocation deprecation: https://istio.io/latest/news/releases/1.25.x/announcing-1.25/change-notes/

## Issues Found
- The post said ServiceEntries support three resolution strategies. Current Istio documents additional modes, including `DNS_ROUND_ROBIN` and `DYNAMIC_DNS`, so the wording was changed to say the listed modes are the most common ones for DNS-based egress.
- The `resolution: DNS` explanation said Istio's control plane resolves the hostname and refreshes based on DNS TTL. Istio documents proxy-side asynchronous DNS resolution with a fixed 30-second interval, so this was corrected.
- The wildcard `NONE` wording said `NONE` is required for wildcard hosts. Current Istio also supports `DYNAMIC_DNS` for wildcard hosts in supported scenarios, so the wording was softened to "commonly used."
- The DNS proxy configuration included deprecated `ISTIO_META_DNS_AUTO_ALLOCATE`. It was removed, and the text was updated to describe current automatic VIP allocation and the `networking.istio.io/enable-autoallocate-ip` ServiceEntry label.
- The DNS proxy section overstated wildcard matching behavior. It was changed to the documented behavior that DNS capture can answer application DNS queries for ServiceEntry hostnames that CoreDNS would not otherwise know about.
- The DNS refresh section claimed DNS refresh could be configured through a `DestinationRule`, but the shown `connectTimeout` only configures connection timeout. This was replaced with a `DNS_ROUND_ROBIN` ServiceEntry example and corrected DNS proxy caveat.
- The stale DNS troubleshooting note implied DNS proxying refreshes `resolution: DNS` ServiceEntries according to DNS TTL. It was corrected to say DNS proxying only affects application DNS queries.
- The monitoring section referenced non-current metrics `pilot_dns_requests_total` and `pilot_dns_failures_total`. These were replaced with current DNS proxy agent metrics: `dns_requests_total`, `dns_upstream_requests_total`, and `dns_upstream_failures_total`.

## Review Notes
The YAML examples use current `networking.istio.io/v1` ServiceEntry APIs and valid `istioctl proxy-config` command forms. DNS proxying defaults vary by Istio mode and version: it is enabled by default in ambient mode in newer Istio versions, but still needs explicit enablement for sidecar mode.
