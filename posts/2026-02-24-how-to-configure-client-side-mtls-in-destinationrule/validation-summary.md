# Validation Summary: How to Configure Client-Side mTLS in DestinationRule

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy sidecars
- Mutual TLS (mTLS)
- DestinationRule
- ServiceEntry
- istioctl

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio egress TLS origination task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio security FAQ / workload certificate lifetime reference: https://istio.io/latest/about/faq/security/

## Issues Found
- Updated `credentialName` guidance. The post said `credentialName` is primarily supported in Gateway configurations and that sidecar DestinationRules typically need volume mounts. Current Istio documentation supports `credentialName` for sidecars when the `DestinationRule` has a `workloadSelector`; otherwise sidecars use certificate file paths.
- Corrected the external mTLS example to use TLS origination from HTTP. The original ServiceEntry and test command used HTTPS directly from the application while also saying Envoy upgrades a regular HTTP call to mTLS. The example now uses an HTTP ServiceEntry port with `targetPort: 443`, a port-level `MUTUAL` TLS policy, `sni`, and an `http://` curl request.
- Replaced the stale `istioctl authn tls-check` troubleshooting command with current `istioctl experimental describe pod` and `istioctl proxy-config cluster` commands from the Istio command reference.

## Review Notes
The remaining examples use current Istio `networking.istio.io/v1` APIs and valid DestinationRule TLS fields. The volume mount annotations are documented as alpha Istio annotations, so future reviews should confirm they remain supported.
