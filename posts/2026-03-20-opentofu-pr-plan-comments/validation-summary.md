# Validation Summary: How to Display Plan Output in Pull Request Comments with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI v1.6+ / setup-opentofu@v1)
- Terraform/HCL configuration language
- GitHub Actions (workflows, permissions, artifact actions)
- AWS (S3 backend, DynamoDB locking, OIDC via configure-aws-credentials)
- Azure / GCP credential environment variables (referenced briefly)

## Sources Consulted
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/commands/
- OpenTofu environment variables: https://opentofu.org/docs/cli/config/environment-variables/
- opentofu/setup-opentofu action: https://github.com/opentofu/setup-opentofu/blob/main/action.yml
- aws-actions/configure-aws-credentials: https://github.com/aws-actions/configure-aws-credentials/blob/main/action.yml
- GitHub artifact actions v3 deprecation notice: https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/
- GitHub artifact actions v4 announcement: https://github.blog/2024-02-12-get-started-with-v4-of-github-actions-artifacts/
- GitHub Actions permissions reference: https://docs.github.com/en/actions/using-jobs/assigning-permissions-to-jobs

## Issues Found
- **`actions/upload-artifact@v3` and `actions/download-artifact@v3` are deprecated.** GitHub sunset v3 of the artifact actions on January 30, 2025; workflows pinned to v3 fail after that date. Updated both occurrences in the Step 4 workflow to `@v4`. Note that v4 has different semantics (immutable artifacts, no merging across jobs by default) but the post's usage — uploading a single `tfplan` in one job and downloading it by name in another — is fully compatible with v4 and requires no further changes.

## Review Notes
- **Title vs. content mismatch (not fixed, structural):** The post is titled "How to Display Plan Output in Pull Request Comments with OpenTofu," but the workflow in Step 4 only runs `tofu plan` and uploads the binary plan as an artifact — it does not include a step that posts the plan output as a PR comment (e.g., via `actions/github-script`, `peter-evans/create-or-update-comment`, or `gh pr comment`). The `pull-requests: write` permission is declared but never used. Fixing this would require adding a new step/section, which is out of scope for technical-correctness review. Author may want to follow up with a content edit that adds the actual PR-commenting step.
- **OpenTofu version (1.7.0):** Still functional but somewhat behind the current OpenTofu release line (1.8.x / 1.9.x). All commands and inputs used in the post remain valid; flagging only as a freshness note.
- **`tofu refresh`:** Used in Troubleshooting. The standalone `refresh` subcommand is deprecated in favor of `tofu apply -refresh-only` (inherited from Terraform), but still works in current OpenTofu releases. Not changed.
- **HCL block named `terraform { ... }`:** Correct — OpenTofu retains the `terraform` block name for compatibility; an alternative `tofu { ... }` block also exists in newer releases but the `terraform` form remains the standard, supported choice.
- **OIDC setup:** `id-token: write` plus `role-to-assume` is the canonical OIDC pattern with `aws-actions/configure-aws-credentials@v4`; both are valid.
