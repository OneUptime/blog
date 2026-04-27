# Validation Summary: How to Set Up OpenTofu with Scalr

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- OpenTofu (CLI: `tofu`)
- Terraform/HCL configuration language
- AWS provider (`hashicorp/aws ~> 5.0`)
- AWS S3 + DynamoDB remote state backend
- GitHub Actions (`opentofu/setup-opentofu`, `aws-actions/configure-aws-credentials`, `actions/upload-artifact`, `actions/download-artifact`, `actions/checkout`)
- Environment variables (`TF_LOG`, `TF_INPUT`, `AWS_PROFILE`, `ARM_SUBSCRIPTION_ID`, `GOOGLE_APPLICATION_CREDENTIALS`)

## Sources Consulted
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/
- OpenTofu environment variables: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu S3 backend: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu variable validation: https://opentofu.org/docs/language/values/variables/#custom-validation-rules
- `opentofu/setup-opentofu` GitHub Action: https://github.com/opentofu/setup-opentofu
- `actions/upload-artifact` deprecation notice (v3 → v4): https://github.com/actions/upload-artifact
- `aws-actions/configure-aws-credentials` v4 documentation: https://github.com/aws-actions/configure-aws-credentials
- AWS provider documentation (Terraform Registry): https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- **`actions/upload-artifact@v3` is deprecated.** GitHub deprecated v3 of the artifact actions and as of early 2025 v3 workflows began failing on GitHub-hosted runners. Replaced with `actions/upload-artifact@v4`.
- **`actions/download-artifact@v3` is deprecated.** Same deprecation as above. Replaced with `actions/download-artifact@v4`. Note that v4 of these actions is incompatible with v3 across upload/download — using both at v4 keeps the workflow consistent.

## Review Notes
- **Title vs. content mismatch:** The post is titled "How to Set Up OpenTofu with Scalr" and the description mentions Scalr workspaces and policy-as-code, but the body never references Scalr — it is a generic OpenTofu + GitHub Actions tutorial using an S3/DynamoDB backend. This is a content/scope issue rather than a technical correctness issue, so per the review instructions (only fix technical errors, do not restructure the post) it has been left as-is. The author may wish to either rename the post or replace the GitHub Actions / S3 backend section with actual Scalr workspace configuration (`scalr` provider, Scalr CLI, or VCS-driven workspaces).
- The `opentofu/setup-opentofu@v1` action and `tofu_version: "1.7.0"` are valid; OpenTofu 1.7 was a stable release. As of 2026 newer minor releases (1.8/1.9) exist, but pinning to 1.7.0 still works and is a reasonable choice for a tutorial.
- The S3 backend configuration with `dynamodb_table` for locking is the legacy locking mechanism. OpenTofu 1.10+ supports native S3 lockfiles via `use_lockfile = true` (no DynamoDB needed). The DynamoDB approach in the post is still valid and supported, just no longer the only option.
- `tofu show tfplan` (without `-json`) prints the plan in human-readable form — correct usage.
- The `validation` block syntax in Step 6 is correct for OpenTofu (and Terraform 0.13+).
- AWS provider `default_tags` block syntax is correct for AWS provider v5.x.
