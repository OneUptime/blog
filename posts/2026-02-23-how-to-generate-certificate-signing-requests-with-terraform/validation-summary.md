# Validation Summary: How to Generate Certificate Signing Requests with Terraform

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Terraform (>= 1.5.0)
- HashiCorp `tls` provider (~> 4.0): `tls_cert_request`, `tls_private_key`, `tls_self_signed_cert`, `tls_locally_signed_cert`
- HashiCorp `aws` provider (~> 5.0): `aws_acm_certificate`, `aws_ssm_parameter`, `aws_secretsmanager_secret`, `aws_secretsmanager_secret_version`
- PKI / TLS concepts: CSRs, Subject Alternative Names (SANs), Certificate Authorities, mutual TLS, SPIFFE identifiers

## Sources Consulted
- HashiCorp `tls` provider docs — `tls_cert_request`: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/cert_request
- HashiCorp `tls` provider docs — `tls_private_key`: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/private_key
- HashiCorp `tls` provider docs — `tls_self_signed_cert`: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/self_signed_cert
- HashiCorp `tls` provider docs — `tls_locally_signed_cert`: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/locally_signed_cert
- HashiCorp `aws` provider docs — `aws_acm_certificate`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate

## Issues Found
No technical issues found. All resource names, argument names, nested block fields, accepted enum values for `allowed_uses` (`cert_signing`, `crl_signing`, `key_encipherment`, `digital_signature`, `server_auth`, `client_auth`), and output attributes match the official HashiCorp `tls ~> 4.0` and `aws ~> 5.0` provider schemas. The `aws_acm_certificate` import arguments (`private_key`, `certificate_body`, `certificate_chain`) are correct.

## Review Notes
- The post pins `tls ~> 4.0`, which is appropriate. Readers using tls provider v3.x would need `cert_sign` / `crl_sign` (older naming) instead of `cert_signing` / `crl_signing`; not an error here but worth being aware of for backporting.
- The `ecdsa_curve` default in `tls_private_key` is `P224`, not `P256`. The post correctly sets `ecdsa_curve = "P256"` explicitly in the client cert example, so this is handled.
- Using a 30-day validity (`720` hours) for client certs is a reasonable recommendation for mTLS; some service mesh deployments use even shorter lifetimes.
- Subject Alternative Names (`dns_names`, `ip_addresses`, `uris`) on `tls_cert_request` translate into the standard X.509 SAN extension on the resulting CSR, which is correctly used here.
