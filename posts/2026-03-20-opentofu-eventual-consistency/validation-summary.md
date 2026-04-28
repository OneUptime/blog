# Validation Summary: How to Deal with Eventual Consistency in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (v1.6+, with `setup-opentofu@v1` pinning to 1.7.0)
- Terraform configuration language (HCL)
- AWS provider (`hashicorp/aws ~> 5.0`)
- AWS S3 + DynamoDB remote state backend
- Azure (`ARM_SUBSCRIPTION_ID`) and GCP (`GOOGLE_APPLICATION_CREDENTIALS`) credential env vars
- GitHub Actions (`actions/checkout`, `opentofu/setup-opentofu`, `aws-actions/configure-aws-credentials`, `actions/upload-artifact`, `actions/download-artifact`)

## Sources Consulted
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu environment variables (`TF_LOG`, `TF_INPUT`): https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu variable validation: https://opentofu.org/docs/language/values/variables/#custom-validation-rules
- `opentofu/setup-opentofu` GitHub Action: https://github.com/opentofu/setup-opentofu
- `aws-actions/configure-aws-credentials` GitHub Action: https://github.com/aws-actions/configure-aws-credentials
- GitHub Actions artifact deprecation notice (v3 → v4, effective 2025-01-30): https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/
- Terraform AWS provider documentation (`default_tags`): https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- **Deprecated GitHub Actions version**: The original workflow used `actions/upload-artifact@v3` and `actions/download-artifact@v3`. GitHub deprecated v3 of these actions on 2025-01-30 and they now fail when invoked. Updated both to `@v4`, which is the supported major version. The single-job upload/single-job download pattern in this post is fully compatible with v4 semantics, so no other workflow changes were required.

## Review Notes
- Scope mismatch (not a technical error, so left untouched per review rules): the title and introduction promise coverage of eventual-consistency mitigation patterns (`time_sleep`, `depends_on`, retry patterns), but the body is a generic OpenTofu setup/automation walkthrough and does not actually demonstrate any of those patterns. A future revision should either retitle the post or add concrete sections demonstrating the `hashicorp/time` provider's `time_sleep` resource, explicit `depends_on` for ordering against eventually-consistent APIs, and provider-level retry knobs.
- The S3 backend block uses `dynamodb_table` for state locking. This is still supported, but OpenTofu 1.10+ also offers native S3 lockfile-based locking via `use_lockfile = true`, which removes the DynamoDB dependency. Worth mentioning in a future update.
- The pinned `tofu_version: "1.7.0"` is valid but conservative; OpenTofu has since released 1.8.x and 1.9.x lines with additional features. Not a correctness issue.
- `TF_LOG` and `TF_INPUT` are honored by OpenTofu (inherited from the Terraform CLI heritage), so those env-var examples are correct.
- The HCL examples (`terraform` block, `provider "aws"` with `default_tags`, `locals`, `variable` with `validation`) are syntactically valid and align with current OpenTofu language semantics.
