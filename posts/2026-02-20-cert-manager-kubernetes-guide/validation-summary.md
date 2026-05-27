# Validation Summary: How to Automate TLS Certificates with cert-manager on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- cert-manager
- Let's Encrypt ACME
- Kubernetes Ingress
- Kubernetes Secrets
- Helm
- Cloudflare DNS-01
- Prometheus metrics

## Sources Consulted
- cert-manager installation documentation: https://cert-manager.io/docs/installation/
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Ingress usage documentation: https://cert-manager.io/docs/usage/ingress/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager Cloudflare DNS-01 documentation: https://cert-manager.io/docs/configuration/acme/dns01/cloudflare/
- Let's Encrypt rate limits documentation: https://letsencrypt.org/docs/rate-limits/
- Let's Encrypt expiration email announcement: https://letsencrypt.org/2025/01/22/ending-expiration-emails.html

## Issues Found
- The static `kubectl apply` install command referenced cert-manager `v1.14.0`, which is outdated for this 2026 post. Updated it to the current documented release, `v1.20.2`.
- The Helm install example did not pin a chart version. Added `--version v1.20.2` to match the current cert-manager documentation.
- The ACME HTTP-01 solver examples used `http01.ingress.class`. Current cert-manager documentation recommends `http01.ingress.ingressClassName` for most ingress controllers, with `class` mainly recommended for ingress-gce compatibility. Updated both HTTP-01 issuer examples.
- The explicit `Certificate` example included a wildcard DNS name while referencing the HTTP-01 production issuer. Wildcard certificates require DNS-01 validation, so this example would fail as written. Replaced the wildcard entry with a non-wildcard DNS name; the following DNS-01 section still covers wildcard certificates.
- The Cloudflare DNS-01 API token example included `email`, which is used with Global API Key examples but is not part of the API token example in cert-manager's current Cloudflare documentation. Removed it from the token-based solver snippet.
- The Let's Encrypt issuer comment described the ACME email as being for certificate notifications. Since Let's Encrypt ended expiration notification emails on June 4, 2025, changed the wording to "ACME account contact."
- The lifecycle diagram said cert-manager stores the certificate "in Ingress." cert-manager stores issued certificates in Kubernetes Secrets referenced by Ingress resources, so the diagram text was corrected.

## Review Notes
- The post remains technically accurate after the fixes. The legacy Jetstack Helm repository is still documented, though cert-manager's current documentation recommends OCI charts for the latest versions.
- The troubleshooting commands are valid for cert-manager resources, but in real clusters `kubectl describe certificate app-certificate` and `kubectl get secret app-tls-secret` assume the `default` namespace unless `-n` is supplied.
