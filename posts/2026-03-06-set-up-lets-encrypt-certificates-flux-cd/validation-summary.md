# Validation Summary: How to Set Up Let's Encrypt Certificates with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- cert-manager
- Let's Encrypt
- ACME HTTP-01 and DNS-01 challenges
- AWS Route 53
- Cloudflare DNS
- Google Cloud DNS
- SOPS

## Sources Consulted
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Route 53 DNS-01 documentation: https://cert-manager.io/docs/configuration/acme/dns01/route53/
- cert-manager Cloud DNS DNS-01 documentation: https://cert-manager.io/docs/configuration/acme/dns01/google/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- cert-manager supported releases: https://cert-manager.io/docs/releases/
- cert-manager ingress-shim documentation: https://cert-manager.io/docs/tutorials/certificate-defaults/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux v2.6 supported versions announcement: https://fluxcd.io/blog/2025/05/flux-v2.6.0/
- Let's Encrypt challenge type documentation: https://letsencrypt.org/docs/challenge-types/
- Let's Encrypt rate limits documentation: https://letsencrypt.org/docs/rate-limits/
- Let's Encrypt certificate lifetime and rate limit update: https://letsencrypt.org/2026/02/24/rate-limits-45-day-certs.html

## Issues Found
- The prerequisites said Kubernetes v1.24 or later. Current Flux and cert-manager releases only support specific Kubernetes version ranges, and Kubernetes v1.24 is no longer generally covered by current upstream support. Changed the prerequisite to require a Kubernetes version supported by the installed Flux CD and cert-manager releases.
- The ACME explanation implied that Let's Encrypt has only two primary challenge types. Let's Encrypt also documents TLS-ALPN-01. Adjusted the wording to clarify that the guide covers the two common cert-manager Kubernetes workflow challenge types: HTTP-01 and DNS-01.
- The Certificate example described `duration: 2160h` as the Let's Encrypt default. cert-manager treats duration as a requested lifetime and issuers may choose the actual lifetime. Updated the comment to avoid implying that Let's Encrypt must honor the requested duration.
- The AWS section called IRSA the recommended approach. Current cert-manager documentation presents EKS Pod Identity as the simplest ambient credential option for EKS and IRSA as another supported option. Updated the text to mention both and keep the existing IRSA snippet scoped correctly.

## Review Notes
The YAML examples use current stable API versions for cert-manager Certificate and ClusterIssuer resources, Kubernetes networking.k8s.io/v1 Ingress, Flux Kustomization v1, and Flux HelmRelease v2. The kubectl troubleshooting commands are valid for the cert-manager resources discussed. The Cloudflare secret shown in Git should be encrypted before committing, and the Flux SOPS example already shows the relevant decryption configuration.
