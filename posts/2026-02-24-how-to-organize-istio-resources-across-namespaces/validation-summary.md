# Validation Summary: How to Organize Istio Resources Across Namespaces

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio traffic management resources: VirtualService, DestinationRule, Gateway, ServiceEntry, Sidecar
- Istio security resources: AuthorizationPolicy, PeerAuthentication, RequestAuthentication
- Kubernetes namespaces and RBAC
- Kubernetes YAML manifests

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Traffic Management Best Practices: https://istio.io/latest/docs/ops/best-practices/traffic-management/

## Issues Found
- Updated Istio examples from `networking.istio.io/v1beta1` to `networking.istio.io/v1`, matching current official Istio API examples.
- Corrected the Sidecar explanation. Sidecar `egress.hosts` limits the configuration sent to sidecars; it is not a security boundary and does not reliably block traffic by itself.
- Clarified mesh-wide PeerAuthentication and AuthorizationPolicy placement. Mesh-wide policies belong in the configured mesh root namespace, which is `istio-system` by default.
- Clarified DestinationRule lookup scope. DestinationRules are applied through the client namespace, service namespace, and mesh root namespace lookup path, and fully qualified hostnames avoid short-name resolution issues.

## Review Notes
The examples are syntactically valid Kubernetes/Istio YAML and align with current Istio documentation. The Gateway example assumes the referenced TLS credential exists in the gateway workload's namespace and that VirtualServices remain exported to the gateway namespace, which is the default behavior.
