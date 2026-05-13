# Validation Summary: How to Configure HTTPS Routing in the Cilium Gateway API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cilium Gateway API
- Kubernetes Gateway API
- Kubernetes HTTPRoute and Gateway resources
- TLS termination
- cert-manager Certificate resources
- Kubernetes TLS Secrets
- OpenSSL
- curl

## Sources Consulted
- Cilium Gateway API HTTPS example: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/https.html
- Cilium Gateway API support documentation: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/gateway-api/
- Kubernetes Gateway API HTTP redirects and rewrites guide: https://gateway-api.sigs.k8s.io/guides/http-redirect-rewrite/
- Kubernetes Gateway API TLS guide: https://gateway-api.sigs.k8s.io/guides/tls/
- Kubernetes Gateway API specification: https://gateway-api.sigs.k8s.io/reference/spec/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- OpenSSL req documentation: https://docs.openssl.org/3.4/man1/openssl-req/

## Issues Found
- The self-signed OpenSSL command created a certificate with only a Common Name. Modern TLS hostname verification expects the DNS name in the Subject Alternative Name extension, so the command was updated to add `subjectAltName=DNS:api.example.com`.
- The verification command did not mention that self-signed certificates fail normal certificate trust validation unless trusted locally. A short testing-only note was added for `curl -vk` when using the self-signed test certificate.

## Review Notes
The Gateway, HTTPRoute, redirect filter, cert-manager Certificate, and `kubectl create secret tls` examples match current official API shapes. Backend traffic in the shown route is HTTP after gateway TLS termination; re-encryption would require additional Gateway API backend TLS configuration and implementation support.
