# Validation Summary: How to Configure Multiple TLS Certificates on Istio Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Gateway and VirtualService
- Kubernetes TLS Secrets
- Istio SDS / Envoy certificate loading
- cert-manager ACME certificates
- Helm
- OpenSSL
- curl
- istioctl

## Sources Consulted
- Istio secure ingress gateway documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio Kubernetes Ingress documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/kubernetes-ingress/
- Istio cert-manager integration documentation: https://istio.io/latest/docs/ops/integrations/certmanager/
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- OpenSSL req documentation: https://docs.openssl.org/3.1/man1/openssl-req/
- curl command help for `--resolve`

## Issues Found
- The introduction stated that each domain needs its own TLS certificate. Updated this to say each domain needs a TLS certificate that covers it, because a single SAN or wildcard certificate can cover multiple domains.
- The self-signed certificate examples only generated certificates for two of the three secrets created earlier. Added a matching self-signed certificate command for `anotherdomain.com`.
- The self-signed certificate examples relied only on the certificate common name. Added `subjectAltName` extensions so the generated certificates include the DNS names modern TLS clients validate.
- The OpenSSL examples used deprecated `-nodes`. Updated them to `-noenc`, the current OpenSSL option for generating an unencrypted private key.
- The cert-manager Helm install command used the older `installCRDs=true` value. Updated it to `crds.enabled=true` to match current cert-manager Helm documentation.
- The cert-manager HTTP-01 solver used `class: istio`. Updated it to `ingressClassName: istio`, which cert-manager currently recommends for most ingress controllers and Istio documents for Kubernetes Ingress.

## Review Notes
The Istio Gateway and VirtualService examples are syntactically consistent with the Istio networking API and correctly use separate HTTPS server entries with distinct `credentialName` values. The secret namespace guidance is correct for the default Istio ingress gateway namespace. For production, operators should still verify their installed Istio and cert-manager versions because Helm values and ingress solver behavior are version-sensitive.
