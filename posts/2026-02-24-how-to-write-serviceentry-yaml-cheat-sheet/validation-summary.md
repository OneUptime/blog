# Validation Summary: How to Write ServiceEntry YAML (Cheat Sheet)

## Status
validated

## Post Type
Reference / cheat sheet

## Technologies Covered
- Istio ServiceEntry
- Istio DestinationRule
- Istio VirtualService
- Istio egress traffic control
- Istio TLS origination
- Kubernetes YAML manifests

## Sources Consulted
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Accessing External Services task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Istio Egress TLS Origination task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/

## Issues Found
- Added `DYNAMIC_DNS` to the resolution list because current Istio supports it for wildcard hosts using HTTP Host headers or TLS SNI.
- Changed the DestinationRule traffic-policy example from an HTTPS passthrough service to an HTTP service. HTTP connection-pool settings and HTTP-level outlier behavior are meaningful for HTTP traffic; HTTPS passthrough traffic is routed by SNI and is not HTTP-inspected.
- Changed the VirtualService example from HTTPS passthrough on port 443 to HTTP on port 80, and removed the claim about fault injection because the example did not configure fault injection.
- Fixed the TLS origination example by adding `targetPort: 443` to the ServiceEntry port 80 entry and removing the unnecessary VirtualService. This matches Istio's documented sidecar TLS origination pattern.
- Fixed the subnet-based entry to use `spec.addresses` with `resolution: NONE` instead of putting a CIDR block in `endpoints`.
- Updated the production example so HTTP retries/timeouts apply to port 80 while Envoy originates TLS to the upstream service through `targetPort: 443` and a port-level `DestinationRule` TLS policy.

## Review Notes
All YAML snippets parse successfully. HTTPS `ServiceEntry` examples are valid for allowing and observing SNI/TLS passthrough traffic, but HTTP-level retries, timeouts, and fault injection require HTTP traffic handling or TLS origination rather than opaque HTTPS passthrough.
