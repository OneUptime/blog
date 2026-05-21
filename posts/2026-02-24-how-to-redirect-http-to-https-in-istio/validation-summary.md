# Validation Summary: How to Redirect HTTP to HTTPS in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Gateway
- Istio VirtualService
- Istio ingress gateway TLS termination
- Kubernetes TLS Secrets
- cert-manager Certificate resources
- HTTP redirects and HSTS headers
- External load balancer `X-Forwarded-Proto` handling

## Sources Consulted
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Secure Gateways task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Kubernetes `kubectl create secret tls` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- RFC 9110, HTTP Semantics: https://www.rfc-editor.org/rfc/rfc9110

## Issues Found
- Updated Istio `Gateway` and `VirtualService` examples from `networking.istio.io/v1beta1` to the current documented `networking.istio.io/v1` API version.
- Corrected the redirect preservation claim. The path and query string are preserved by the redirect, but URL fragments are not sent to the server or gateway in HTTP requests; fragment inheritance on redirect is handled by the user agent.
- Removed the inaccurate mention of EnvoyFilter approaches from the description because the post does not include an EnvoyFilter section.
- Changed "all the options" to "the common options" because the post covers common Gateway, VirtualService, and load-balancer-header patterns rather than every possible Istio redirect mechanism.

## Review Notes
The snippets are otherwise consistent with Istio's documented `httpsRedirect`, `redirect.scheme`, `redirect.redirectCode`, header match, response header manipulation, wildcard host, and `credentialName` behavior. The `kubectl create secret tls` command uses current documented flags, but `kubectl` was not installed locally, so the command was verified against Kubernetes documentation rather than local `--help` output.
