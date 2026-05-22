# Validation Summary: How to Use GitHub Actions Environments for Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions environments
- GitHub Actions workflow syntax
- GitHub Actions secrets, variables, protection rules, artifacts, and concurrency
- Terraform CLI
- AWS credentials for Terraform providers/backends

## Sources Consulted
- GitHub Docs: Deployments and environments: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- GitHub Docs: Workflow syntax for GitHub Actions: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Docs: Using secrets in GitHub Actions: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets
- GitHub Docs: Store and share data with workflow artifacts: https://docs.github.com/actions/guides/storing-workflow-data-as-artifacts
- HashiCorp Developer: Create a Terraform plan: https://developer.hashicorp.com/terraform/tutorials/cli/plan
- HashiCorp setup-terraform action README: https://github.com/hashicorp/setup-terraform
- GitHub actions/upload-artifact README: https://github.com/actions/upload-artifact

## Issues Found
- The introduction described staging as using "automatic approval." GitHub environments can use wait timers and required reviewers, but staging without required reviewers progresses automatically rather than being approved. Changed the wording to "staging automatically."
- The environment-specific secrets section and first workflow implied that the PR `plan` job could use environment-specific AWS secrets without declaring an environment. GitHub environment secrets are available only to jobs that reference the environment, and protected production environments would not be a good default for PR plans. Updated the post to use separate read-only repository-level plan credentials for the `plan` job and clarified that environment-scoped credentials depend on the job's referenced environment.
- The concurrency section said `cancel-in-progress: false` makes newer deployments wait. Current GitHub Actions concurrency supports only one pending run by default; additional pending runs replace the existing pending run unless `queue: max` is set. Added `queue: max` and updated the explanation.

## Review Notes
- The Terraform CLI examples use valid `terraform init`, `terraform plan -out`, `terraform apply`, `-var-file`, `-input=false`, and saved plan syntax.
- The saved plan artifact pattern is technically correct, but Terraform plan files can contain sensitive values and should be treated as sensitive artifacts.
- The sample workflow grants `id-token: write` but still uses static AWS access key secrets. This is not syntactically wrong, though OIDC-based cloud authentication would usually be preferred for new GitHub Actions deployments.
