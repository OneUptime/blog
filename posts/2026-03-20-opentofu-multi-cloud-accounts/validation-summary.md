# Validation Summary: How to Manage OpenTofu Across Multiple Cloud Accounts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (v1.6+, with example referencing v1.7.0)
- HCL (HashiCorp Configuration Language)
- AWS Provider (`hashicorp/aws` v5.x)
- AWS S3 + DynamoDB remote state backend
- Azure (ARM_SUBSCRIPTION_ID env var reference)
- GCP (GOOGLE_APPLICATION_CREDENTIALS env var reference)
- GitHub Actions (`opentofu/setup-opentofu`, `aws-actions/configure-aws-credentials`, `actions/checkout`, `actions/upload-artifact`, `actions/download-artifact`)

## Sources Consulted
- OpenTofu CLI reference: https://opentofu.org/docs/cli/
- OpenTofu environment variables (TF_LOG, TF_INPUT): https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu releases (1.6, 1.7): https://github.com/opentofu/opentofu/releases
- OpenTofu variable validation: https://opentofu.org/docs/language/values/variables/#custom-validation-rules
- AWS provider default_tags: https://registry.terraform.io/providers/hashicorp/aws/latest/docs#default_tags
- `opentofu/setup-opentofu` action: https://github.com/opentofu/setup-opentofu
- `aws-actions/configure-aws-credentials` (v4): https://github.com/aws-actions/configure-aws-credentials
- GitHub Actions artifact v3 deprecation notice: https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/

## Issues Found
- **Deprecated `actions/upload-artifact@v3`**: GitHub closed v3 of the artifact actions on January 30, 2025; the workflow would fail today. Updated to `actions/upload-artifact@v4`.
- **Deprecated `actions/download-artifact@v3`**: Same deprecation. Updated to `actions/download-artifact@v4`.

## Review Notes
- The post title and intro promise a "multi-cloud account" / cross-account guide, but the actual body is a generic OpenTofu workflow tutorial — there is no demonstration of provider aliases, `assume_role` blocks, or cross-account state/role patterns. This is a content scope concern rather than a technical inaccuracy, so it was left as-is per the review guidelines (no restructuring).
- The example pins `tofu_version: "1.7.0"`; this is still a valid release, but newer stable OpenTofu versions (1.8.x, 1.9.x, 1.10.x) are available as of the validation date. Pinning is a deliberate choice and not incorrect.
- With `actions/download-artifact@v4`, when `name:` is specified the artifact is downloaded into the current working directory by default (matching v3's single-artifact behavior), so the subsequent `tofu apply tfplan` step continues to work without further changes.
- The `tofu plan -refresh-only` flag and the `tofu state list` / `tofu state show` subcommands were verified against the OpenTofu CLI docs and are correct.
- The S3 backend example uses `dynamodb_table` for locking, which is still the supported mechanism in OpenTofu's S3 backend (S3-native locking via `use_lockfile` was added later as an alternative; the post's approach remains valid).
