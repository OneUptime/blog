# Validation Summary: How to Handle Provider API Rate Limiting in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI: `tofu`)
- Terraform HCL configuration language
- AWS provider (hashicorp/aws ~> 5.0)
- AWS S3 + DynamoDB remote state backend
- GitHub Actions (CI/CD workflow)
- opentofu/setup-opentofu, aws-actions/configure-aws-credentials, actions/checkout, actions/upload-artifact, actions/download-artifact

## Sources Consulted
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/
- OpenTofu Terraform settings block / backends: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu input variables (validation blocks): https://opentofu.org/docs/language/values/variables/
- opentofu/setup-opentofu: https://github.com/opentofu/setup-opentofu
- aws-actions/configure-aws-credentials: https://github.com/aws-actions/configure-aws-credentials
- actions/upload-artifact and actions/download-artifact: https://github.com/actions/upload-artifact, https://github.com/actions/download-artifact
- GitHub changelog announcing v3 artifact action sunset (Jan 30, 2025): https://github.blog/changelog/

## Issues Found
- `actions/upload-artifact@v3` was used in the workflow. v3 was deprecated and fully sunset on January 30, 2025; workflows referencing it now fail. Bumped to `actions/upload-artifact@v4`.
- `actions/download-artifact@v3` had the same deprecation/sunset and was paired with the v3 uploader. Bumped to `actions/download-artifact@v4`.

## Review Notes
- The post title promises coverage of "Provider API Rate Limiting" (retry configurations, parallelism tuning, backoff strategies), but the body content is a generic OpenTofu workflow walkthrough that does not actually discuss rate limiting, the `-parallelism` flag, provider `retry`/`max_retries` configuration, or backoff. This is a content/scope mismatch rather than a technical inaccuracy, so per the review guidelines (do not restructure or add new sections) it has been left as-is. A future revision should add the missing rate-limiting content or rename the post.
- `tofu_version: "1.7.0"` in the workflow still works but is well behind current OpenTofu releases as of April 2026. Pinning a newer minor version (or a `~>` constraint) would be advisable, but v1.7.0 is not technically incorrect.
- `actions/checkout@v4`, `opentofu/setup-opentofu@v1`, and `aws-actions/configure-aws-credentials@v4` are older majors but still supported; left unchanged to minimize churn.
- Note that with `actions/upload-artifact@v4`, artifact names must be unique per workflow run (artifacts are now immutable). The post's single upload/download pair within one workflow run is unaffected by this change.
