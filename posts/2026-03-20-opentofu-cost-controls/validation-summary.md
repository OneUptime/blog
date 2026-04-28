# Validation Summary: How to Implement Cost Controls with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (v1.6+, with `opentofu/setup-opentofu` action pinned to 1.7.0)
- HCL configuration (terraform block, providers, backend, locals, variable validation)
- AWS provider (`hashicorp/aws` ~> 5.0) including `default_tags`
- S3 + DynamoDB remote state backend
- GitHub Actions CI/CD (`actions/checkout`, `actions/upload-artifact`, `actions/download-artifact`, `aws-actions/configure-aws-credentials`, `opentofu/setup-opentofu`)
- OIDC-based AWS auth (`id-token: write` permission, `role-to-assume`)

## Sources Consulted
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/
- OpenTofu environment variables (TF_LOG, TF_INPUT): https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu `terraform` settings block: https://opentofu.org/docs/language/settings/
- OpenTofu variable validation: https://opentofu.org/docs/language/values/variables/#custom-validation-rules
- OpenTofu S3 backend: https://opentofu.org/docs/language/settings/backends/s3/
- AWS provider `default_tags` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs#default_tags
- `opentofu/setup-opentofu` action: https://github.com/opentofu/setup-opentofu
- `actions/upload-artifact` and deprecation of v3: https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/
- `aws-actions/configure-aws-credentials` v4: https://github.com/aws-actions/configure-aws-credentials

## Issues Found
- **Deprecated GitHub Actions artifact actions (v3)**: The workflow used `actions/upload-artifact@v3` and `actions/download-artifact@v3`. These were officially deprecated in April 2024 and the v3 endpoints were shut down on January 30, 2025, causing all v3 workflows to fail. Updated both to `@v4`. The v4 release also brings substantial performance improvements (up to 10x faster uploads) and is the current supported major version.

## Review Notes
- **Title/content mismatch (not fixed)**: The post title and introduction promise content about "Infracost, tagging policies, and budget enforcement," but the body is a generic OpenTofu setup tutorial. There is no actual cost-control-specific material (no Infracost integration, no AWS Budgets resources, no policy-as-code for budgets, no cost estimation in CI). Per review instructions, I did not add new sections or restructure — only fixed technical errors. The author may want to revisit and expand the post to match its title.
- **OpenTofu version pinning**: The workflow pins `tofu_version: "1.7.0"`. As of April 2026, OpenTofu has moved well past 1.7 (1.8, 1.9, 1.10+ are available). 1.7.0 still works but users may want to use a newer minor release for `provider for_each`, state encryption, and other newer features. Not changed since the post explicitly chose this version and it is still functional.
- **`tofu plan -refresh-only` for drift detection**: Correct usage — produces a refresh-only plan that detects drift without proposing infrastructure changes.
- **Variable validation block**: The `condition` / `error_message` syntax is correct OpenTofu/Terraform 1.x syntax. (Cross-validation between variables — `validation` referencing other vars — was added in OpenTofu 1.9, but this example only references `var.environment` itself, which works in all 1.x versions.)
- **`terraform { }` settings block**: Still the canonical block name in OpenTofu (a `tofu { }` alias was added in OpenTofu 1.8, but `terraform { }` continues to work and is correct here).
