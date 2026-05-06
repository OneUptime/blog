# Validation Summary: How to Rotate TLS Certificates with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Certificate Manager (ACM)
- Amazon Route 53
- Amazon CloudWatch
- AWS Secrets Manager
- Kubernetes Secrets
- HashiCorp TLS provider

## Sources Consulted
- OpenTofu lifecycle docs: https://opentofu.org/docs/language/meta-arguments/lifecycle/
- OpenTofu resource behavior docs: https://opentofu.org/docs/v1.11/language/resources/behavior/
- OpenTofu `timestamp` function docs: https://opentofu.org/docs/language/functions/timestamp/
- OpenTofu `terraform_data` docs: https://opentofu.org/docs/language/resources/tf-data/
- AWS provider `aws_acm_certificate` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/acm_certificate.html.markdown
- AWS provider `aws_acm_certificate_validation` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/acm_certificate_validation.html.markdown
- AWS provider `aws_secretsmanager_secret` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/secretsmanager_secret.html.markdown
- AWS provider `aws_secretsmanager_secret_version` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/secretsmanager_secret_version.html.markdown
- AWS ACM CloudWatch metrics docs: https://docs.aws.amazon.com/acm/latest/userguide/cloudwatch-metrics.html
- AWS ACM DNS validation docs: https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html
- AWS ACM managed renewal docs: https://docs.aws.amazon.com/acm/latest/userguide/managed-renewal.html
- AWS ACM DNS renewal docs: https://docs.aws.amazon.com/acm/latest/userguide/dns-renewal-validation.html
- HashiCorp TLS provider `tls_private_key` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-tls/main/templates/resources/private_key.md.tmpl
- HashiCorp TLS provider `tls_self_signed_cert` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-tls/main/templates/resources/self_signed_cert.md.tmpl
- HashiCorp Kubernetes provider `kubernetes_secret_v1` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/secret_v1.md

## Issues Found
- The self-managed rotation example claimed that changing `cert_version` recreated the certificate, but the original configuration did not connect `cert_version` to any replacement behavior. I fixed this by adding a `terraform_data` resource and `replace_triggered_by` lifecycle rules so key and certificate rotation is actually triggered when `cert_version` changes.
- The post used `timestamp()` in ACM tags, Secrets Manager payloads, and Kubernetes annotations. OpenTofu documents that `timestamp()` causes a diff on every run when used directly in resource arguments. I removed those uses to prevent perpetual drift and unintended updates.
- The Secrets Manager example encoded the rotation version into the secret name, which would replace the entire secret rather than using Secrets Manager's built-in version history. I changed the example to use a stable secret name and keep the rotation version in the secret payload.
- The Kubernetes example used `create_before_destroy` with a fixed secret name. Kubernetes Secret names must be unique and cannot be updated, so this pattern cannot create two same-name secrets concurrently. I removed that lifecycle block and clarified that fixed-name Secret rotation is an in-place update whose zero-downtime behavior depends on workload reload behavior.
- The introductory text and best-practices section overstated `create_before_destroy` as a universal zero-downtime solution. I narrowed the wording so it only applies where the underlying resource supports concurrent old/new objects.
- The metadata mentioned Key Vault even though the post body does not cover Azure Key Vault. I corrected the tags and description to match the actual technologies in the article.
- The ACM monitoring guidance said renewal validation could fail silently. AWS documents that ACM emits renewal-related events, but renewal still fails if the required DNS validation records are missing or inaccessible. I updated the wording accordingly.

## Review Notes
- The ACM examples are valid for current AWS provider documentation, including `create_before_destroy`, Route 53 validation records, and the `not_after` output attribute.
- `tls_private_key` is still only appropriate with care because the private key is stored unencrypted in state; the post now notes this in the snippet, but teams should still prefer external key generation or HSM/KMS-backed workflows for production.
- The Kubernetes and TLS provider examples remain technically valid, but both providers store sensitive material in state. That is correct behavior for these resources, but it is an operational risk worth keeping in mind for future revisions.
