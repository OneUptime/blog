# Validation Summary: How to Fix 'Identity' Assignment Errors in Azure

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Azure Managed Identities
- Microsoft Entra ID service principals
- Azure RBAC and IAM
- Azure CLI
- Terraform AzureRM provider and Time provider
- Azure SDK for Python
- Azure SDK for JavaScript
- Azure Instance Metadata Service

## Sources Consulted
- Microsoft Learn: How managed identities for Azure resources work with Azure virtual machines - https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/how-managed-identities-work-vm
- Microsoft Learn: Assign Azure roles using Azure CLI - https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-cli
- Microsoft Learn: az role assignment CLI reference - https://learn.microsoft.com/en-us/cli/azure/role/assignment
- Microsoft Learn: Troubleshoot Azure RBAC - https://learn.microsoft.com/en-us/azure/role-based-access-control/troubleshooting
- Microsoft Learn: Azure built-in roles for Storage - https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/storage
- Microsoft Learn: Assign an Azure role for access to blob data - https://learn.microsoft.com/en-us/azure/storage/blobs/assign-azure-role-data-access
- Microsoft Learn: Azure Instance Metadata Service for virtual machines - https://learn.microsoft.com/en-us/azure/virtual-machines/instance-metadata-service
- Microsoft Learn: Use managed identities on a virtual machine to acquire an access token - https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/how-to-use-vm-token
- Microsoft Learn: Azure Identity client library for Python - https://learn.microsoft.com/en-us/python/api/overview/azure/identity-readme
- Microsoft Learn: Azure Identity client library for JavaScript - https://learn.microsoft.com/en-us/javascript/api/overview/azure/identity-readme
- Terraform Registry: azurerm_linux_virtual_machine - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine
- Terraform Registry: azurerm_role_assignment - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment
- Terraform Registry: time_sleep - https://registry.terraform.io/providers/hashicorp/time/latest/docs/resources/sleep

## Issues Found
- Role assignment examples used `--assignee` with a managed identity principal ID. Updated role creation examples to use `--assignee-object-id` and `--assignee-principal-type ServicePrincipal`, which avoids Microsoft Graph lookup issues and matches Azure CLI guidance for new managed identities and service principals.
- Role assignment listing examples used `--assignee`, which can also trigger Microsoft Graph lookup. Updated them to use `--assignee-object-id` with `--fill-principal-name false`.
- The role definition diagnostic command only queried `actions`, but Storage Blob data roles include important blob permissions under `dataActions`. Updated the query to show both `actions` and `dataActions`.
- The JWT decode command used regular base64 decoding, but JWT payloads are base64url-encoded and may omit padding. Replaced it with a Python one-liner that decodes base64url with padding handling.
- The troubleshooting flow suggested verifying NSG access to IMDS. Updated it to focus on bypassing proxies and checking host firewall behavior, which better matches the official IMDS guidance.

## Review Notes
- Azure CLI and Terraform were not installed in the local environment, so command verification was performed against official Microsoft Learn and Terraform Registry documentation.
- Microsoft documentation now uses "Microsoft Entra ID" for the identity platform formerly called Azure AD. The post still uses "Azure AD" in a few places, but this is understandable legacy terminology rather than a functional error.
