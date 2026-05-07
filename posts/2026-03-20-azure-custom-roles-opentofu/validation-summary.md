# Validation Summary: How to Create Custom Azure Roles with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- Azure Resource Manager (`azurerm` provider)
- Azure RBAC custom roles
- Azure role assignments
- Azure CLI
- Microsoft Entra service principals

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu settings / `terraform` block syntax: https://opentofu.org/docs/language/settings/
- Azure custom roles: https://learn.microsoft.com/en-us/azure/role-based-access-control/custom-roles
- Understand Azure role definitions: https://learn.microsoft.com/en-us/azure/role-based-access-control/role-definitions
- Understand Azure role assignments: https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments
- Azure resource provider operations reference: https://learn.microsoft.com/en-us/azure/role-based-access-control/resource-provider-operations
- Azure permissions for Compute: https://learn.microsoft.com/en-us/azure/role-based-access-control/permissions/compute
- Azure permissions for Containers: https://learn.microsoft.com/en-us/azure/role-based-access-control/permissions/containers
- Azure permissions for Web and Mobile: https://learn.microsoft.com/en-us/azure/role-based-access-control/permissions/web-and-mobile
- Azure permissions for Storage: https://learn.microsoft.com/en-us/azure/role-based-access-control/permissions/storage
- Azure CLI `az role assignment`: https://learn.microsoft.com/en-us/cli/azure/role/assignment?view=azure-cli-latest
- Azure CLI `az role definition`: https://learn.microsoft.com/en-us/cli/azure/role/definition?view=azure-cli-lts
- Azure portal Check Access quickstart: https://learn.microsoft.com/en-us/azure/role-based-access-control/check-access
- AzureRM provider `azurerm_role_definition` docs: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/role_definition.html.markdown
- AzureRM provider `azurerm_role_assignment` docs: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/role_assignment.html.markdown

## Issues Found
- The introduction said custom roles define which actions are allowed or denied. Azure RBAC `NotActions` are not true deny rules; they subtract actions from an allowed wildcard set within that role. I revised the wording to describe allowed actions without implying deny-assignment behavior.
- The “When to Use Custom Roles” section said you can explicitly deny specific actions while allowing everything else. I changed this to describe excluding actions from a broad role definition, which matches Microsoft’s documented `NotActions` behavior.
- The first HCL example used `not_actions` to block VM create/delete while the role already used an allow-list of specific VM actions. That block was redundant and the accompanying comment incorrectly implied a true deny. I removed the redundant `not_actions` block.
- The CI/CD section claimed the sample role grants exactly what a deployment pipeline needs. That overstates what can be guaranteed because required Azure actions vary by deployment method and target resources. I softened the sentence so it is presented as one example.
- The resource-group scoping section implied that defining the custom role at resource-group scope is itself the main access-control mechanism. Azure documents that effective access comes from the role assignment scope plus permissions; `assignable_scopes` controls where the role can be assigned. I rewrote the sentence to reflect that this pattern limits where the role is assignable.
- The best-practices section said to test role permissions with `az role assignment list`. That command lists assignments rather than testing effective permissions. I changed the guidance to verify assignments with the CLI and review effective access with the portal’s Check Access feature.

## Review Notes
- The HCL syntax and AzureRM resource usage are valid. `azurerm_role_definition.scope` and `assignable_scopes` are used correctly, and `azurerm_role_assignment.role_definition_id = azurerm_role_definition.<name>.role_definition_resource_id` matches the provider documentation for custom roles.
- The Azure action strings used in the examples are current and valid according to the Microsoft permission reference pages for Compute, Containers, Web/Mobile, and Storage.
- The pinned provider version `~> 3.85` is valid syntax, but it is older than the current AzureRM provider line. The post does not depend on a deprecated argument in this snippet, so I left the version pin unchanged.
- The post assumes supporting declarations such as `var.cicd_service_principal_object_id` are defined elsewhere in the configuration.
