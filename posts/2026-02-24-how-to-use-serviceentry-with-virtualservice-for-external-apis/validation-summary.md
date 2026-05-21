# Validation Summary: How to Use ServiceEntry with VirtualService for External APIs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ServiceEntry
- Istio VirtualService
- Istio DestinationRule
- Istio traffic management
- Kubernetes
- Envoy proxy configuration
- istioctl

## Sources Consulted
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Egress TLS Origination task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The original examples used `ServiceEntry` ports with `protocol: HTTPS` and `VirtualService.http` rules for path matching, header matching, retries, fault injection, mirroring, and rewrites. Istio applies HTTP routes to HTTP/HTTP2/GRPC service-entry ports, while non-terminated HTTPS/TLS traffic uses TLS routing based on SNI. Updated the examples to use the documented TLS origination pattern: `ServiceEntry` port 80 with `protocol: HTTP` and `targetPort: 443`, a `DestinationRule` with `tls.mode: SIMPLE`, and `VirtualService` routes to port 80.
- The post claimed the VirtualService rules apply to all traffic for the host. Updated the wording to specify external HTTP traffic, because encrypted HTTPS traffic cannot be matched by HTTP path or headers unless Istio sees HTTP before originating TLS.
- The mirroring and DestinationRule examples routed to port 443 while using HTTP-level VirtualService behavior. Updated them to route to port 80 in the mesh, with TLS originated by DestinationRule before the request reaches the external HTTPS service.
- The verification command filtered route name `443`, which no longer matches the corrected TLS-origination pattern. Updated it to filter route name `80`.

## Review Notes
- The Istio API version `networking.istio.io/v1` is current for the resources used.
- The `mirror` and `mirrorPercentage` fields are still documented in the current VirtualService reference, though `mirrors` is also available for multiple mirror destinations.
- `istioctl` was not installed in the local environment, so CLI verification was performed against the official Istio command reference rather than local `--help` output.
