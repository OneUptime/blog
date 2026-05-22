# Validation Summary: How to Implement Terraform Code Review Best Practices

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform CLI and HCL
- Terraform modules and moved blocks
- GitHub Actions
- actions/github-script
- pre-commit-terraform
- TFLint
- Trivy
- GitHub branch protection
- GitHub CODEOWNERS

## Sources Consulted
- HashiCorp Terraform CLI `fmt` command reference: https://developer.hashicorp.com/terraform/cli/commands/fmt
- HashiCorp Terraform CLI `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform `moved` block reference: https://developer.hashicorp.com/terraform/language/block/moved
- TFLint official README and CLI usage: https://github.com/terraform-linters/tflint
- pre-commit-terraform official hook documentation: https://github.com/antonbabenko/pre-commit-terraform
- Trivy Terraform scanning documentation: https://trivy.dev/docs/latest/coverage/iac/terraform/
- actions/github-script official README: https://github.com/actions/github-script
- GitHub Actions workflow syntax and permissions documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub CODEOWNERS documentation: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- GitHub provider `github_branch_protection` Terraform Registry documentation: https://registry.terraform.io/providers/integrations/github/latest/docs/resources/branch_protection

## Issues Found
- The GitHub Actions PR comment example used raw triple backticks inside a JavaScript template literal. That is invalid JavaScript because the first backtick in the Markdown fence terminates the template string. Changed the Markdown fence in the comment body to `~~~`, which GitHub Markdown supports and which keeps the JavaScript valid.
- The Terraform plan workflow piped `terraform plan` through `tee` without `set -o pipefail`, which can hide a failing `terraform plan` behind `tee`'s successful exit code. Changed the step to use `set -o pipefail` and added a final failure step after posting the plan output.
- The PR comment step did not explicitly await the `github.rest.issues.createComment` API call. Updated it to `await` the promise, matching actions/github-script examples for asynchronous API calls.
- The workflow did not declare token permissions for creating a PR comment. Added `contents: read` and `issues: write` permissions so the snippet works with restricted default `GITHUB_TOKEN` permissions for same-repository pull requests.
- The pre-commit hook example used `terraform_tfsec`, which the current pre-commit-terraform documentation marks as deprecated in favor of `terraform_trivy`. Replaced `terraform_tfsec` with `terraform_trivy`.
- The branch protection example listed `tfsec` as a required status check while the automated security scanner example now uses Trivy. Updated the required status check name to `trivy`.

## Review Notes
The Terraform CLI flags, TFLint commands, module source examples, `moved` block example, CODEOWNERS syntax, and GitHub branch protection resource shape are technically valid. The GitHub Actions example assumes Terraform is run from the repository root; teams with per-environment Terraform roots should add `working-directory` or `terraform -chdir=...` in their real workflow.
