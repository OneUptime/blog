# Validation Summary: How to Use Variable Sets in HCP Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- HCP Terraform variable sets
- Terraform Enterprise variable sets API
- HashiCorp `tfe` Terraform provider
- Terraform variables and environment variables
- AWS and Datadog provider environment-variable credential patterns

## Sources Consulted
- HashiCorp Developer: Manage variables and variable sets in HCP Terraform - https://developer.hashicorp.com/terraform/cloud-docs/variables/managing-variables
- HashiCorp Developer: Variables overview and precedence for Terraform Enterprise/HCP Terraform - https://developer.hashicorp.com/terraform/enterprise/variables
- HashiCorp Developer: Variable sets API reference - https://developer.hashicorp.com/terraform/enterprise/api-docs/variable-sets
- Terraform Registry: `hashicorp/tfe` `tfe_variable_set` resource - https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/variable_set
- Terraform Registry: `hashicorp/tfe` `tfe_variable` resource - https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/variable
- Terraform Registry: `hashicorp/tfe` `tfe_workspace_variable_set` resource - https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace_variable_set

## Issues Found
- The original variable precedence list was incomplete and placed workspace-specific variables above all other sources. Current HCP Terraform documentation gives priority variable sets, CLI `-var` and `-var-file` values, and local `TF_VAR_` values higher precedence, then distinguishes project-owned and organization-owned variable sets before global variable sets and variable files. Updated the precedence list to match the current documented order.
- The original precedence list omitted `terraform.tfvars`, which is part of the documented ordering after `*.auto.tfvars`. Added it to the list.

## Review Notes
The `tfe` provider examples use current resources and argument names, including `tfe_variable_set`, `tfe_variable`, `tfe_workspace_variable_set`, and `tfe_project_variable_set`. The API examples use the documented `/api/v2/organizations/:organization_name/varsets` and `/api/v2/varsets/:varset_id/relationships/workspaces` endpoints. The provider now supports write-only variable values (`value_wo`) for secrets, which can reduce state exposure, but the existing `value` examples remain valid.
