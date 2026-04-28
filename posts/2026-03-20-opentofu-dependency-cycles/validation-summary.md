# Validation Summary: How to Handle Dependency Cycles in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI, v1.6+ / v1.7.0)
- HCL (terraform block, required_providers, backend "s3", provider configuration, locals, variable validation)
- AWS provider (hashicorp/aws ~> 5.0, default_tags)
- S3 + DynamoDB remote state backend
- GitHub Actions (workflow with OIDC, plan/apply jobs)
- opentofu/setup-opentofu action
- aws-actions/configure-aws-credentials action
- Bash (environment setup, CLI commands)

## Sources Consulted
- OpenTofu CLI docs — version, init, plan, apply, show, state, refresh: https://opentofu.org/docs/cli/commands/
- OpenTofu language docs — terraform block / required_providers / backends: https://opentofu.org/docs/language/settings/
- OpenTofu S3 backend (with DynamoDB locking for v1.6+): https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu debugging environment variables (TF_LOG, TF_INPUT): https://opentofu.org/docs/internals/debugging/
- OpenTofu variable validation block: https://opentofu.org/docs/language/values/variables/#custom-validation-rules
- AWS provider default_tags reference (provider v5): https://registry.terraform.io/providers/hashicorp/aws/latest/docs#default_tags
- opentofu/setup-opentofu GitHub Action: https://github.com/opentofu/setup-opentofu
- aws-actions/configure-aws-credentials (v4) with OIDC: https://github.com/aws-actions/configure-aws-credentials
- actions/upload-artifact deprecation notice (v3 deprecated 2024-11-30): https://github.com/actions/upload-artifact
- actions/download-artifact deprecation notice (v3 deprecated 2024-11-30): https://github.com/actions/download-artifact

## Issues Found
- `actions/upload-artifact@v3` was deprecated by GitHub on 2024-11-30 and the v3 endpoints have been retired. Updated to `actions/upload-artifact@v4` so the workflow continues to function.
- `actions/download-artifact@v3` was deprecated by GitHub on 2024-11-30 alongside upload-artifact. Updated to `actions/download-artifact@v4` to match.

## Review Notes
- Title vs. content mismatch: the post is titled "How to Handle Dependency Cycles in OpenTofu" but the body is a generic OpenTofu setup/CI walkthrough and never discusses cycle detection, the `tofu graph` command, or refactoring techniques (data sources, resource splitting, removing references) that resolve cycles. This is a content/scope concern rather than a technical-correctness defect, so no edits were made under this review's mandate, but the post would benefit from a future rewrite to actually cover its stated topic.
- The `terraform { required_version = ">= 1.6.0" }` block is the documented way to constrain OpenTofu's version because OpenTofu reads the same `terraform` configuration block as Terraform; using `tofu` as the block name is not yet a stable replacement.
- The S3 backend example uses `dynamodb_table` for state locking. This is correct for OpenTofu 1.6+. OpenTofu 1.10 introduced native S3 lockfile support via `use_lockfile = true` as a DynamoDB-free alternative; this is forward-compatible information rather than a correction needed today.
- `hashicorp/aws` as the provider source is valid: OpenTofu's default registry (`registry.opentofu.org`) mirrors the namespace and resolves the shorthand correctly.
- The `default_tags` block is supported by AWS provider v5.x as written.
- The GitHub Actions workflow uses OIDC (`id-token: write` + `role-to-assume`) which is the current AWS-recommended pattern, and `opentofu/setup-opentofu@v1` with `tofu_version: "1.7.0"` is a real, released OpenTofu version.
- `tofu plan -refresh-only` is the correct command to detect drift without proposing configuration changes.
- The variable `validation` block syntax (`condition` + `error_message`) is correct for OpenTofu 1.6+.
