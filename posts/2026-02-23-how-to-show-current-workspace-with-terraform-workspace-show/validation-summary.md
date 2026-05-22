# Validation Summary: How to Show Current Workspace with terraform workspace show

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Terraform CLI
- Terraform CLI workspaces
- Terraform configuration language
- Bash shell scripting
- Makefiles
- GitHub Actions

## Sources Consulted
- HashiCorp Terraform CLI `workspace show` command reference: https://developer.hashicorp.com/terraform/cli/commands/workspace/show
- HashiCorp Terraform CLI `workspace list` command reference: https://developer.hashicorp.com/terraform/cli/commands/workspace/list
- HashiCorp Terraform CLI `workspace select` command reference: https://developer.hashicorp.com/terraform/cli/commands/workspace/select
- HashiCorp Terraform CLI workspaces overview: https://developer.hashicorp.com/terraform/cli/workspaces
- HashiCorp Terraform state workspaces documentation: https://developer.hashicorp.com/terraform/language/state/workspaces
- HashiCorp Terraform CLI environment variables reference: https://developer.hashicorp.com/terraform/cli/config/environment-variables
- HashiCorp Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform `apply` command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- HashiCorp Terraform `init` command reference: https://developer.hashicorp.com/terraform/cli/commands/init
- HashiCorp Help Center article on selecting a workspace in automation: https://support.hashicorp.com/hc/en-us/articles/360043550953-Selecting-a-workspace-when-running-Terraform-in-automation

## Issues Found
- The post described `.terraform/environment` as the unconditional source for the active workspace. HashiCorp documents `TF_WORKSPACE` as an override for workspace selection and `TF_DATA_DIR` as an override for the Terraform data directory, so the wording was updated to describe `.terraform/environment` as the default local tracking file and to recommend the command when overrides may be involved.
- The Bash prompt helper could return success with no output outside a Terraform working directory, causing the prompt expression to render an empty `[tf:]` marker. The function now returns a non-zero status when no Terraform data directory is found.
- The zsh prompt example did not clear `RPROMPT` after leaving a Terraform directory. The commented example now clears the right prompt in that case.

## Review Notes
- The local environment did not have Terraform installed, so command behavior was verified against current HashiCorp documentation rather than local `terraform --help` output.
- The GitHub Actions example uses `terraform apply -auto-approve tfplan`. HashiCorp documents that `-auto-approve` is ignored when applying a saved plan file because passing the plan file itself is treated as approval. The command still works, but the flag is redundant in that example.
