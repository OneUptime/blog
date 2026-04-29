# Validation Summary: How to Migrate from Terraform to OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI: `tofu`, v1.6+ / v1.7.0)
- Terraform (HCL configuration language)
- AWS provider (`hashicorp/aws` ~> 5.0)
- S3 + DynamoDB remote state backend
- GitHub Actions (workflows, OIDC permissions)
- `opentofu/setup-opentofu` action
- `aws-actions/configure-aws-credentials` action

## Sources Consulted
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/
- OpenTofu environment variables / debugging: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu S3 backend: https://opentofu.org/docs/language/settings/backends/s3/
- `opentofu/setup-opentofu` GitHub Action: https://github.com/opentofu/setup-opentofu
- `actions/upload-artifact` (deprecation of v3): https://github.com/actions/upload-artifact
- `actions/download-artifact`: https://github.com/actions/download-artifact
- `aws-actions/configure-aws-credentials`: https://github.com/aws-actions/configure-aws-credentials
- Terraform/OpenTofu HCL `variable` validation, `locals`, `default_tags`: https://opentofu.org/docs/language/

## Issues Found
- `actions/upload-artifact@v3` was used in the GitHub Actions workflow. v3 was deprecated by GitHub on November 30, 2024 and uploads now fail. Updated to `@v4`.
- `actions/download-artifact@v3` was used in the workflow. Same deprecation applies. Updated to `@v4`. Note that v4 artifacts are immutable and scoped per run, which matches the workflow's plan-then-apply pattern within a single run.

## Review Notes
- The post is titled "Migrate from Terraform to OpenTofu" but is structured more as a "Getting started with OpenTofu" guide — it does not explicitly walk through migrating an existing Terraform state (e.g., reusing the existing `.terraform.lock.hcl`, running `tofu init` against a state previously managed by `terraform`, or differences in lock file behavior). This is a content/scope observation, not a technical inaccuracy, so no changes were made.
- The `terraform { ... }` block is intentionally retained for compatibility with OpenTofu (OpenTofu still parses `terraform` blocks; an alternative `tofu` block exists in newer versions). This is correct.
- `TF_LOG` and `TF_INPUT` environment variables are honored by OpenTofu for backwards compatibility and are valid here. OpenTofu also accepts `TOFU_LOG`, but the `TF_*` form remains supported.
- The S3 backend example uses `dynamodb_table` for state locking. OpenTofu/Terraform also support a newer `use_lockfile = true` option (S3-native locking) which avoids DynamoDB entirely; either is currently valid, so no change was made.
- The `opentofu/setup-opentofu@v1` action with `tofu_version: "1.7.0"` is correct (v1.7 is a real OpenTofu release line). Pinning to a newer minor would also be valid but is a stylistic choice.
- The `aws-actions/configure-aws-credentials@v4` action with `role-to-assume` plus `permissions: id-token: write` is the correct OIDC pattern.
