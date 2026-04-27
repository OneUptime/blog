# Validation Summary: How to Enforce Naming Conventions with OpenTofu Variables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (v1.6+, v1.7.0)
- HCL (HashiCorp Configuration Language)
- AWS Provider (hashicorp/aws ~> 5.0)
- AWS S3 backend with DynamoDB locking
- GitHub Actions (CI/CD)
- `opentofu/setup-opentofu` action
- `aws-actions/configure-aws-credentials` action

## Sources Consulted
- OpenTofu Settings docs: https://opentofu.org/docs/language/settings/
- OpenTofu S3 Backend docs: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu Custom Conditions / Validation: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu Environment Variables: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu v1.7.0 release notes: https://github.com/opentofu/opentofu/releases/tag/v1.7.0
- opentofu/setup-opentofu action: https://github.com/opentofu/setup-opentofu
- aws-actions/configure-aws-credentials: https://github.com/aws-actions/configure-aws-credentials
- GitHub deprecation notice for v3 artifact actions: https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/
- HashiCorp default_tags blog: https://www.hashicorp.com/en/blog/default-tags-in-the-terraform-aws-provider

## Issues Found
- **Deprecated `actions/upload-artifact@v3`**: This action was deprecated on 2024-04-16 and the v3 endpoint was closed on 2024-11-30; workflows pinned to v3 fail. Updated to `actions/upload-artifact@v4`.
- **Deprecated `actions/download-artifact@v3`**: Same deprecation timeline; v3 is no longer available as of January 2025. Updated to `actions/download-artifact@v4`.

Note: Switching upload/download to v4 is consistent and works correctly together (v4 artifacts are not interchangeable with v3, but both ends of this workflow now use v4).

## Review Notes
- The post title promises content on enforcing naming conventions, but most of the body is generic OpenTofu setup boilerplate. Only Step 6 briefly demonstrates a `validation` block on a variable. The post would benefit from more focused examples on naming-convention enforcement (e.g., regex `can()` validations, length constraints, prefixes via `locals`), but the technical content that is present is correct.
- For OpenTofu 1.10+, S3 backend native locking via `use_lockfile = true` is now available and is the preferred long-term mechanism over `dynamodb_table`. The post targets v1.6+ where `dynamodb_table` is the standard approach, so the example remains valid; users on newer versions may wish to migrate.
- The `terraform { ... }` configuration block name is correctly retained by OpenTofu for backwards compatibility — no change needed.
- `TF_LOG`, `TF_INPUT`, `AWS_PROFILE`, `ARM_SUBSCRIPTION_ID`, and `GOOGLE_APPLICATION_CREDENTIALS` are all valid env vars for the respective tools/providers.
- All `tofu` CLI commands (`version`, `init`, `plan`, `show`, `apply`, `state list`, `state show`, `plan -refresh-only`, `refresh`) and their flags (`-out`, `-var-file`, `-backend-config`, `-no-color`, `-auto-approve`, `-refresh-only`) are valid.
- The AWS provider `default_tags` block and the `validation { condition = ... error_message = ... }` syntax inside a `variable` block are both correct.
