# Validation Summary: How to Generate Self-Signed Certificates with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.5.0)
- HashiCorp TLS provider (~> 4.0)
- HashiCorp AWS provider (~> 5.0)
- `tls_private_key` resource (RSA and ECDSA)
- `tls_self_signed_cert` resource
- `aws_acm_certificate` (certificate import)
- `aws_secretsmanager_secret` / `aws_secretsmanager_secret_version`
- X.509 certificates / PKI / TLS

## Sources Consulted
- HashiCorp TLS provider docs — `tls_self_signed_cert`: https://github.com/hashicorp/terraform-provider-tls/blob/main/docs/resources/self_signed_cert.md
- HashiCorp TLS provider docs — `tls_private_key`: https://github.com/hashicorp/terraform-provider-tls/blob/main/docs/resources/private_key.md
- HashiCorp AWS provider docs — `aws_acm_certificate`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/acm_certificate.html.markdown

## Issues Found
No technical issues found.

Verified items:
- `tls_self_signed_cert` arguments: `private_key_pem`, `subject` block (with `common_name`, `organization`, `organizational_unit`, `country`, `province`, `locality`), `dns_names`, `ip_addresses`, `validity_period_hours`, `allowed_uses`, `is_ca_certificate` — all correct.
- `allowed_uses` values used (`key_encipherment`, `digital_signature`, `server_auth`, `client_auth`, `cert_signing`, `crl_signing`) are all valid per the provider's documented enumeration.
- Output attributes `cert_pem`, `validity_start_time`, `validity_end_time` are correct computed attributes.
- `tls_private_key` arguments: `algorithm` (`RSA`, `ECDSA`), `rsa_bits` (2048, 4096), `ecdsa_curve` (`P256`) — all correct.
- `aws_acm_certificate` import arguments `private_key` and `certificate_body` are correct; `certificate_chain` is optional and may be omitted for self-signed certs.
- `aws_secretsmanager_secret` (`name`) and `aws_secretsmanager_secret_version` (`secret_id`, `secret_string`) usage is correct.
- Math checks: 8760 hours = 365 days; 87600 hours = 10 years. Both correct.

## Review Notes
- For CA certificates, setting `set_subject_key_id = true` is commonly recommended to aid chain building; the post does not include this, but it is not a correctness issue.
- The post correctly notes that self-signed certificates should not be used for public-facing production services. AWS ACM does accept imported self-signed certificates, though not all integrated services accept them — this is a deployment caveat rather than a Terraform correctness issue.
- ED25519 is also supported by `tls_private_key` but is not covered in this post (intentionally; ECDSA is shown as the modern alternative).
- The two internal links in the conclusion point to sibling posts in the same blog series; their existence was not separately verified but the URL structure matches the project's pattern.
