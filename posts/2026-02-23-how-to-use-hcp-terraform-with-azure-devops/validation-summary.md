# Validation Summary: How to Use HCP Terraform with Azure DevOps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- HCP Terraform / Terraform Cloud
- Azure DevOps Pipelines
- Azure DevOps Environments, approvals, and checks
- Azure DevOps REST API
- Azure Key Vault-backed variable groups

## Sources Consulted
- HashiCorp Terraform CLI configuration file documentation: https://developer.hashicorp.com/terraform/cli/config/config-file
- HashiCorp Terraform `cloud` block documentation: https://developer.hashicorp.com/terraform/language/block/terraform#cloud
- HashiCorp HCP Terraform VCS provider documentation: https://developer.hashicorp.com/terraform/enterprise/vcs
- Microsoft Azure Pipelines approvals and checks documentation: https://learn.microsoft.com/en-us/azure/devops/pipelines/process/approvals?view=azure-devops
- Microsoft Azure Pipelines environments documentation: https://learn.microsoft.com/en-us/azure/devops/pipelines/process/environments?view=azure-devops
- Microsoft Azure Pipelines predefined variables documentation: https://learn.microsoft.com/en-us/azure/devops/pipelines/build/variables?view=azure-devops
- Microsoft Azure DevOps Git Pull Request Threads Create REST API documentation: https://learn.microsoft.com/en-us/rest/api/azure/devops/git/pull-request-threads/create?view=azure-devops-rest-7.1
- Microsoft Azure Pipelines Key Vault variable group documentation: https://learn.microsoft.com/en-us/azure/devops/pipelines/library/link-variable-groups-to-key-vaults?view=azure-devops
- Microsoft Azure Repos branch policies documentation: https://learn.microsoft.com/en-us/azure/devops/repos/git/branch-policies?view=azure-devops

## Issues Found
- The Terraform `cloud` block hard-coded `workspaces.name = "app-production"` while the multi-environment pipeline examples used `TF_WORKSPACE` to select `app-staging` and `app-production`. HashiCorp documents that `TF_WORKSPACE` is read when `workspaces` is omitted from the `cloud` block. I removed the hard-coded workspace, added `TF_WORKSPACE` to the production pipeline, and noted that the target HCP Terraform workspaces must already exist.
- The pipeline path filters used `infrastructure/*`, which may miss nested Terraform files. I changed the filters to `infrastructure/**` so nested module/configuration changes are included.
- The post described HCP Terraform credentials as a generic API token. HashiCorp documents that Terraform CLI actions require user or team tokens, not organization tokens. I updated the wording to specify a user or team token.
- The PR comment example interpolated raw Terraform plan output directly into JSON, which can break when the output contains quotes, backslashes, or newlines. I changed the snippet to build JSON with `jq` and updated the REST API version to `7.1`.
- The PR comment example used `$(System.AccessToken)` directly in the script. Microsoft documents that YAML steps should explicitly map `System.AccessToken` into the step environment. I added an `env` mapping and referenced `$SYSTEM_ACCESSTOKEN`.
- The Exclusive Lock section said a deployment job with an environment automatically provides an exclusive lock. Microsoft documents Exclusive lock as an environment/protected-resource check that must be enabled. I corrected the wording and noted that `lockBehavior: sequential` belongs at the stage or pipeline level.
- The script permission troubleshooting note implied inline `bash` tasks were the problem. I corrected it to distinguish checked-in executable files from inline `script` or `bash` steps.

## Review Notes
- The examples use `TerraformInstaller@1`, which is commonly provided by Azure DevOps Marketplace Terraform extensions rather than core Azure Pipelines. Projects should ensure the chosen Terraform installer task extension is installed, or replace those steps with their standard Terraform installation method.
