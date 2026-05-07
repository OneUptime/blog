# Validation Summary: How to Configure Azure Managed Identities with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Managed Identities
- Microsoft Entra ID
- OpenTofu / HCL
- AzureRM provider resources
- Azure App Service
- Azure Virtual Machines
- Azure RBAC
- Azure Key Vault
- Azure Storage

## Sources Consulted
- AzureRM provider docs for `azurerm_user_assigned_identity`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/user_assigned_identity.html.markdown
- AzureRM provider docs for `azurerm_linux_web_app`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/linux_web_app.html.markdown
- AzureRM provider docs for `azurerm_linux_virtual_machine`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/linux_virtual_machine.html.markdown
- AzureRM provider docs for `azurerm_role_assignment`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/role_assignment.html.markdown
- Microsoft Learn: Use managed identities for App Service and Azure Functions: https://learn.microsoft.com/en-us/azure/app-service/overview-managed-identity
- Microsoft Learn: Managed identities for Azure resources developer guidance: https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview-for-developers
- Microsoft Learn: Provide access to Key Vault keys, certificates, and secrets with Azure RBAC: https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide
- Microsoft Learn: Authorize access to blobs using Microsoft Entra ID: https://learn.microsoft.com/en-us/azure/storage/blobs/authorize-access-azure-active-directory
- Microsoft Learn: Understand Azure role definitions: https://learn.microsoft.com/en-us/azure/role-based-access-control/role-definitions

## Issues Found
- The overview and summary used the older `Azure AD` name. I updated this to `Microsoft Entra ID` to match current official Azure terminology and documentation.
- The Key Vault role assignment examples implied that Azure RBAC role assignments are universally sufficient for vault secret access. I clarified that the `Key Vault Secrets User` examples apply to Key Vaults that use the Azure RBAC permission model, because this role does not apply to vaults using legacy access policies.

## Review Notes
- The AzureRM resource syntax in the post is current and valid for the documented use cases: `azurerm_user_assigned_identity`, `azurerm_linux_web_app`, `azurerm_linux_virtual_machine`, and `azurerm_role_assignment` all use correct block names and identity type values.
- The dual-identity App Service example is valid with `type = "SystemAssigned, UserAssigned"` and an `identity_ids` list.
- The VM example is intentionally partial. The note about "other required VM properties" is necessary because `azurerm_linux_virtual_machine` also requires items such as `network_interface_ids`, `os_disk`, and either `admin_ssh_key` or `admin_password`.
- For application code, the exported `client_id` is the correct identifier to use when selecting a user-assigned managed identity in Azure SDK authentication flows.
