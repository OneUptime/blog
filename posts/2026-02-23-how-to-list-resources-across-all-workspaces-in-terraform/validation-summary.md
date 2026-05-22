# Validation Summary: How to List Resources Across All Workspaces in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform CLI
- Terraform workspaces
- Terraform state commands
- Bash scripting
- Python scripting
- jq
- GitHub Actions
- HCP Terraform

## Sources Consulted
- HashiCorp Terraform CLI workspace list command: https://developer.hashicorp.com/terraform/cli/commands/workspace/list
- HashiCorp Terraform CLI workspace select command: https://developer.hashicorp.com/terraform/cli/commands/workspace/select
- HashiCorp Terraform state commands reference: https://developer.hashicorp.com/terraform/cli/commands/state
- HashiCorp Terraform state inspection overview: https://developer.hashicorp.com/terraform/cli/state/inspect
- HashiCorp Terraform resource address reference: https://developer.hashicorp.com/terraform/cli/state/resource-addressing
- HashiCorp Terraform CLI workspaces overview: https://developer.hashicorp.com/terraform/cli/workspaces
- HashiCorp HCP Terraform API documentation: https://developer.hashicorp.com/terraform/cloud-docs/api-docs
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions

## Issues Found
- The Bash, Python, and jq examples extracted resource types with `cut -d'.' -f1` or `split(".")[0]`, which reports `module` for resources inside Terraform modules and `data` for data source addresses. Updated the examples to strip Terraform module path prefixes and optional `data.` prefixes before extracting the actual resource type.
- The detailed resource script used `grep "^${RESOURCE_TYPE}\."`, which only matched root-module resources. Updated it to use the same Terraform address parsing helper so module-qualified resources are included.
- The detailed resource script used `\s` in `grep -E`, which is not portable POSIX extended regular expression syntax. Replaced it with `[[:space:]]` and matched Terraform attribute assignments explicitly.
- The GitHub Actions example set AWS credentials only on the `terraform init` step. Moved those credentials to job-level `env` so the inventory generation step can also read remote backend state.
- The performance section referred to "Terraform Cloud's API". Updated this to "HCP Terraform's API" to match current HashiCorp product naming.

## Review Notes
Terraform was not installed in the local environment, so CLI behavior was verified against current official HashiCorp documentation rather than local `terraform -help` output. The post's core workflow is technically correct for Terraform CLI workspaces: save the current workspace, list available workspaces, select each workspace, inspect state, and restore the original workspace.
