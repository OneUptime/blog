# Validation Summary: How to Use OpenTofu with GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI
- GitHub Actions workflows
- GitHub Actions artifacts, permissions, expressions, and scheduled workflows
- AWS IAM OIDC federation for GitHub Actions
- aws-actions/configure-aws-credentials
- opentofu/setup-opentofu
- GitHub CLI and GitHub REST API for environments

## Sources Consulted
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command documentation: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu backend configuration documentation: https://opentofu.org/docs/language/settings/backends/configuration/
- OpenTofu CLI configuration and plugin cache documentation: https://opentofu.org/docs/cli/config/config-file/
- OpenTofu environment variables documentation: https://opentofu.org/docs/cli/config/environment-variables/
- opentofu/setup-opentofu action documentation: https://github.com/opentofu/setup-opentofu
- aws-actions/configure-aws-credentials OIDC documentation: https://github.com/aws-actions/configure-aws-credentials
- actions/checkout documentation: https://github.com/actions/checkout
- actions/upload-artifact documentation: https://github.com/actions/upload-artifact
- actions/download-artifact documentation: https://github.com/actions/download-artifact
- actions/github-script documentation: https://github.com/actions/github-script
- GitHub Actions OIDC with AWS documentation: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions artifact documentation: https://docs.github.com/actions/guides/storing-workflow-data-as-artifacts
- GitHub REST API environment documentation: https://docs.github.com/en/rest/deployments/environments
- GitHub CLI `gh api` documentation: https://cli.github.com/manual/gh_api

## Issues Found
- Several GitHub Actions examples used older major versions (`actions/checkout@v4`, `aws-actions/configure-aws-credentials@v4`, `actions/github-script@v7`, `actions/upload-artifact@v4`, and `actions/download-artifact@v4`). I updated them to the current documented major versions where the inputs used by the post are still valid.
- The multi-environment and drift detection workflows used AWS OIDC but did not request the `id-token: write` permission. I added explicit workflow permissions, and added `issues: write` to the drift workflow because it creates GitHub issues.
- The basic workflow's `Plan` step piped `tofu plan` through `tee` without explicitly selecting the Bash shell. GitHub's unspecified Linux/macOS shell uses `bash -e`, while `shell: bash` uses `bash --noprofile --norc -eo pipefail`, so I added `shell: bash` to preserve failures from `tofu plan`.
- The AWS OIDC provider example included a hard-coded GitHub thumbprint. Current AWS/GitHub OIDC guidance says the thumbprint is no longer necessary for GitHub and is ignored if specified, so I removed `thumbprint_list`.
- The plugin cache example cached both the plugin cache and the working directory `.terraform` directory, and did not ensure the plugin cache directory existed. OpenTofu requires the cache directory to exist before use, and `.terraform` can contain backend configuration, so I changed the snippet to cache only a dedicated plugin cache path and create it before `tofu init`.
- The drift detection step used `tofu plan ... || true` before reading the exit code, which overwrote the original OpenTofu exit status and prevented drift from being detected. I changed it to capture `$?` before restoring `set -e`, and to fail the workflow on OpenTofu error exit code `1`.
- The drift detection workflow relied on the default `opentofu/setup-opentofu` wrapper while depending on exact CLI exit codes. The action documentation recommends disabling the wrapper when troubleshooting exit codes, so I set `tofu_wrapper: false` in that workflow.
- The GitHub environment setup command passed nested JSON arrays and objects through `gh api --field`, which would send them as strings rather than the required JSON structures. I changed it to send a JSON request body with `--input -`, matching the GitHub CLI and REST API documentation.

## Review Notes
- `TOFU_VERSION` remains pinned to `1.8.0` as in the original post. The examples are syntactically valid for the shown commands, but teams should periodically update the pin after testing because newer OpenTofu stable releases are available.
- `tofu apply -auto-approve plan.bin` is accepted, but OpenTofu ignores `-auto-approve` when a saved plan file is supplied because passing the plan file is treated as approval.
- The AWS role policy attachment uses `AdministratorAccess` as a simple example. For production, the role should be scoped to the minimum permissions required by the OpenTofu configuration.
