# Validation Summary: How to Use Terramate with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Terramate CLI
- Terramate stacks and change detection
- AWS provider and S3 backend
- GitHub Actions
- AWS OIDC authentication for GitHub Actions

## Sources Consulted
- Terramate OpenTofu onboarding docs: https://terramate.io/docs/get-started/opentofu
- Terramate `run` command reference: https://terramate.io/docs/cli/reference/cmdline/run
- Terramate stack configuration docs: https://terramate.io/docs/cli/stacks/configuration
- Terramate change detection docs: https://terramate.io/docs/cli/change-detection/
- Terramate GitHub Actions automation docs: https://terramate.io/docs/cli/automation/github-actions/
- Terramate GitHub Action README: https://github.com/terramate-io/terramate-action
- Terramate releases: https://github.com/terramate-io/terramate/releases
- OpenTofu S3 backend docs: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu backend configuration docs: https://opentofu.org/docs/language/settings/backends/configuration/
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `show` command docs: https://opentofu.org/docs/cli/commands/show/
- OpenTofu `refresh` command docs: https://opentofu.org/docs/cli/commands/refresh/
- OpenTofu setup action README: https://github.com/opentofu/setup-opentofu
- GitHub artifact actions v3 deprecation notice: https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/
- `actions/upload-artifact` README: https://github.com/actions/upload-artifact
- `actions/download-artifact` README: https://github.com/actions/download-artifact
- `actions/checkout` README: https://github.com/actions/checkout
- AWS credentials action README: https://github.com/aws-actions/configure-aws-credentials

## Issues Found
- The post claimed to show Terramate with OpenTofu, but the original examples only used raw `tofu` commands. I added the Terramate CLI prerequisite, `terramate version`, and Terramate stack onboarding with `terramate create --all-terraform`.
- The core workflow did not use Terramate orchestration, change detection, or dependency filters. I replaced the direct `tofu init`, `tofu plan`, `tofu show`, and `tofu apply` commands with `terramate run` equivalents using `--changed --include-all-dependencies` where appropriate.
- The GitHub Actions workflow did not install Terramate, did not fetch enough git history for change detection, and invoked OpenTofu directly. I added `terramate-io/terramate-action@v3` with Terramate CLI `0.16.0`, `fetch-depth: 0`, `terramate run` commands, and `tofu_wrapper: false` for the OpenTofu setup action.
- The workflow used outdated or deprecated GitHub Actions versions. I updated `actions/checkout` to `v6`, `opentofu/setup-opentofu` to `v2`, `aws-actions/configure-aws-credentials` to `v6`, `actions/upload-artifact` to `v7`, and `actions/download-artifact` to `v8`.
- The artifact workflow assumed a single root-level `tfplan`, which is incorrect for Terramate stacks. I changed the artifact name to `tfplans` and upload path to `**/tfplan` so saved plans from stack directories are preserved.
- The workflow requested `pull-requests: write` even though it does not write PR comments or metadata. I changed it to `pull-requests: read`.
- The monitoring example referenced `aws_instance.main`, but no such resource was defined in the post. I changed it to the explicit placeholder `RESOURCE_ADDRESS`.
- The troubleshooting section recommended `tofu refresh`, which OpenTofu documents as deprecated and unsafe for typical use. I replaced it with `terramate run -- tofu apply -refresh-only` followed by `terramate run -- tofu plan`.

## Review Notes
The corrected commands and configuration were reviewed against current official documentation. They were not executed locally because `tofu` and `terramate` are not installed in this environment and the examples require real backend and cloud credentials.
