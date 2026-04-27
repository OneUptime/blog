# Validation Summary: How to Use OIDC Authentication in CI/CD Pipelines with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (v1.6+, with examples using v1.7.0)
- OpenID Connect (OIDC)
- GitHub Actions
- AWS (IAM, S3, DynamoDB)
- HCL (HashiCorp Configuration Language)
- `opentofu/setup-opentofu` GitHub Action
- `aws-actions/configure-aws-credentials` GitHub Action

## Sources Consulted
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu releases: https://github.com/opentofu/opentofu/releases
- `opentofu/setup-opentofu` action: https://github.com/opentofu/setup-opentofu
- `aws-actions/configure-aws-credentials`: https://github.com/aws-actions/configure-aws-credentials
- GitHub Actions OIDC guidance: https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect
- `actions/upload-artifact` deprecation notice (v3 deprecated): https://github.com/actions/upload-artifact
- `actions/download-artifact` deprecation notice (v3 deprecated): https://github.com/actions/download-artifact
- OpenTofu input variables / validation docs: https://opentofu.org/docs/language/values/variables/

## Issues Found
- **Deprecated `actions/upload-artifact@v3`**: GitHub deprecated v3 of the artifact actions in early 2025. Updated to `actions/upload-artifact@v4` so the workflow continues to function on current GitHub Actions runners.
- **Deprecated `actions/download-artifact@v3`**: Same deprecation. Updated to `actions/download-artifact@v4` for consistency with the upload action and current GitHub Actions guidance.

## Review Notes
- The workflow demonstrates the OIDC pattern correctly by setting `permissions: id-token: write` and using `role-to-assume` (without long-lived access keys) with `aws-actions/configure-aws-credentials@v4`. The post does not, however, walk through configuring the AWS IAM OIDC identity provider or trust policy that GitHub's OIDC token must assume — this is a prerequisite that readers will need to set up separately. Not a technical error, but a gap that could be expanded in a future revision.
- The example uses the legacy DynamoDB table for state locking. As of OpenTofu 1.10, the S3 backend supports native lock files via `use_lockfile = true`, which removes the need for a DynamoDB table. The DynamoDB approach still works and remains valid for the v1.6+ baseline the post targets, so this is not a correctness issue — just a possible future enhancement.
- HCL syntax, variable validation block, locals, provider configuration, and CLI commands (`tofu init`, `tofu plan`, `tofu apply`, `tofu state list`, `tofu state show`, `tofu plan -refresh-only`, `tofu show`) all match current OpenTofu documentation.
- `opentofu/setup-opentofu@v1` and `tofu_version: "1.7.0"` are valid; v1.7.x is a real OpenTofu release line.
