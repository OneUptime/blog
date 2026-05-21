# Validation Summary: How to Configure Security for Edge Services with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio PeerAuthentication and mutual TLS
- Istio workload certificates and IstioOperator proxy metadata
- Istio AuthorizationPolicy
- Istio RequestAuthentication and JWT validation
- Istio Gateway TLS configuration
- Istio Telemetry access logging
- Kubernetes NetworkPolicy
- Kubernetes TLS secrets
- cert-manager Certificate resources

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio security FAQ for workload certificate lifetime: https://istio.io/latest/about/faq/security/
- Istio pilot-discovery reference for current certificate TTL environment variables: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes namespace label documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/

## Issues Found
- Replaced `istioctl authn tls-check -n edge-app` with `istioctl proxy-config secret deployment/my-service -n edge-app`, because the current Istio command reference no longer documents `istioctl authn tls-check`.
- Updated workload certificate TTL examples to use `meshConfig.defaultConfig.proxyMetadata.SECRET_TTL`, matching Istio's current guidance. Removed `CITADEL_WORKLOAD_CERT_TTL`, which is not listed in the current pilot-discovery environment variables.
- Changed the legacy "citadel" wording to "Istio CA in istiod" to match current Istio terminology.
- Fixed the JWT authorization example so the JWT claim condition is part of the gateway-to-API allow rule. Separate ALLOW policies are ORed in Istio, so the original `require-valid-token` policy would not have required JWTs for requests already allowed by `allow-gateway-to-api`.
- Updated Kubernetes NetworkPolicy namespace selectors from a non-standard `name` label to the standard `kubernetes.io/metadata.name` namespace label.
- Replaced the `AuthorizationPolicy` example for protecting istiod with a Kubernetes `NetworkPolicy`, because Istio authorization policies are enforced by data-plane proxies and are not a general control-plane network isolation mechanism for istiod.

## Review Notes
- The Istio `Gateway` example uses the Istio networking API, not the Kubernetes Gateway API.
- The cert-manager example is structurally valid, assuming the referenced `ClusterIssuer` exists and the ingress gateway can read the generated secret.
