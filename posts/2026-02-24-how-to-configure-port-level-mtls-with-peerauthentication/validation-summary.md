# Validation Summary: How to Configure Port-Level mTLS with PeerAuthentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- PeerAuthentication
- Mutual TLS (mTLS)
- Kubernetes Services and container ports
- istioctl
- kubectl

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio authentication policy task documentation: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The post incorrectly stated that `portLevelMtls` works on namespace-wide PeerAuthentication policies. Official Istio documentation says port-specific mutual TLS settings only apply when a workload selector is specified. I changed the namespace-wide override section to explain that port-level overrides require a workload selector and updated the example accordingly.
- The precedence example used an invalid namespace-wide `portLevelMtls` override. I removed the namespace-level per-port setting and adjusted the explanation so it accurately describes workload-specific precedence.
- The production-like example used a namespace default with a metrics port exception. I changed the namespace default to STRICT only and kept per-port exceptions on workload-specific policies.
- The common pitfalls section omitted Istio's caveat that port-level mTLS settings are ignored unless the port is bound to a Kubernetes Service. I added that warning.

## Review Notes
The PeerAuthentication API version, `mtls.mode` values, `portLevelMtls` structure, container-port guidance, and `istioctl proxy-config listener` commands are consistent with current Istio documentation. No live cluster validation was performed.
