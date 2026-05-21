# Validation Summary: How to Set Up Multiple TLS Hosts on Istio Ingress Gateway

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio Ingress Gateway
- Istio Gateway and VirtualService APIs
- Kubernetes TLS Secrets
- TLS, HTTPS, and SNI
- cert-manager Certificate resources
- istioctl
- kubectl
- OpenSSL

## Sources Consulted
- Istio Secure Gateways task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- cert-manager Certificate usage docs: https://cert-manager.io/v1.16-docs/usage/certificate/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- RFC 2818, HTTP Over TLS server identity matching: https://datatracker.ietf.org/doc/html/rfc2818#section-3.1

## Issues Found
- The HTTP-to-HTTPS redirect Gateway example omitted the `admin.example.com` HTTPS server while including `admin.example.com` in the HTTP redirect hosts. Added the missing `https-admin` server so the example remains complete when used as a full Gateway manifest.
- The wildcard certificate section said all subdomains of `example.com` share the wildcard certificate. Clarified that a standard `*.example.com` wildcard covers matching one-label names such as `api.example.com`, but not `example.com` or nested names such as `v1.api.example.com`, based on TLS hostname matching rules.
- The mixed wildcard and specific certificate section said all other subdomains use the wildcard. Narrowed this to other matching subdomains to avoid implying coverage beyond the wildcard certificate's valid hostnames.

## Review Notes
The Istio API snippets use the current `networking.istio.io/v1` Gateway and VirtualService resources, and the `credentialName`, `httpsRedirect`, `mode: SIMPLE`, `hosts`, and `port` fields match the current Istio reference. The `kubectl create secret tls`, cert-manager `Certificate`, and `istioctl proxy-config` commands are consistent with official references. Local `kubectl` and `istioctl` binaries were not installed in this workspace, so CLI verification used official command documentation rather than local `--help` output.
