# Validation Summary: How to Set Up OpenTofu with Spacelift

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (1.6+ / 1.7)
- HCL (Terraform configuration language)
- AWS provider (hashicorp/aws ~> 5.0)
- AWS S3 / DynamoDB (remote state backend)
- GitHub Actions (CI/CD workflow)
- `opentofu/setup-opentofu` action
- `aws-actions/configure-aws-credentials` action
- `actions/upload-artifact` / `actions/download-artifact`

## Sources Consulted
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu setup-opentofu action: https://github.com/opentofu/setup-opentofu
- GitHub Actions artifact actions deprecation notice: https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/
- `actions/upload-artifact` v4: https://github.com/actions/upload-artifact
- `actions/download-artifact` v4: https://github.com/actions/download-artifact
- HashiCorp / OpenTofu HCL `validation` block reference: https://opentofu.org/docs/language/values/variables/#custom-validation-rules

## Issues Found
1. **Deprecated `opentofu/setup-opentofu@v1`** — A v2.0.0 release has superseded v1 (Node.js runtime updated to Node 24). Updated both occurrences in the GitHub Actions workflow to `opentofu/setup-opentofu@v2`. The `tofu_version` input remains valid in v2.
2. **Retired `actions/upload-artifact@v3` and `actions/download-artifact@v3`** — GitHub deprecated v3 of these actions in April 2024 and fully shut them down on January 30, 2025. Workflows pinned to v3 now fail. Updated to `@v4` for both. The post's usage pattern (single artifact named `tfplan`, uploaded once and downloaded by name) is compatible with v4 semantics (immutable artifacts, one upload per name per run).

## Review Notes
- The post's title references "Spacelift," but the body contains no Spacelift-specific content (it documents OpenTofu plus a GitHub Actions workflow). This is a content/scope mismatch, not a technical inaccuracy, and is outside the scope of this technical review (no new sections were added).
- The `terraform { }` block (rather than a hypothetical `tofu { }` block) is correct — OpenTofu retains the `terraform` block name for HCL compatibility.
- `hashicorp/aws` resolves correctly through OpenTofu's registry (`registry.opentofu.org`), which mirrors HashiCorp providers.
- The S3 backend uses `dynamodb_table` for state locking, which is valid for OpenTofu 1.6/1.7. Note for future updates: OpenTofu 1.10+ (May 2025) added native S3 locking via the `use_lockfile` argument, removing the DynamoDB requirement. The post does not claim native locking is available in 1.6/1.7, so no change was needed, but this is worth refreshing if the post is revised.
- `TF_LOG`, `TF_INPUT`, and the `-refresh-only` flag are all valid in OpenTofu (inherited from Terraform compatibility).
- The HCL `variable` `validation` block syntax is correct for OpenTofu 1.6+.
