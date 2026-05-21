# Validation Summary: How to Use ServiceEntry with Wildcard Hosts

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- ServiceEntry
- VirtualService
- DestinationRule
- Kubernetes
- Envoy DNS and SNI-based routing

## Sources Consulted
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio egress task for wildcard hosts: https://istio.io/latest/docs/tasks/traffic-management/egress/wildcard-egress-hosts/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio 2026 DYNAMIC_DNS wildcard ServiceEntry blog: https://istio.io/latest/blog/2026/egress-dynamic-dns/
- Istio host matching implementation documentation: https://pkg.go.dev/istio.io/istio/pkg/config/host

## Issues Found
- The post incorrectly stated that Istio wildcard hosts match exactly one subdomain level. Istio's host matching uses wildcard-prefix/suffix matching, so a host such as `*.example.com` can match nested names such as `a.b.example.com` while not matching `example.com`. Updated the wildcard syntax section and AWS examples.
- The post said wildcard ServiceEntries must use `resolution: NONE`. Current Istio documentation says regular `DNS` resolution cannot be used for wildcard hosts, but newer Istio also supports `DYNAMIC_DNS` for wildcard hosts in supported ambient/waypoint configurations. Updated the wording to distinguish `NONE`, regular `DNS`, and `DYNAMIC_DNS`.
- The AWS regional wildcard guidance was based on the incorrect one-label wildcard assumption. Updated it to explain that `*.amazonaws.com` covers nested AWS regional endpoints, while narrower regional or S3-specific wildcards can be used for stricter allow lists.
- The VirtualService example used an HTTP route for passthrough HTTPS traffic. Updated it to use a TLS route with `sniHosts`, which matches Istio's documented approach for routing unterminated TLS/HTTPS traffic by SNI.

## Review Notes
The examples use the current `networking.istio.io/v1` API version and valid ServiceEntry, VirtualService, and DestinationRule fields. The post remains a high-level guide; teams should still verify behavior against the Istio version and data plane mode they run, especially for `DYNAMIC_DNS` support and ambient mesh limitations.
