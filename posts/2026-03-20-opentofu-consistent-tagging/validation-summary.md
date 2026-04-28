# Validation Summary: How to Tag Resources Consistently with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI, configuration language, state management)
- HashiCorp Configuration Language (HCL)
- AWS provider (`hashicorp/aws` ~> 5.0), including `default_tags`
- AWS S3 + DynamoDB remote state backend
- GitHub Actions (workflow YAML, OIDC permissions)
- `opentofu/setup-opentofu` action
- `aws-actions/configure-aws-credentials` action
- `actions/checkout`, `actions/upload-artifact`, `actions/download-artifact`

## Sources Consulted
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/
- OpenTofu language `terraform` block / `required_version` / `required_providers`: https://opentofu.org/docs/language/settings/
- OpenTofu S3 backend: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu locals & variable validation: https://opentofu.org/docs/language/values/locals/ and https://opentofu.org/docs/language/values/variables/
- AWS provider `default_tags`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs#default_tags
- GitHub Changelog — deprecation of artifact actions v3 (sunset 2025-01-30): https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/
- `opentofu/setup-opentofu` action: https://github.com/opentofu/setup-opentofu
- `aws-actions/configure-aws-credentials`: https://github.com/aws-actions/configure-aws-credentials
- `actions/checkout`: https://github.com/actions/checkout

## Issues Found
- **`actions/upload-artifact@v3` and `actions/download-artifact@v3` are deprecated.** GitHub sunset v3 of the artifact actions on January 30, 2025; workflows pinned to v3 now fail. Updated both references in the GitHub Actions workflow to `@v4`. Since the workflow uploads a single uniquely-named artifact (`tfplan`) and downloads it from one consumer job, v4's behavior change (each upload creates a distinct artifact, no in-place overwrite) does not affect this example.

## Review Notes
- The post mixes the `terraform { ... }` configuration block with OpenTofu — this is intentional and correct: OpenTofu accepts both `terraform` and `tofu` block names, and `terraform` is the more compatible choice. No change required.
- `tofu_version: "1.7.0"` in the workflow is functional but trails the current OpenTofu releases. Not a correctness issue, just an aging pin.
- `actions/checkout@v4` and `aws-actions/configure-aws-credentials@v4` still work as of April 2026 but newer majors exist (`@v5`/`@v6`). Left unchanged because they are not broken.
- `opentofu/setup-opentofu@v1` remains functional; v2 is now the recommended major but v1 has not been sunset. Left unchanged.
- The `default_tags` block in the AWS provider, the `locals` block, and the `variable "environment"` validation block are all syntactically correct and use current APIs.
- The AWS S3 backend example uses the legacy `dynamodb_table` argument for state locking. As of newer AWS provider/OpenTofu versions, S3-native locking via `use_lockfile = true` is also supported, but `dynamodb_table` is still valid and widely used. No change required.
