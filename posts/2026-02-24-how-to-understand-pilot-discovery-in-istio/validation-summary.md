# Validation Summary: How to Understand Pilot-Discovery in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Istiod / Pilot-Discovery
- Envoy
- xDS APIs
- Kubernetes
- Istio traffic management resources
- Istio CLI and debug endpoints

## Sources Consulted
- Istio Architecture: https://istio.io/latest/docs/ops/deployment/architecture/
- Istio pilot-discovery command reference and exported metrics: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Debugging Envoy and Istiod: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio Performance and Scalability: https://istio.io/latest/docs/ops/deployment/performance-and-scalability/
- Istio Security concepts: https://istio.io/latest/docs/concepts/security/
- Envoy xDS protocol reference: https://www.envoyproxy.io/docs/envoy/latest/api-docs/xds_protocol.html
- Envoy Secret Discovery Service documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/security/secret

## Issues Found
- The VirtualService and Sidecar examples used `networking.istio.io/v1beta1`; updated both to the current stable `networking.istio.io/v1` API used in Istio documentation.
- The VirtualService example routed to `v1` and `v2` subsets without stating that those subsets must be declared in a DestinationRule; added that assumption to make the example technically complete.
- The xDS section implied Pilot-Discovery directly pushes SDS certificates to sidecars; clarified that SDS is part of Envoy's xDS API, while Istio sidecar workload certificates are normally served to Envoy by the local Istio agent over SDS.
- The connected-proxy metric command used `pilot_xds_connected`, which is not the current exported metric name; changed it to query `pilot_xds`.
- The explanation of `STALE` in `istioctl proxy-status` was too broad; corrected it to match Istio documentation: Istiod sent an update but has not received an acknowledgement.

## Review Notes
The debug endpoint examples are correct for localhost port-forwarding. Current Istio documentation notes that debug endpoint authentication is enabled by default for non-localhost access, so future revisions could add that operational caveat if expanding the troubleshooting section.
