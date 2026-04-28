# Validation Summary: How to Set Up OpenTofu with GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (v1.6+, references to v1.7.0)
- GitHub Actions (workflows, OIDC permissions, environments)
- HCL (Terraform/OpenTofu configuration language)
- AWS (S3 backend, DynamoDB state locking, IAM role assumption via OIDC)
- `opentofu/setup-opentofu` action
- `aws-actions/configure-aws-credentials` action
- `actions/checkout`, `actions/upload-artifact`, `actions/download-artifact`

## Sources Consulted
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/
- `opentofu/setup-opentofu` GitHub repository and releases: https://github.com/opentofu/setup-opentofu
- `actions/upload-artifact` releases: https://github.com/actions/upload-artifact/releases (v3.2.2 release note explicitly states v3 is "deprecated on github.com and should not be used")
- `actions/download-artifact` releases: https://github.com/actions/download-artifact/releases
- `actions/checkout` releases: https://github.com/actions/checkout/releases
- `aws-actions/configure-aws-credentials` documentation
- GitHub Actions deprecation announcement for upload/download-artifact v3 (sunset January 30, 2025)
- OpenTofu S3 backend docs: https://opentofu.org/docs/language/settings/backends/s3/
- HashiCorp/OpenTofu provider configuration syntax (`terraform {}` block, `required_providers`, `default_tags`)

## Issues Found
- **`actions/upload-artifact@v3` and `actions/download-artifact@v3` are deprecated/sunset.** GitHub fully deprecated v3 of these actions on January 30, 2025. The v3.2.2 release explicitly warns: "This is a backport security updates release for GHES users. This version is deprecated on github.com and should not be used!" The workflow as originally written would fail on GitHub-hosted runners. **Fix:** bumped both `actions/upload-artifact@v3` → `@v4` and `actions/download-artifact@v3` → `@v4` in Step 4. The input parameters (`name`, `path`) are unchanged between v3 and v4 for this use case, and v4's default download path keeps the `tfplan` file in the workspace root as before.

## Review Notes
- The post pins several other actions to versions that are behind their current majors as of 2026-04-28 but remain functional and non-deprecated. These were not changed because they are not technical errors:
  - `actions/checkout@v4` (current major is v6)
  - `aws-actions/configure-aws-credentials@v4` (current major is v6)
  - `opentofu/setup-opentofu@v1` (v2.0.0 was released 2026-03-16; v1 still works but runs on an older Node runtime)
  - The `tofu_version` input is correct and unchanged in setup-opentofu v2.
- The post mentions `OpenTofu v1.6+` as a prerequisite and pins `tofu_version: "1.7.0"` in the workflow. OpenTofu 1.7 introduced state encryption and other features; this is internally consistent.
- The `terraform {}` block (rather than `tofu {}`) is used for the configuration block. OpenTofu supports both, with `terraform {}` retained for compatibility — this is correct.
- The S3 backend configuration uses `dynamodb_table` for state locking. Newer OpenTofu/Terraform versions also support native S3 lockfile-based locking via `use_lockfile`, but `dynamodb_table` remains supported and valid. No change required.
- The `tofu plan -refresh-only` command for drift detection is valid.
- All other CLI commands (`tofu init`, `tofu plan -out=`, `tofu show`, `tofu state list`, `tofu state show`, `tofu apply -auto-approve`, `tofu refresh`) and flags are correct per the OpenTofu CLI reference.
- The `TF_LOG` and `TF_INPUT` environment variables are accurate (OpenTofu honors the `TF_` prefix for backward compatibility with Terraform).
- HCL snippets (variable validation block, locals, default_tags, required_providers) are syntactically correct.
