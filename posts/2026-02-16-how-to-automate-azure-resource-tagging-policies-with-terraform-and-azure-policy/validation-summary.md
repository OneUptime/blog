# Validation Summary: How to Automate Azure Resource Tagging Policies with Terraform and Azure Policy

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Policy
- Azure Policy initiatives
- Azure Policy remediation
- Azure CLI
- Azure RBAC
- Azure Storage account naming

## Sources Consulted
- Azure Policy tag governance patterns: https://learn.microsoft.com/en-us/azure/governance/policy/samples/pattern-tags
- Azure Policy rule structure, conditions, and policy functions: https://learn.microsoft.com/en-us/azure/governance/policy/concepts/definition-structure-policy-rule
- Azure Policy definition basics and definition location/scope rules: https://learn.microsoft.com/en-us/azure/governance/policy/concepts/definition-structure-basics
- Azure Policy remediation task structure: https://learn.microsoft.com/azure/governance/policy/concepts/remediation-structure
- Azure built-in RBAC roles, including Tag Contributor: https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles
- Terraform AzureRM `azurerm_policy_definition`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/policy_definition
- Terraform AzureRM `azurerm_management_group_policy_set_definition`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/management_group_policy_set_definition
- Terraform AzureRM `azurerm_management_group_policy_assignment`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/management_group_policy_assignment
- Terraform AzureRM `azurerm_management_group_policy_remediation`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/management_group_policy_remediation
- Azure CLI `az policy state summarize`: https://learn.microsoft.com/en-us/cli/azure/policy/state
- Azure resource naming rules for storage accounts: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules

## Issues Found
- The custom policy definitions and initiative were shown without a management group definition location while later being assigned at management group scope. Added `management_group_id` to the custom policy definitions and changed the initiative to `azurerm_management_group_policy_set_definition` so the definitions are in scope for the management group assignment.
- The `Owner` policy used `notLike = "*@*.*"`, but Azure Policy `like`/`notLike` patterns should not use more than one wildcard. Replaced it with a simpler `notContains = "@"` email-style check and updated the description/message accordingly.
- The `CreatedDate` policy used `utcNow('yyyy-MM-dd')`. Azure Policy documents `utcNow()` as a policy-rule function that returns a UTC ISO 8601 timestamp. Updated the policy to use `utcNow()` and clarified that remediation stamps the remediation time for existing resources.
- The sample storage account name could include uppercase letters or hyphens from variables such as `Production` or `order-service`, which violates Azure Storage account naming rules. Added a normalized `local.storage_account_name` using lowercase characters with hyphens removed and a 24-character limit.

## Review Notes
Terraform and Azure CLI were not installed in the local environment, so local `terraform validate` and `az --help` checks could not be run. The examples were reviewed against official Microsoft Learn and HashiCorp Registry documentation.
