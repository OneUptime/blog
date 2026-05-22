# Validation Summary: How to Implement Terraform CI/CD with Pull Request Workflows

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform CLI
- GitHub Actions
- GitHub pull request workflows
- GitHub branch protection
- GitHub CODEOWNERS
- GitHub CLI
- AWS IAM OIDC authentication for GitHub Actions

## Sources Consulted
- Terraform CLI `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform CLI `apply` command documentation: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform CLI `fmt`, `validate`, and `init` command documentation: https://developer.hashicorp.com/terraform/cli/commands
- Terraform release archive for the pinned Terraform version: https://releases.hashicorp.com/terraform/
- GitHub Actions workflow syntax, permissions, and concurrency documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub documentation for controlling `GITHUB_TOKEN` permissions: https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/controlling-permissions-for-github_token
- GitHub REST API documentation for branch protection: https://docs.github.com/rest/branches/branch-protection/
- GitHub CODEOWNERS documentation: https://docs.github.com/articles/about-code-owners
- GitHub CLI manual for `gh api`, `gh pr view`, and `gh issue create`: https://cli.github.com/manual/
- `hashicorp/setup-terraform` action documentation: https://github.com/hashicorp/setup-terraform
- `aws-actions/configure-aws-credentials` action documentation: https://github.com/aws-actions/configure-aws-credentials

## Issues Found
- The core workflow said the merge applies a saved plan, but the example workflow actually re-plans and applies from `main`. Updated the text to match the safer apply-on-merge pattern shown in the workflow.
- The PR plan step used `continue-on-error: true`, which would allow real Terraform plan failures to be masked even though the script exits nonzero for exit codes other than `0` and `2`. Removed `continue-on-error` so failed plans fail the required status check.
- The main workflow code fence was opened with four backticks but closed with three, causing the branch protection section to be swallowed into the YAML block. Corrected the fence boundaries.
- The `gh api` branch protection command used `:owner` and `:repo` placeholders, but GitHub CLI documents `{owner}` and `{repo}` as the current-repository placeholders. Updated the endpoint path.
- The PR plan artifact comment said the artifact was for the apply stage even though the apply job does not consume it. Updated the comment to describe it as a review traceability artifact.
- The standalone drift detection workflow omitted Terraform setup, AWS credential configuration, and `GITHUB_TOKEN` permissions needed to create issues. Added `hashicorp/setup-terraform`, `aws-actions/configure-aws-credentials`, and `contents`, `issues`, and `id-token` permissions.
- The drift detection script handled drift exit code `2` but did not fail on other Terraform plan errors. Added an explicit nonzero error branch for unexpected exit codes.

## Review Notes
- The Terraform version is pinned to `1.7.4`, which is a real published Terraform release, but it is not the newest Terraform release shown in HashiCorp release listings. In a production repository, teams should usually align this pin with their tested `required_version` constraint and upgrade policy.
- The examples assume trusted pull requests with access to the AWS role and repository permissions. Public repositories accepting forked pull requests need additional workflow hardening because secrets and write tokens are restricted for fork-originated PRs.
