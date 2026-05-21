# Validation Summary: How to Configure Secure Ingress with TLS Certificates in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Gateway and VirtualService
- Istio ingress gateway TLS termination
- Kubernetes TLS Secrets
- cert-manager ACME certificates
- Let's Encrypt
- OpenSSL and curl verification commands
- istioctl proxy configuration inspection

## Sources Consulted
- Istio Secure Gateways documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio cert-manager integration documentation: https://istio.io/latest/docs/ops/integrations/certmanager/
- Istio Kubernetes Ingress documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/kubernetes-ingress/
- cert-manager kubectl installation documentation: https://cert-manager.io/docs/installation/kubectl/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/

## Issues Found
- The introduction said the post covered Istio SDS as a third setup option, but the third option is mutual TLS. Istio uses SDS to load gateway credentials from Kubernetes secrets, so SDS is not a separate configuration path in the post. Changed the sentence to describe mutual TLS as the third option.
- The cert-manager install command used `v1.14.0`, while the current official static manifest documented by cert-manager is `v1.20.2`. Updated the install URL to `v1.20.2`.
- The ACME HTTP-01 solver used the legacy `class: istio` field. Current cert-manager documentation recommends `ingressClassName`, and Istio's Kubernetes Ingress documentation shows `ingressClassName: istio`. Updated the solver to `ingressClassName: istio`.

## Review Notes
- The Istio Gateway `credentialName`, TLS modes, `httpsRedirect`, TLS protocol version, and cipher suite fields match the current Istio Gateway reference.
- The Kubernetes TLS secret command and mutual TLS secret key names are consistent with Kubernetes and Istio documentation.
- The cert-manager HTTP-01 example assumes an Istio `IngressClass` named `istio` exists and that HTTP-01 challenge traffic can reach the Istio ingress gateway on port 80.
