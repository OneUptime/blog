# Validation Summary: How to Configure ClusterIssuer with Let's Encrypt and cert-manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- cert-manager
- Let's Encrypt ACME
- ClusterIssuer and Issuer resources
- HTTP-01 and DNS-01 challenges
- Kubernetes Ingress
- Cloudflare DNS-01 solver
- kubectl and cmctl

## Sources Consulted
- cert-manager kubectl install documentation: https://cert-manager.io/docs/installation/kubectl/
- cert-manager Issuer concepts documentation: https://cert-manager.io/docs/concepts/issuer/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Cloudflare DNS-01 documentation: https://cert-manager.io/docs/configuration/acme/dns01/cloudflare/
- cert-manager Certificate resource and renewal documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager cmctl documentation: https://cert-manager.io/docs/reference/cmctl/
- cert-manager Ingress annotation documentation: https://cert-manager.io/docs/usage/ingress/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- Let's Encrypt challenge types documentation: https://letsencrypt.org/docs/challenge-types/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/

## Issues Found
- The install command used cert-manager v1.14.4, while the current official static manifest example uses v1.20.2. Updated the URL to v1.20.2 so the tutorial uses the current release.
- The Cloudflare DNS-01 API token example included `email`. cert-manager's API reference says Cloudflare account email is only required for API key authentication, and the official API token example omits it. Removed the unnecessary `email` field from the API token configuration.
- The renewal section said the default renewal time is 30 days before expiration. Current cert-manager documentation says the default is two-thirds through the issued certificate's actual duration, which is about 30 days before expiration for a 90-day certificate. Updated the wording.
- The manual renewal instructions recommended deleting the certificate Secret or removing an annotation. Current cert-manager documentation recommends `cmctl renew` for manual renewal and explicitly does not recommend deleting the Secret for this purpose. Replaced the commands with `cmctl renew app-example-com-tls -n production`.

## Review Notes
- The ClusterIssuer, Certificate, Ingress, HTTP-01, and DNS-01 manifest structures use current `cert-manager.io/v1` and `networking.k8s.io/v1` APIs.
- The `ingressClassName` HTTP-01 solver field is valid for cert-manager 1.12 and later.
- The Ingress example assumes the Ingress is created in the target application namespace; the generated Certificate and TLS Secret will be created in that same namespace.
