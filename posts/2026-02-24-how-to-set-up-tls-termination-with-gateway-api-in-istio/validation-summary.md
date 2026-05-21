# Validation Summary: How to Set Up TLS Termination with Gateway API in Istio

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Istio
- Kubernetes Gateway API
- Kubernetes TLS Secrets
- HTTPRoute and Gateway resources
- ReferenceGrant
- cert-manager ACME HTTP-01 Gateway API solver
- OpenSSL
- kubectl

## Sources Consulted
- Gateway API v1.5 specification: https://gateway-api.sigs.k8s.io/reference/1.5/spec/
- Gateway API HTTP redirects and rewrites guide: https://gateway-api.sigs.k8s.io/guides/user-guides/http-redirect-rewrite/
- Istio secure ingress gateways documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio Kubernetes Gateway API documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/
- Istio TLS configuration documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- OpenSSL req documentation: https://docs.openssl.org/3.6/man1/openssl-req/

## Issues Found
- Replaced `openssl req -nodes` with `openssl req -noenc` because OpenSSL 3.0 and newer deprecate `-nodes` in favor of `-noenc`.
- Clarified the mTLS explanation after TLS termination. The original wording said Istio mTLS always means traffic is not unencrypted in transit; that only holds when the backend participates in the mesh and mTLS is enabled or automatically selected.
- Updated the ReferenceGrant example from `gateway.networking.k8s.io/v1beta1` to `gateway.networking.k8s.io/v1`, matching the current Gateway API v1.5 reference.

## Review Notes
The remaining Gateway, HTTPRoute, RequestRedirect, certificateRefs, cross-namespace Secret reference, cert-manager Certificate, and troubleshooting examples are consistent with current official documentation. The cert-manager Gateway API HTTP-01 solver requires Gateway API support to be enabled in cert-manager and an HTTP listener on port 80; this is a deployment prerequisite readers should keep in mind.
