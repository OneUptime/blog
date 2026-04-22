# Validation Summary: How to Create Self-Signed Certificates with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- HashiCorp TLS provider
- AWS Secrets Manager
- AWS Private CA and ACM
- Kubernetes Secrets and Ingress
- TLS certificates and private PKI

## Sources Consulted
- OpenTofu provider requirements documentation: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu sensitive data in state documentation: https://opentofu.org/docs/language/state/sensitive-data/
- OpenTofu output values documentation: https://opentofu.org/docs/language/values/outputs/
- HashiCorp TLS provider `tls_private_key` documentation: https://github.com/hashicorp/terraform-provider-tls/blob/main/docs/resources/private_key.md
- HashiCorp TLS provider `tls_self_signed_cert` documentation: https://github.com/hashicorp/terraform-provider-tls/blob/main/docs/resources/self_signed_cert.md
- HashiCorp TLS provider `tls_cert_request` documentation: https://github.com/hashicorp/terraform-provider-tls/blob/main/docs/resources/cert_request.md
- HashiCorp TLS provider `tls_locally_signed_cert` documentation: https://github.com/hashicorp/terraform-provider-tls/blob/main/docs/resources/locally_signed_cert.md
- HashiCorp TLS provider `tls_certificate` data source documentation: https://github.com/hashicorp/terraform-provider-tls/blob/main/docs/data-sources/certificate.md
- AWS provider `aws_secretsmanager_secret` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/secretsmanager_secret.html.markdown
- AWS provider `aws_secretsmanager_secret_version` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/secretsmanager_secret_version.html.markdown
- Kubernetes provider `kubernetes_secret` documentation: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/secret.md
- Kubernetes provider `kubernetes_ingress_v1` documentation: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/ingress_v1.md
- AWS Certificate Manager private certificate renewal documentation: https://docs.aws.amazon.com/acm/latest/userguide/managed-renewal.html

## Issues Found
- The certificate generation flow listed `tls_certificate` as an application mount option. `tls_certificate` is a TLS provider data source for reading certificate information, not a way to mount certificates into applications. Changed the diagram to say `application config`.
- The introduction and best practices did not make clear that generated private keys and secret values still reside in OpenTofu state. Added state-protection guidance and clarified that `sensitive = true` redacts output but does not remove values from state.
- The AWS Secrets Manager example mixed `tls_self_signed_cert.server` and `tls_private_key.server` with `tls_self_signed_cert.ca`, producing a bundle where the listed CA did not sign the listed certificate. Updated the example to store the CA-signed service certificate, service private key, and matching CA certificate.
- The AWS Private CA note implied automated renewal broadly. Clarified that ACM can automatically renew eligible private certificates requested through ACM from the private CA.

## Review Notes
The HCL snippets were reviewed against current official provider documentation. Local CLI validation could not be run because neither `tofu` nor `terraform` is installed in the environment.
