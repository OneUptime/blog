# Validation Summary: How to Configure ArgoCD with Let's Encrypt Certificates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes Ingress
- cert-manager
- Let's Encrypt ACME
- NGINX Ingress Controller
- Traefik
- AWS Route 53 DNS-01
- Google Cloud DNS DNS-01
- Cloudflare DNS-01
- OpenSSL

## Sources Consulted
- cert-manager kubectl installation documentation: https://cert-manager.io/docs/installation/kubectl/
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Ingress usage documentation: https://cert-manager.io/docs/usage/ingress/
- cert-manager API reference for DNS-01 providers: https://cert-manager.io/docs/reference/api-docs/
- cert-manager cmctl documentation: https://cert-manager.io/docs/reference/cmctl/
- Argo CD Ingress configuration documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Let's Encrypt rate limits documentation: https://letsencrypt.org/docs/rate-limits/
- Let's Encrypt upcoming certificate lifetime changes: https://letsencrypt.org/upcoming-features/
- Let's Encrypt certificates and chains of trust documentation: https://letsencrypt.org/certificates/

## Issues Found
- Updated the cert-manager static manifest install command from v1.14.0 to v1.20.2, matching the current official installation documentation.
- Updated the Helm install example to pin v1.20.2 and use `crds.enabled=true`, which is the current documented value for recent cert-manager Helm charts.
- Replaced the HTTP-01 solver `class` field with `ingressClassName`, because cert-manager now recommends `ingressClassName` for most ingress controllers and reserves `class` mainly for ingress-gce compatibility.
- Removed `email` from the Cloudflare DNS-01 API token example, because cert-manager only requires the email field when using the older API key authentication method.
- Corrected the NGINX ingress annotation comment that implied `ssl-redirect` handled gRPC; it only controls HTTPS redirects.
- Clarified the Let's Encrypt certificate lifetime statement to say it applies to the current default profile and that cert-manager renews after roughly two thirds of the certificate lifetime by default.
- Replaced the old `kubectl cert-manager renew` plugin command with the current `cmctl renew` command.
- Generalized the expected Let's Encrypt issuer name instead of naming the older R3 intermediate, because current issuance may use newer intermediates.
- Corrected the rate-limit retry guidance because Let's Encrypt limits refill on different schedules rather than all resetting after one week.
- Corrected the separate gRPC ingress example from TLS passthrough to TLS termination with a cert-manager-managed TLS secret, matching the earlier `server.insecure: "true"` configuration and Argo CD's documented two-ingress pattern.

## Review Notes
- The article is technically relevant and includes implementation details, so it was reviewed as a code/configuration tutorial.
- Let's Encrypt has announced shorter default certificate lifetimes beginning in 2027, so the 90-day default profile wording may need another update in future.
