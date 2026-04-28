# Validation Summary: How to Use the Migration Tool for Terraform to OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI: `tofu`, v1.6+ / v1.7.0)
- Terraform / HCL configuration language
- AWS provider (`hashicorp/aws` ~> 5.0)
- AWS S3 / DynamoDB (remote state backend)
- Azure (`ARM_SUBSCRIPTION_ID`)
- GCP (`GOOGLE_APPLICATION_CREDENTIALS`)
- GitHub Actions (workflows, OIDC, artifact actions)
- `opentofu/setup-opentofu` action
- `aws-actions/configure-aws-credentials` action

## Sources Consulted
- OpenTofu official documentation: https://opentofu.org/docs/
- OpenTofu CLI reference: https://opentofu.org/docs/cli/
- OpenTofu environment variables: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu S3 backend docs: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu setup action: https://github.com/opentofu/setup-opentofu
- GitHub deprecation notice for upload-artifact/download-artifact v3: https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/
- GitHub Actions: actions/upload-artifact: https://github.com/actions/upload-artifact
- GitHub Actions: actions/download-artifact: https://github.com/actions/download-artifact
- AWS configure-aws-credentials action: https://github.com/aws-actions/configure-aws-credentials
- Terraform/OpenTofu HCL `validation` block and `contains()` function reference

## Issues Found
- **Deprecated GitHub Actions artifact versions**: The workflow used `actions/upload-artifact@v3` and `actions/download-artifact@v3`. GitHub officially closed brownouts and fully deprecated v3 of the artifact actions on January 30, 2025; v3 workflows fail after that date. Updated both to `@v4`, which is the current supported major version. Note that v4 has a different on-disk artifact format and is incompatible with v3 within a single workflow, but since both upload and download were updated together this is consistent.

## Review Notes
- **Title vs. content mismatch (non-technical, not corrected)**: The post is titled "How to Use the Migration Tool for Terraform to OpenTofu" and the introduction promises coverage of "the official OpenTofu migration tools." The body, however, is a generic OpenTofu workflow tutorial (init/plan/apply, backend, GitHub Actions) and does not actually cover the migration path from Terraform — there is no mention of `tofu init` against an existing Terraform state, the state-migration workflow, the recommended OpenTofu 1.6 migration steps, or any tooling like `tofu migrate`. This is a scope/editorial issue rather than a technical inaccuracy in the code, so per the review rules (only fix technical errors, do not restructure) this was left as-is. Future revision: either rename the post to reflect what it actually teaches, or rewrite Steps 1–6 around the actual `terraform` → `tofu` migration workflow.
- **`dynamodb_table` lock argument**: This argument is still valid in the S3 backend at OpenTofu 1.6+, but starting with OpenTofu 1.10 the backend supports native S3-based locking via `use_lockfile = true`, which removes the DynamoDB dependency. Not corrected because the post targets v1.6+, where `dynamodb_table` is the standard documented approach, but readers on newer versions may want to switch.
- **`tofu refresh`** is documented as deprecated in favor of `tofu apply -refresh-only`. The command still works, so it was not changed.
- **`tofu_version: "1.7.0"`** in the workflow is a valid pinned version (released May 2024). Newer minor versions exist, but pinning is intentional and not an error.
- HCL syntax (`required_providers`, `default_tags`, `locals`, `variable` with `validation` block, `contains()` function) all verified against current OpenTofu / Terraform language docs.
- Environment variables `TF_LOG`, `TF_INPUT`, `AWS_PROFILE`, `ARM_SUBSCRIPTION_ID`, `GOOGLE_APPLICATION_CREDENTIALS` all verified against the respective official docs.
