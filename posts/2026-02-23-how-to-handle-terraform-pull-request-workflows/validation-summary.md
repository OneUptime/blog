# Validation Summary: How to Handle Terraform Pull Request Workflows

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform CLI
- Terraform S3 backend
- GitHub Actions
- GitHub CODEOWNERS and branch protection
- Trivy
- Checkov
- AWS S3 remote state

## Sources Consulted
- Terraform CLI `init` command documentation: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform CLI `validate` command documentation: https://developer.hashicorp.com/terraform/cli/commands/validate
- Terraform CLI `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform releases on GitHub: https://github.com/hashicorp/terraform/releases
- HashiCorp `setup-terraform` GitHub Action documentation: https://github.com/hashicorp/setup-terraform
- GitHub Actions workflow syntax and environments documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax and https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- GitHub CODEOWNERS documentation: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- `actions/github-script` documentation: https://github.com/actions/github-script
- Trivy misconfiguration scanning and GitHub Action documentation: https://trivy.dev/docs/latest/scanner/misconfiguration/ and https://github.com/aquasecurity/trivy-action
- Checkov GitHub Action documentation: https://github.com/bridgecrewio/checkov-action

## Issues Found
- The GitHub Actions examples used `hashicorp/setup-terraform@v3` and Terraform `1.7.0`. Updated the examples to `hashicorp/setup-terraform@v4` and Terraform `1.15.4`, matching current Terraform documentation and releases.
- The format check ran from each environment directory, so it would not format-check the top-level `modules/` directory even though module changes trigger the workflow. Changed the format step to run `terraform fmt -check -recursive` from the repository root.
- The text said the matrix validated only affected environments, but the shown workflow validates every environment listed in the matrix when matching paths change. Updated the description to match the workflow behavior.
- The `github-script` example interpolated `${{ steps.plan.outputs.stdout }}` directly into JavaScript. GitHub's documentation warns that expressions are evaluated before the script runs and can cause syntax errors or injection issues. Changed the example to pass the plan output through an environment variable.
- The security scanning snippet used `aquasecurity/tfsec-action@v1.0.3`. tfsec is now part of Trivy, so the example now uses the official Trivy GitHub Action in Terraform configuration scan mode.
- The CODEOWNERS example used bare team-like handles such as `@platform-team`. GitHub team owners must use `@org/team-name`, so the examples now use placeholder organization-qualified team names.
- The review-process text implied branch protection could require different approval counts for production and staging paths directly from CODEOWNERS. GitHub branch protection approval counts apply at the protected branch level, while CODEOWNERS selects owners. Updated the text to recommend code owner review plus separate enforcement when path-specific approval counts are needed.
- The S3 backend example used `dynamodb_table` for state locking. Terraform's current S3 backend documentation marks DynamoDB-based locking as deprecated and recommends `use_lockfile = true`, so the snippet now uses S3 lockfile locking.

## Review Notes
Terraform was not installed in the local environment, so CLI flags were verified against official Terraform documentation rather than local `terraform --help` output. The plan-comment example is technically valid for small plans, but production workflows should also account for GitHub comment size limits and add explicit `permissions` for commenting if the repository's default `GITHUB_TOKEN` permissions are restricted.
