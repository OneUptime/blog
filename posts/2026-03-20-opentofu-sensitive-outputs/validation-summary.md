# Validation Summary: How to Deal with Sensitive Data in OpenTofu Outputs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (v1.6+ / v1.7.0)
- HCL (HashiCorp Configuration Language)
- AWS provider (hashicorp/aws ~> 5.0)
- AWS S3 + DynamoDB remote state backend
- Azure / GCP credentials environment variables
- GitHub Actions (opentofu/setup-opentofu, aws-actions/configure-aws-credentials, actions/checkout, actions/upload-artifact, actions/download-artifact)

## Sources Consulted
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/
- OpenTofu environment variables (TF_LOG, TF_INPUT): https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu `terraform` settings block: https://opentofu.org/docs/language/settings/
- AWS provider documentation (Terraform Registry): https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- opentofu/setup-opentofu GitHub Action: https://github.com/opentofu/setup-opentofu
- aws-actions/configure-aws-credentials: https://github.com/aws-actions/configure-aws-credentials
- actions/upload-artifact and actions/download-artifact deprecation announcement (v3 deprecated, v4 is current): https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/
- AWS_PROFILE env var: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html
- Azure ARM_SUBSCRIPTION_ID: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- GCP GOOGLE_APPLICATION_CREDENTIALS: https://cloud.google.com/docs/authentication/application-default-credentials

## Issues Found
- **Deprecated `actions/upload-artifact@v3`**: The v3 versions of `actions/upload-artifact` and `actions/download-artifact` were deprecated by GitHub in 2024 and have been progressively retired. Updated both occurrences in the workflow YAML to `@v4`, which is the current supported version. Note that v4 has known incompatibilities with v3 within the same workflow (artifacts uploaded with v4 cannot be downloaded with v3 and vice versa), but since this post uses both, upgrading both keeps them consistent.

## Review Notes
- The post's title and description promise a guide on handling sensitive data in OpenTofu outputs (using the `sensitive` attribute on `output` blocks and similar features), but the body is a generic OpenTofu setup walkthrough and does not actually cover sensitive outputs, the `sensitive = true` flag, `nonsensitive()` function, or how sensitive values flow through plan/state files. Per review guidelines, this is a content/scope mismatch rather than a technical inaccuracy, so no new sections were added. The author may want to revisit the body to align it with the title in a future revision.
- `tofu refresh` (mentioned in Troubleshooting) still exists in OpenTofu but is considered legacy and emits a hint to use `tofu apply -refresh-only` instead. This is not incorrect, just worth noting.
- The S3 backend block uses the legacy `dynamodb_table` attribute for state locking. As of newer AWS provider/OpenTofu versions, native S3 conditional-write locking (`use_lockfile = true`) is also available, but `dynamodb_table` remains supported and correct.
- The `terraform { ... }` settings block name is intentionally retained in OpenTofu for compatibility; this is correct as written.
