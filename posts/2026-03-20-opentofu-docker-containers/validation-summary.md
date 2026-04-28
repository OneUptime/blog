# Validation Summary: How to Run OpenTofu in Docker Containers

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu (v1.6+, examples reference v1.7.0)
- HCL configuration (terraform block, providers, backends, variables, locals, validations)
- AWS provider for OpenTofu (S3 backend, DynamoDB locking, default_tags)
- GitHub Actions (CI/CD workflow with plan/apply jobs, OIDC role assumption)
- Bash CLI commands (tofu init, plan, apply, show, state, refresh)

## Sources Consulted
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu environment variables (TF_LOG, TF_INPUT, TF_VAR_*): https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu GitHub releases: https://github.com/opentofu/opentofu/releases
- opentofu/setup-opentofu action: https://github.com/opentofu/setup-opentofu
- GitHub Actions artifact deprecation notice: https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/
- actions/upload-artifact: https://github.com/actions/upload-artifact
- actions/download-artifact: https://github.com/actions/download-artifact
- aws-actions/configure-aws-credentials: https://github.com/aws-actions/configure-aws-credentials
- HashiCorp AWS provider documentation (default_tags, region): https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- **`actions/upload-artifact@v3` is deprecated.** GitHub shut down v1/v2/v3 of the artifact actions on January 30, 2025; workflows using `@v3` fail with a deprecation error and would not work for a blog post published in March 2026. Updated to `@v4` in the Upload Plan step.
- **`actions/download-artifact@v3` is deprecated.** Same shutdown applies. Updated to `@v4` in the Download Plan step. Note that v4 requires upload-artifact v4 (which is what we now use), so the pairing is consistent.

## Review Notes
- **Title/content mismatch:** The post title is "How to Run OpenTofu in Docker Containers," but the content does not actually cover Docker — there is no Dockerfile, no `docker run` examples, no container image discussion. The body is a generic OpenTofu + GitHub Actions tutorial. This is a content-scope issue rather than a technical-correctness issue, so per the review brief (do not add new sections or restructure), it was left as-is. The author or editor may want to either rewrite the body to cover Docker or rename the post to match its actual content.
- **`opentofu/setup-opentofu@v1`** still works but `@v2` is the current major as of early 2026. Not technically wrong, just behind.
- **`tofu_version: "1.7.0"`** is a real release (April 2024) but the latest stable is 1.11.x. The post's prerequisite of v1.6+ is consistent. Newer features (state encryption, provider-defined functions, S3 native locking) are not used here, so 1.7.0 remains a working choice.
- **S3 backend uses `dynamodb_table` for locking.** As of OpenTofu 1.10 (early 2025), native S3 locking via `use_lockfile = true` is available and DynamoDB is no longer required. The DynamoDB approach still works and is supported, so this is not incorrect — just legacy.
- **`tofu refresh`** in the Troubleshooting section still works but emits a deprecation warning suggesting `tofu apply -refresh-only`. Left as-is since it's still functional and the post also shows the recommended `-refresh-only` form in Step 5.
- **`actions/checkout@v4`** and **`aws-actions/configure-aws-credentials@v4`** are not the latest majors (v6 is current for both), but they are still supported and functional. Left unchanged.
- **TF_LOG / TF_INPUT** environment variables are correctly used — OpenTofu retains the `TF_*` prefix for compatibility.
- The `terraform { ... }` block in the HCL examples is correct; OpenTofu does not introduce a separate `tofu { ... }` configuration block.
