# Validation Summary: How to Set Up Pre-Commit Hooks for Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- pre-commit
- Git hooks
- pre-commit-terraform
- terraform-docs
- TFLint
- Trivy
- Checkov
- Infracost
- Gitleaks
- GitHub Actions

## Sources Consulted
- pre-commit documentation: https://pre-commit.com/
- pre-commit hook stages documentation: https://pre-commit.com/#confining-hooks-to-run-at-certain-stages
- pre-commit hook skipping documentation: https://pre-commit.com/#temporarily-disabling-hooks
- pre-commit-terraform README and hook documentation: https://github.com/antonbabenko/pre-commit-terraform
- pre-commit-terraform v1.88.0 README: https://raw.githubusercontent.com/antonbabenko/pre-commit-terraform/v1.88.0/README.md
- terraform-docs pre-commit hook documentation: https://terraform-docs.io/how-to/pre-commit-hooks/
- terraform-docs releases: https://github.com/terraform-docs/terraform-docs/releases
- pre-commit-hooks README: https://github.com/pre-commit/pre-commit-hooks
- Trivy installation documentation: https://trivy.dev/docs/v0.67/getting-started/installation/
- Infracost CLI command documentation: https://www.infracost.io/docs/features/cli_commands/
- Gitleaks pre-commit documentation: https://github.com/gitleaks/gitleaks

## Issues Found
- The basic configuration used `https://github.com/antonbabenko/pre-commit-tf-docs`, which is not the current terraform-docs pre-commit repository. Replaced it with the official `terraform-docs/terraform-docs` repository, `terraform-docs-go` hook, and valid `terraform-docs markdown table` arguments.
- The `terraform_validate` snippets used `--init-args=-backend=false`. The `pre-commit-terraform` hook documents Terraform init arguments as `--tf-init-args=...`, so the examples were updated to `--tf-init-args=-backend=false`.
- The hook execution order section claimed that later hooks do not run after a faster hook fails. pre-commit continues running remaining hooks by default, so the text now explains that `fail_fast: true` is needed to stop after the first failure.
- The GitHub Actions example used `sudo apt-get install -y trivy` without adding the Trivy apt repository, which would not reliably install Trivy on GitHub-hosted Ubuntu runners. Replaced it with Trivy's official install script.
- The slow-hook example used older stage names `commit` and `push`. Updated them to current pre-commit stage names `pre-commit` and `pre-push`.

## Review Notes
The configuration examples pin older versions of several hooks and tools, such as `pre-commit-hooks` v4.5.0, `pre-commit-terraform` v1.88.0, Gitleaks v8.18.1, and Terraform 1.7.0. They are not inherently invalid, but teams should run `pre-commit autoupdate` and choose current Terraform/tool versions for new projects.
