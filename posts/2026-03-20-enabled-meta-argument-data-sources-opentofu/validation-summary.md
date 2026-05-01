# Validation Summary: How to Use the enabled Meta-Argument with Data Sources in OpenTofu - Opentofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS Provider for Terraform/OpenTofu
- Google Provider for Terraform/OpenTofu

## Sources Consulted
- OpenTofu `enabled` meta-argument docs: https://opentofu.org/docs/v1.11/language/meta-arguments/enabled/
- OpenTofu data sources docs: https://opentofu.org/docs/v1.11/language/data-sources/
- OpenTofu 1.11 release notes: https://opentofu.org/docs/intro/whats-new/
- AWS provider `aws_vpc` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/vpc.html.markdown
- AWS provider `aws_secretsmanager_secret_version` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/secretsmanager_secret_version.html.markdown
- AWS provider `aws_wafv2_web_acl` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/wafv2_web_acl.html.markdown
- AWS provider `aws_guardduty_detector` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/guardduty_detector.html.markdown
- AWS provider `aws_acm_certificate` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/acm_certificate.html.markdown
- AWS provider `aws_route53_zone` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/route53_zone.html.markdown
- AWS provider `aws_eks_cluster` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/eks_cluster.html.markdown
- AWS provider `aws_eks_cluster_auth` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/eks_cluster_auth.html.markdown
- AWS provider `aws_kms_key` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/kms_key.html.markdown
- AWS provider `aws_s3_bucket` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/s3_bucket.html.markdown
- AWS provider `aws_s3_bucket_server_side_encryption_configuration` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_server_side_encryption_configuration.html.markdown
- Google provider `google_storage_bucket` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/d/storage_bucket.html.markdown

## Issues Found
- The post used `enabled` as a top-level argument on `data` and `resource` blocks. In OpenTofu v1.11, `enabled` must be set inside a `lifecycle` block, so all examples were corrected to use the documented syntax.
- The introduction and conclusion said that disabled data source attributes return `null`. OpenTofu documents that the resource itself evaluates to `null`, and direct attribute access on that null value errors, so the wording was corrected to reflect the actual behavior.
- The post did not state that `enabled` was introduced in OpenTofu v1.11. The introduction was updated so the version requirement is explicit.

## Review Notes
- The provider-specific arguments and attribute names used in the examples match the current official provider documentation reviewed on 2026-05-01.
- The snippets are partial examples and assume the surrounding variables, providers, and prerequisite resources are defined elsewhere.
