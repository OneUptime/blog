# Validation Summary: How to Structure OpenTofu Projects for Large Teams

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (v1.6+ / v1.7.0)
- Terraform configuration language (HCL)
- AWS provider (hashicorp/aws ~> 5.0)
- Azure / GCP credential setup
- S3 + DynamoDB remote state backend
- GitHub Actions (CI/CD workflow)
- `opentofu/setup-opentofu` action
- `aws-actions/configure-aws-credentials` action

## Sources Consulted
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/
- OpenTofu `terraform` block / required_providers: https://opentofu.org/docs/language/settings/
- OpenTofu S3 backend: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu input variable validation: https://opentofu.org/docs/language/values/variables/#custom-validation-rules
- AWS provider `default_tags`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs#default_tags
- `opentofu/setup-opentofu` GitHub Action: https://github.com/opentofu/setup-opentofu
- `aws-actions/configure-aws-credentials` v4: https://github.com/aws-actions/configure-aws-credentials
- GitHub Actions artifact actions deprecation notice (v3 → v4): https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/
- `actions/upload-artifact` v4: https://github.com/actions/upload-artifact
- `actions/download-artifact` v4: https://github.com/actions/download-artifact

## Issues Found
- **Deprecated `actions/upload-artifact@v3`**: GitHub deprecated v3 of the artifact actions in 2024 and they no longer function reliably. Updated to `@v4`.
- **Deprecated `actions/download-artifact@v3`**: Same deprecation issue. Updated to `@v4`. Note that v4 is also required for compatibility — uploading with v4 and downloading with v3 (or vice versa) is not supported, so both had to be bumped together.

## Review Notes
- All `tofu` CLI commands (`version`, `init`, `plan`, `apply`, `show`, `state list`, `state show`, `refresh`) and flags (`-out`, `-var-file`, `-backend-config`, `-no-color`, `-refresh-only`, `-auto-approve`) are valid and current.
- The `terraform {}` configuration block is still the documented and supported form in OpenTofu. OpenTofu 1.8+ also accepts a `tofu {}` block as an alternative, but using `terraform {}` is the broadly compatible choice and is correct here.
- The S3 backend configuration with `dynamodb_table` for state locking is valid. OpenTofu 1.10+ also supports native S3 lockfile-based locking via `use_lockfile`, but the DynamoDB approach in the post remains supported.
- `opentofu/setup-opentofu@v1` is correct; `tofu_version: "1.7.0"` is a valid release, though OpenTofu has progressed past 1.7 since this post was written. Pinning to a specific version is reasonable practice and not technically wrong.
- The artifact name collision behavior changed between v3 and v4 (v4 disallows duplicate names within a workflow run). For this single-job upload / single-job download pattern, the upgrade is drop-in.
- The variable validation block uses the correct OpenTofu syntax (`condition` + `error_message`).
- The post is titled "Structure OpenTofu Projects for Large Teams" but does not actually cover repository/module structure (e.g., environment separation, module layering, workspaces, ownership boundaries). Content-wise this is a generic OpenTofu setup guide rather than a structuring guide, but that is an editorial concern, not a technical-accuracy issue.
