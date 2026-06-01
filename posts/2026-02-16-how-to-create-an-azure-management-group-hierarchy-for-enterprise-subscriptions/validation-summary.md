# Validation Summary: How to Create an Azure Management Group Hierarchy for Enterprise Subscriptions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure management groups
- Microsoft Entra ID
- Azure CLI
- Azure RBAC
- ARM templates
- Azure Cloud Adoption Framework / Azure landing zones

## Sources Consulted
- Microsoft Learn: What are Azure management groups? https://learn.microsoft.com/en-us/azure/governance/management-groups/overview
- Microsoft Learn: Management groups - Cloud Adoption Framework. https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/landing-zone/design-area/resource-org-management-groups
- Microsoft Learn: Azure CLI `az account management-group`. https://learn.microsoft.com/en-us/cli/azure/account/management-group?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az account management-group subscription`. https://learn.microsoft.com/en-us/cli/azure/account/management-group/subscription?view=azure-cli-latest
- Microsoft Learn: Elevate access to manage all Azure subscriptions and management groups. https://learn.microsoft.com/en-us/azure/role-based-access-control/elevate-access-global-admin
- Microsoft Learn: Azure CLI `az role assignment`. https://learn.microsoft.com/en-us/cli/azure/role/assignment?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az ad signed-in-user`. https://learn.microsoft.com/en-us/cli/azure/ad/signed-in-user?view=azure-cli-latest
- Microsoft Learn: Microsoft.Management/managementGroups ARM template reference. https://learn.microsoft.com/en-us/azure/templates/microsoft.management/2021-04-01/managementgroups
- Microsoft Learn: Azure CLI `az deployment tenant`. https://learn.microsoft.com/en-us/cli/azure/deployment/tenant?view=azure-cli-latest
- Microsoft Learn: Understand and work with Cost Management scopes. https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/understand-work-scopes

## Issues Found
- The post referred to the root management group as "Tenant Root Group" and used that display name in Azure CLI commands. Microsoft documents that the root management group's default display name is "Tenant root group" and that its ID is the Microsoft Entra tenant ID. Azure CLI `az account management-group show --name` explicitly expects the management group name/ID, not the display name. I updated the explanation and changed the hierarchy-view command to use `az account show --query tenantId`.
- The top-level management group creation commands passed `--parent "Tenant Root Group"`. Azure CLI accepts a parent management group ID or name, not the display name. Since omitting `--parent` places new management groups under the root tenant group, I removed the invalid parent argument from the top-level examples.
- The `elevateAccess` command comment implied it directly granted root management group access. Microsoft documents that it grants the Global Administrator the User Access Administrator role at root scope. I corrected the wording and added a follow-up `az role assignment create` example to assign Management Group Contributor at the root management group scope.
- The post used the older "Azure AD" terminology in a current Azure governance context. I updated it to "Microsoft Entra ID" where the post describes the tenant and identity platform.

## Review Notes
The ARM template uses the supported `Microsoft.Management/managementGroups` resource shape and a non-preview API version. Azure CLI was not installed in the local environment, so command verification was performed against current Microsoft Learn CLI reference pages rather than local `az --help` output.
