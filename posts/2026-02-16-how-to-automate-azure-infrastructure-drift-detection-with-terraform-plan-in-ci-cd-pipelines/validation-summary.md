# Validation Summary: How to Automate Azure Infra Drift Detection with Terraform Plan in CI/CD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform CLI
- Terraform AzureRM provider authentication
- Azure infrastructure drift detection
- GitHub Actions
- Azure DevOps Pipelines
- Slack GitHub Action
- Bash
- HCL lifecycle settings

## Sources Consulted
- Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform saved plan workflow: https://developer.hashicorp.com/terraform/tutorials/cli/plan
- Terraform releases: https://github.com/hashicorp/terraform/releases
- HashiCorp Setup Terraform GitHub Action: https://github.com/marketplace/actions/hashicorp-setup-terraform
- GitHub Actions workflow syntax and shell behavior: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions expressions reference: https://docs.github.com/en/actions/reference/workflows-and-actions/expressions
- Azure Pipelines variables documentation: https://learn.microsoft.com/en-us/azure/devops/pipelines/process/variables
- Azure Pipelines scheduled triggers documentation: https://learn.microsoft.com/en-us/azure/devops/pipelines/process/scheduled-triggers
- AzureRM provider service principal authentication: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/service_principal_client_secret
- Terraform lifecycle `ignore_changes` reference: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Slack GitHub Action incoming webhook documentation: https://docs.slack.dev/tools/slack-github-action/sending-techniques/sending-data-slack-incoming-webhook

## Issues Found
- The GitHub Actions `Terraform Plan` step piped `terraform plan` through `tee` and then wrote `$?` to `$GITHUB_OUTPUT`. That captures the pipeline's final command status rather than Terraform's status, so drift exit code `2` could be missed. I changed the script to capture `${PIPESTATUS[0]}` after the pipeline.
- The same plan step relied on GitHub Actions shell behavior in a way that could stop the script before recording the Terraform exit code when pipeline failure handling is enabled. I wrapped the plan command with `set +e` / `set -e` so the script can always record Terraform's detailed exit code.
- Plan errors were classified as `drift_detected=error` but did not fail the workflow. I added `exit 1` for Terraform exit code `1` so authentication, provider, or syntax errors do not appear as clean drift checks.
- The Slack notification used `slackapi/slack-github-action@v1.25.0` with only the legacy environment variable input. Current Slack documentation uses v3 and requires explicit `webhook` and `webhook-type` inputs for incoming webhooks. I updated the snippet to `slackapi/slack-github-action@v3.0.3` with `webhook-type: incoming-webhook`.
- The examples pinned Terraform `1.7.0`, which is outdated for a 2026 validation. I updated the sample version pin to Terraform `1.15.5`, the latest stable release available in the official HashiCorp Terraform releases as of this review.

## Review Notes
The core explanation of `terraform plan -detailed-exitcode` is accurate: Terraform returns `0` for an empty diff, `1` for an error, and `2` for a non-empty diff. The AzureRM `ARM_CLIENT_ID`, `ARM_CLIENT_SECRET`, `ARM_SUBSCRIPTION_ID`, and `ARM_TENANT_ID` environment variables are also consistent with official provider authentication guidance. Future improvements could mention GitHub OIDC or Azure federated credentials to avoid long-lived client secrets, but the client-secret example remains technically valid.
