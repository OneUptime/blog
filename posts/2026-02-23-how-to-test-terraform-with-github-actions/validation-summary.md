# Validation Summary: How to Test Terraform with GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform native tests
- GitHub Actions workflows
- HashiCorp setup-terraform action
- TFLint
- Trivy
- Checkov
- AWS IAM OIDC federation
- Go integration tests

## Sources Consulted
- HashiCorp Terraform CLI `fmt` command documentation: https://developer.hashicorp.com/terraform/cli/commands/fmt
- HashiCorp Terraform CLI `test` command documentation: https://developer.hashicorp.com/terraform/cli/commands/test
- HashiCorp Terraform CLI configuration file documentation: https://developer.hashicorp.com/terraform/cli/config/config-file
- HashiCorp setup-terraform GitHub Action documentation: https://github.com/hashicorp/setup-terraform
- GitHub Actions workflow syntax and permissions documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- AWS configure-aws-credentials GitHub Action documentation: https://github.com/aws-actions/configure-aws-credentials
- TFLint documentation and CLI help reference: https://github.com/terraform-linters/tflint
- setup-tflint GitHub Action documentation: https://github.com/terraform-linters/setup-tflint
- Trivy GitHub Action documentation: https://github.com/aquasecurity/trivy-action
- Checkov GitHub Action documentation: https://github.com/bridgecrewio/checkov-action

## Issues Found
- The Terraform plan PR comment example embedded raw Markdown code-fence backticks inside a JavaScript template literal. That would terminate the template literal and make the `actions/github-script` step invalid JavaScript. I escaped the code-fence backticks.
- The same plan comment example directly injected `steps.plan.outputs.stdout` into the script body. Terraform plan output can contain characters that are unsafe inside JavaScript source. I moved the plan output into an environment variable and read it with `process.env.PLAN`, matching the pattern shown by `hashicorp/setup-terraform`.
- The AWS role-assumption jobs used `aws-actions/configure-aws-credentials` with `role-to-assume` but did not grant the GitHub OIDC token permission. I added `id-token: write` to the `plan` and `integration` jobs, along with the minimal permissions each job needs.
- The format failure comment step called the GitHub API without `await`. I changed it to `await github.rest.issues.createComment(...)` so the script waits for the API call before completing.

## Review Notes
- The main Terraform CLI commands and flags shown are valid: `terraform fmt -check -recursive -diff`, `terraform init -backend=false`, `terraform validate`, `terraform test -verbose`, and `terraform plan -no-color -input=false`.
- The `hashicorp/setup-terraform@v3` examples remain technically valid, but the current upstream documentation now shows `@v4`. A future refresh could update action versions consistently across the article.
- Some examples use mutable action references such as `aquasecurity/trivy-action@master` and `bridgecrewio/checkov-action@master`. They work, but pinning to version tags or commit SHAs would improve reproducibility and supply-chain safety.
