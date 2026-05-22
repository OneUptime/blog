# Validation Summary: How to Use Projects in HCP Terraform for Organization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HCP Terraform projects
- HCP Terraform workspaces
- HCP Terraform API
- Terraform Enterprise / HCP Terraform `tfe` provider
- Terraform HCL
- Bash, curl, and jq

## Sources Consulted
- HCP Terraform projects documentation: https://developer.hashicorp.com/terraform/cloud-docs/projects
- HCP Terraform projects tutorial: https://developer.hashicorp.com/terraform/tutorials/cloud/projects
- HCP Terraform Workspaces API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- Terraform Enterprise Projects API reference: https://developer.hashicorp.com/terraform/enterprise/api-docs/projects
- HCP Terraform Project Team Access API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/project-team-access
- Terraform Registry `hashicorp/tfe` provider, `tfe_team_project_access`: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/team_project_access
- Terraform Registry `hashicorp/tfe` provider, `tfe_workspace`: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace.html
- Terraform Registry `hashicorp/tfe` provider, `tfe_variable_set`: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/variable_set

## Issues Found
- The `tfe_workspace` example set `execution_mode = "remote"` directly on the workspace. Current `tfe` provider documentation marks direct workspace execution-mode management as deprecated in favor of `tfe_workspace_settings` and organization defaults. I removed the argument because the example is focused on project assignment and remote execution is already the HCP Terraform default.
- The bulk workspace search URL used raw `search[tags]` and `page[size]` query parameters. HashiCorp's API docs advise percent-encoding brackets, and raw brackets can also be interpreted by curl URL globbing. I changed them to `search%5Btags%5D` and `page%5Bsize%5D`.
- The "Get workspaces in a specific project" command used `GET /projects/:project_id/workspaces`, which is not a documented HCP Terraform API endpoint. I changed it to the documented organization workspaces endpoint with `filter%5Bproject%5D%5Bid%5D`.
- The Projects vs. Tags table said tags support variable sets "via workspace variable sets." Tags do not scope variable sets; variable sets can be scoped globally, to projects, or directly to workspaces. I changed the Tags entry to "No."

## Review Notes
The remaining examples align with current documented API shapes and `tfe` provider resources. Project permission management requires a paid HCP Terraform edition, and HCP Europe organizations use HCP groups rather than teams for project permissions; those caveats are accurate in the official docs and could be mentioned in a future expansion, but they do not make the current non-Europe examples incorrect.
