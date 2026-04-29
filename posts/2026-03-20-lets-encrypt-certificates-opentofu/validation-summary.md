# Validation Summary: How to Manage Let's Encrypt Certificates with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / HCL
- ACME
- Let's Encrypt
- `vancluever/acme` provider
- `hashicorp/tls` provider
- Amazon Route 53
- Cloudflare DNS
- Azure DNS
- AWS Secrets Manager
- AWS Certificate Manager (ACM)
- Kubernetes Secrets

## Sources Consulted
- ACME provider `acme_certificate` docs: https://registry.terraform.io/providers/vancluever/acme/latest/docs/resources/certificate
- ACME provider `acme_registration` docs: https://registry.terraform.io/providers/vancluever/acme/latest/docs/resources/registration
- ACME provider Route 53 DNS challenge guide: https://registry.terraform.io/providers/vancluever/acme/latest/docs/guides/dns-providers-route53
- ACME provider Cloudflare DNS challenge guide: https://registry.terraform.io/providers/vancluever/acme/latest/docs/guides/dns-providers-cloudflare
- ACME provider Azure DNS challenge guide: https://registry.terraform.io/providers/vancluever/acme/latest/docs/guides/dns-providers-azuredns
- AWS provider `aws_acm_certificate` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate
- AWS provider `aws_secretsmanager_secret_version` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_version
- Kubernetes provider `kubernetes_secret` docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret
- Let's Encrypt challenge types: https://letsencrypt.org/docs/challenge-types/
- Let's Encrypt staging environment: https://letsencrypt.org/docs/staging-environment/
- Let's Encrypt shorter lifetime announcement: https://letsencrypt.org/2025/12/02/from-90-to-45
- Let's Encrypt expiration email announcement: https://letsencrypt.org/2025/01/22/ending-expiration-emails.html

## Issues Found
- The ACM import example used `certificate`, but the AWS provider requires `certificate_body` for imported certificates. I updated the snippet accordingly and kept `certificate_chain` limited to the issuer chain.
- The Cloudflare DNS challenge example used `CF_API_TOKEN`, which is not the documented Cloudflare variable for the ACME provider. I changed it to `CF_DNS_API_TOKEN`.
- The Route 53 snippet implied the ACME provider would use credentials from the Terraform AWS provider. I corrected the comment to reflect the AWS SDK credential chain actually used by the DNS challenge provider.
- The renewal flow diagram implied background auto-renewal. I updated it to show that renewal happens on the next `tofu apply` once the certificate is within the `min_days_remaining` window.
- The best-practices note incorrectly suggested using a full leaf-plus-chain bundle when importing into ACM. I corrected it to distinguish ACM import fields from Kubernetes or generic PEM bundle usage.

## Review Notes
- As of April 29, 2026, the post's 90-day lifetime guidance is still accurate for Let's Encrypt's default classic ACME profile. Let’s Encrypt has already announced future changes: the opt-in `tlsserver` profile moves to 45-day certificates on May 13, 2026, and the default classic profile moves to 64-day certificates on February 10, 2027.
- Let's Encrypt ended expiration notification emails on June 4, 2025. The `email_address` field in `acme_registration` remains optional, but it should not be relied on for expiry notices.
- The review was documentation-based. The local environment did not have the `tofu` CLI installed, so no live `tofu init` or `tofu validate` run was performed.
