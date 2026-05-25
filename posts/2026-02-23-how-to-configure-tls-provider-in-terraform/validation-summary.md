# Validation Summary: How to Configure TLS Provider in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp TLS provider
- X.509 certificates, CSRs, private keys, and self-signed certificates
- AWS ACM, ALB listeners, EC2 key pairs, and EC2 instances
- Kubernetes TLS Secrets
- Terraform lifecycle replacement with `terraform_data`

## Sources Consulted
- HashiCorp TLS provider documentation: https://registry.terraform.io/providers/hashicorp/tls/latest/docs
- `tls_private_key` resource documentation: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/private_key
- `tls_self_signed_cert` resource documentation: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/self_signed_cert
- `tls_cert_request` resource documentation: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/cert_request
- `tls_locally_signed_cert` resource documentation: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/locally_signed_cert
- `tls_certificate` data source documentation: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/data-sources/certificate
- `tls_public_key` data source documentation: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/data-sources/public_key
- Terraform `terraform_data` resource reference: https://developer.hashicorp.com/terraform/language/resources/terraform-data
- Terraform lifecycle meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- AWS provider `aws_acm_certificate` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate
- AWS provider `aws_key_pair` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/key_pair
- Kubernetes provider `kubernetes_secret` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The post stated that the TLS provider has no configuration options. Current provider documentation lists optional proxy-related provider configuration. Changed the wording to say the provider has no required configuration for typical use.
- The certificate rotation example declared `cert_rotation_date` but did not use it, so changing the variable would not recreate the certificate. Added a `terraform_data` resource and `replace_triggered_by` lifecycle rule so the example actually rotates when the date changes.
- The post's prerequisite said Terraform 1.0 or later, but the corrected `terraform_data` example requires Terraform 1.4 or later. Updated the prerequisite with that caveat.

## Review Notes
- Terraform CLI was not installed in the local environment, so validation was performed against official documentation rather than by running `terraform validate`.
- The TLS provider stores generated private keys in Terraform state; the post's warning about state exposure is correct and aligns with the provider documentation.
- The AWS and Kubernetes examples are partial integration snippets and assume the relevant providers and surrounding resources, such as the ALB, target group, EC2 AMI, and Kubernetes provider configuration, are defined elsewhere.
