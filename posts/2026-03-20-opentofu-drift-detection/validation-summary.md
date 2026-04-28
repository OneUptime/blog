# Validation Summary: How to Implement Drift Detection and Remediation with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI: `tofu`, configuration syntax via the `terraform` block)
- AWS provider (`hashicorp/aws` ~> 5.0)
- AWS S3 + DynamoDB remote state backend
- GitHub Actions (workflow scheduling, artifact upload/download)
- `opentofu/setup-opentofu@v1`
- `aws-actions/configure-aws-credentials@v4`
- HCL `locals`, `variable` validation, `default_tags`

## Sources Consulted
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/
- OpenTofu `plan -refresh-only` (drift detection): https://opentofu.org/docs/cli/commands/plan/
- OpenTofu S3 backend docs: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu releases: https://github.com/opentofu/opentofu/releases (1.7.0 confirmed valid)
- `opentofu/setup-opentofu` action: https://github.com/opentofu/setup-opentofu
- GitHub Actions deprecation notice for `actions/upload-artifact@v3` / `actions/download-artifact@v3`: https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/
- AWS provider `default_tags`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs#default_tags
- `aws-actions/configure-aws-credentials@v4`: https://github.com/aws-actions/configure-aws-credentials

## Issues Found
- **Deprecated `actions/upload-artifact@v3`**: GitHub deprecated v3 of the artifact actions; v3 was shut down in early 2025 and now fails. Updated to `actions/upload-artifact@v4`.
- **Deprecated `actions/download-artifact@v3`**: Same deprecation as above. Updated to `actions/download-artifact@v4`.

## Review Notes
- The `terraform { ... }` configuration block name is correct for OpenTofu — OpenTofu intentionally retained the block name for compatibility.
- `dynamodb_table` for state locking in the S3 backend is still valid in OpenTofu 1.6/1.7. Note that newer Terraform/OpenTofu versions also support S3-native locking via `use_lockfile = true`, which is an alternative worth considering for new setups but not required to fix.
- The post title emphasizes "Drift Detection and Remediation" but the body is largely generic OpenTofu setup; the only drift-specific content is the single `tofu plan -refresh-only` command in Step 5. Future revisions could expand on scheduled drift detection workflows (e.g., a cron-triggered GitHub Actions job that runs `tofu plan -detailed-exitcode -refresh-only` and alerts on non-zero exit). This is a content depth observation, not a technical error.
- Note that `actions/upload-artifact@v4` and `download-artifact@v4` have stricter behavior: artifacts cannot be overwritten in the same workflow run unless `overwrite: true` is set, and artifact names must be unique per run. The current single-job upload pattern works fine with v4.
- OpenTofu 1.7.0 is a valid release; current latest stable is in the 1.9.x line as of 2026-04. The pinned version is fine but readers may wish to use a newer version for current bug fixes.
