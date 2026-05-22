# Validation Summary: How to Build Secure Service-to-Service Communication with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio sidecar mode security
- PeerAuthentication and mutual TLS
- AuthorizationPolicy
- RequestAuthentication and JWT validation
- Istio certificate management
- istioctl
- Kubernetes NetworkPolicy
- Kubernetes ServiceAccounts

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Authentication Policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio HTTP authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-http/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Security FAQ: https://istio.io/latest/about/faq/security/
- Istio Plug in CA Certificates task: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The introduction overstated what is automatic out of the box by saying Istio gives mutual TLS and fine-grained authorization policies. Istio automatically uses mTLS between meshed sidecars, but authorization policies must be configured. Updated the wording to distinguish automatic mTLS from configurable authorization policies.
- The strict mTLS section said Istio defaults to permissive mode. Current Istio sidecar behavior is more specific: auto mTLS is used between workloads with proxies, while workloads can still accept plaintext until strict peer authentication is configured. Updated the explanation to match current Istio documentation.
- The verification command `istioctl authn tls-check` is not present in the current Istio 1.30 command reference. Replaced it with current `istioctl proxy-config endpoints`, `istioctl experimental describe pod`, and `istioctl proxy-config secret` commands.

## Review Notes
- The `portLevelMtls` example is valid, but readers should remember Istio interprets those keys as workload/container ports, not Kubernetes Service ports.
- The custom CA secret example matches Istio's required `cacerts` files. In production, the Istio docs recommend using a production-ready CA and keeping the root CA offline.
- Certificate lifetime customization through `SECRET_TTL` is supported through proxy metadata; values over 90 days are rejected according to the Istio Security FAQ.
