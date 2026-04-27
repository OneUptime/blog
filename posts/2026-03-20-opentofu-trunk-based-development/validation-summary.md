# Validation Summary: How to Implement Trunk-Based Development for OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (v1.6+, v1.7.0)
- HCL (HashiCorp Configuration Language)
- AWS provider (`hashicorp/aws` ~> 5.0)
- AWS S3 + DynamoDB remote state backend
- GitHub Actions (CI/CD workflow)
- `opentofu/setup-opentofu` action
- `aws-actions/configure-aws-credentials` (OIDC)

## Sources Consulted
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu `terraform` block / `required_version`: https://opentofu.org/docs/language/settings/
- OpenTofu variable validation: https://opentofu.org/docs/language/values/variables/#custom-validation-rules
- OpenTofu setup action: https://github.com/opentofu/setup-opentofu
- GitHub Actions artifact v3 deprecation notice: https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/
- `actions/upload-artifact` v4: https://github.com/actions/upload-artifact
- `actions/download-artifact` v4: https://github.com/actions/download-artifact
- `aws-actions/configure-aws-credentials`: https://github.com/aws-actions/configure-aws-credentials
- OpenTofu environment variables (TF_LOG, TF_INPUT): https://opentofu.org/docs/cli/config/environment-variables/

## Issues Found
- **`actions/upload-artifact@v3` and `actions/download-artifact@v3`** — these versions were deprecated by GitHub in 2024 and stopped working entirely on January 30, 2025. Workflows using v3 fail with an error directing users to v4. Updated both action references in the GitHub Actions workflow (Step 4) from `@v3` to `@v4`. The single-artifact / single-job pattern used here works as-is under v4, since v4 only requires that artifact names be unique within a workflow run (which they are).

## Review Notes
- The post mentions "trunk-based development with feature flags and progressive delivery" in the title and intro, but the body is a generic OpenTofu CI/CD tutorial — it does not actually cover feature flag patterns, environment branching, or progressive delivery techniques specific to trunk-based development. This is a content/scope mismatch rather than a technical inaccuracy, so no edits were made.
- The S3 backend example uses `dynamodb_table` for state locking. This is still fully supported, but as of OpenTofu 1.10 the backend also supports native S3 locking via the `use_lockfile = true` argument, which removes the DynamoDB dependency. Worth noting for a future revision.
- `tofu_version: "1.7.0"` in the workflow is valid; `opentofu/setup-opentofu@v1` accepts an explicit version string.
- The `terraform { ... }` configuration block name is correct for OpenTofu — OpenTofu intentionally retains the `terraform` block name for backwards compatibility with existing Terraform configurations.
- The `provider "aws"` block references `var.aws_region`, `var.environment`, and `var.repository_url` which are not declared in the snippet. Readers are expected to declare these themselves; this is a normal omission for a tutorial snippet, not an error.
