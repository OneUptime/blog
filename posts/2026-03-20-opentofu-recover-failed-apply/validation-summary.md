# Validation Summary: How to Recover from Failed OpenTofu Applies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI, HCL configuration, S3 backend)
- AWS provider for OpenTofu
- GitHub Actions (CI/CD workflow for OpenTofu plan/apply)
- AWS (S3, DynamoDB for state locking)

## Sources Consulted
- OpenTofu CLI commands documentation: https://opentofu.org/docs/cli/commands/
- OpenTofu environment variables: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu setup-opentofu GitHub Action releases: https://github.com/opentofu/setup-opentofu/releases
- GitHub deprecation notice for artifact actions v3: https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/
- HashiCorp/OpenTofu input variable validation docs: https://opentofu.org/docs/language/values/variables/

## Issues Found
1. **`actions/upload-artifact@v3` is broken** — GitHub deprecated v3 of the artifact actions; v3 uploads/downloads stopped working on January 30, 2025. Updated to `actions/upload-artifact@v4`, which is the current stable major (v7 also exists but v4 is widely compatible).
2. **`actions/download-artifact@v3` is broken** — same deprecation as above. Updated to `actions/download-artifact@v4`.

All other technical content (OpenTofu CLI commands, environment variables, S3 backend attributes including `dynamodb_table`, HCL `terraform` block syntax, `default_tags`, variable `validation` blocks, `tofu plan -refresh-only`) was verified against current OpenTofu documentation and is correct.

## Review Notes
- **Title vs. content mismatch**: The post is titled "How to Recover from Failed OpenTofu Applies" but the body is generic OpenTofu setup boilerplate (init, plan, apply, CI workflow, best practices) and does not actually cover failure-recovery topics such as `tofu state rm`, `tofu import`, `tofu apply -replace=...`, `tofu apply -target=...`, removing tainted resources, or handling lock-file conflicts after a failed apply. This is a content/scope issue, not a technical-accuracy issue, so the post was left as-is per the review-only-for-correctness scope, but the author may wish to rework the body to match the title.
- **`opentofu/setup-opentofu@v1` is still functional but no longer the latest major** — v2.0.0 was released March 16, 2026. v1 still works, so it was not changed, but consider bumping to `@v2` in a future revision.
- **`tofu_version: "1.7.0"` is a real release (April 30, 2024) and valid**, but is well behind the current stable (1.11.x as of April 2026). Consider bumping to a newer version in a future revision.
- **`tofu refresh`** in the troubleshooting section still works but is deprecated in favor of `tofu apply -refresh-only` (inherited Terraform behavior). Not changed since it still functions and the recommendation is intentionally simple.
- **S3 backend `dynamodb_table` is still valid and not deprecated**, though OpenTofu now also supports native S3 conditional-write locking via `use_lockfile = true`, which the post could optionally mention as a modern alternative.
