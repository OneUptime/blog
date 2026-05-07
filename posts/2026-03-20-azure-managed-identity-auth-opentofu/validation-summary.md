# Validation Summary: How to Authenticate with Azure Using Managed Identity in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Azure Resource Manager provider (`hashicorp/azurerm`)
- Azure Managed Identity
- Azure CLI
- Azure RBAC

## Sources Consulted
- OpenTofu Provider Requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu Settings (`terraform` block): https://opentofu.org/docs/language/settings/
- AzureRM provider managed identity authentication guide: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/guides/managed_service_identity.html.markdown
- AzureRM provider Azure CLI authentication guide: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/guides/azure_cli.html.markdown
- AzureRM provider argument reference: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/index
- Azure CLI `az role assignment` reference: https://learn.microsoft.com/en-us/cli/azure/role/assignment?view=azure-cli-latest
- Azure RBAC role assignments overview: https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments
- Managed identities for Azure resources overview for developers: https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview-for-developers
- Azure Container Instances managed identity documentation: https://learn.microsoft.com/en-us/azure/container-instances/container-instances-managed-identity
- Azure CLI managed identity sign-in documentation: https://learn.microsoft.com/en-us/cli/azure/authenticate-azure-cli-managed-identity?view=azure-cli-latest

## Issues Found
- The post said the Azure resource could be "VM, ACI, or Azure DevOps". I changed this to refer to the Azure resource running OpenTofu, such as a VM or ACI, because managed identity enablement is a property of Azure resources and the Azure DevOps case is scenario-specific in official documentation rather than a generic toggle in this context.
- The RBAC example used `--assignee` while passing a managed identity principal ID. I changed it to `--assignee-object-id` and added `--assignee-principal-type ServicePrincipal` to align with Azure CLI guidance for object/principal IDs and to avoid depending on a Microsoft Graph lookup.
- The user-assigned managed identity example referenced `var.managed_identity_client_id`, but the variables section did not declare it. I added the missing variable definition.
- The provider configuration section showed system-assigned and user-assigned examples in a single code block. I split them into separate alternative snippets so each example is copy-pastable.

## Review Notes
- AzureRM provider v4 requires `subscription_id` for `plan` and `apply`; the post already handled that correctly.
- The example role assignment at subscription scope is valid, but a narrower scope is preferable when possible to follow least-privilege RBAC practices.
