# Validation Summary: How to Use terraform state list to View Resources

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Terraform CLI
- Terraform state management
- Terraform resource addressing
- Shell scripting with grep, sed, sort, uniq, diff, and wc

## Sources Consulted
- HashiCorp Terraform CLI documentation: terraform state list command reference: https://developer.hashicorp.com/terraform/cli/commands/state/list
- HashiCorp Terraform CLI documentation: state commands reference: https://developer.hashicorp.com/terraform/cli/commands/state
- HashiCorp Terraform CLI documentation: resource address reference: https://developer.hashicorp.com/terraform/cli/state/resource-addressing
- HashiCorp Terraform CLI documentation: inspecting Terraform state overview: https://developer.hashicorp.com/terraform/cli/state/inspect
- Local verification with Terraform CLI v1.14.2 `terraform state list` against a temporary state file.

## Issues Found
- The post used `terraform state list aws_instance` to filter by resource type. Terraform resource addresses must include both a resource type and resource name, so a bare type is invalid. Updated those examples to use `terraform state list | grep '^aws_instance\.'` where the intended filter is by root-level type.
- The post used `terraform state list data.` to list data sources. `data.` is not a valid Terraform address and fails address parsing. Updated the example to use `terraform state list | grep '^data\.'`.
- The post described filtering as matching the beginning of the address. Terraform uses resource addressing rules, with support for full or incomplete resource addresses in specific contexts. Updated the wording to avoid implying arbitrary prefix matching.
- The resource type counting example only handled root-level managed resources correctly. Updated the `sed` expression so it also handles module paths and data source addresses more accurately.

## Review Notes
The post is technically relevant and accurate after the corrections. Terraform was not installed in the repository environment, so a temporary official Terraform binary was used only for CLI behavior verification.
