# Validation Summary: How to Configure User-Assigned Managed Identities

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Azure Managed Identities
- User-assigned managed identities
- Azure CLI
- Azure RBAC
- Azure Virtual Machines
- Azure App Service
- Azure Functions
- AKS Microsoft Entra Workload ID
- Azure SDK for Python, .NET, and JavaScript
- Azure Key Vault

## Sources Consulted
- Microsoft Learn: Manage user-assigned managed identities using the Azure CLI - https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/manage-user-assigned-managed-identities-azure-cli
- Microsoft Learn: Managed identities for Azure resources overview - https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview
- Microsoft Learn: Configure managed identities on Azure virtual machines - https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/how-to-configure-managed-identities
- Microsoft Learn: Assign Azure roles using Azure CLI - https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-cli
- Microsoft Learn: az identity CLI reference - https://learn.microsoft.com/en-us/cli/azure/identity
- Microsoft Learn: az webapp identity CLI reference - https://learn.microsoft.com/en-us/cli/azure/webapp/identity
- Microsoft Learn: az functionapp CLI reference - https://learn.microsoft.com/en-us/cli/azure/functionapp
- Microsoft Learn: Deploy and configure Microsoft Entra Workload ID on AKS - https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Microsoft Learn: Use Microsoft Entra Workload ID on AKS - https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Microsoft Learn: Azure Identity ManagedIdentityCredential for Python - https://learn.microsoft.com/en-us/python/api/azure-identity/azure.identity.managedidentitycredential
- Microsoft Learn: Azure Identity ManagedIdentityCredential for .NET - https://learn.microsoft.com/en-us/dotnet/api/azure.identity.managedidentitycredential
- Microsoft Learn: Azure Identity ManagedIdentityId.FromUserAssignedClientId for .NET - https://learn.microsoft.com/en-us/dotnet/api/azure.identity.managedidentityid.fromuserassignedclientid
- Microsoft Learn: Azure Identity ManagedIdentityCredential for JavaScript - https://learn.microsoft.com/en-us/javascript/api/@azure/identity/managedidentitycredential
- Microsoft Learn: DefaultAzureCredentialOptions.ManagedIdentityClientId for .NET - https://learn.microsoft.com/en-us/dotnet/api/azure.identity.defaultazurecredentialoptions.managedidentityclientid
- Microsoft Learn: Managed identity best practice recommendations - https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/managed-identity-best-practice-recommendations

## Issues Found
- The AKS workload identity YAML placed `azure.workload.identity/use: "true"` on the ServiceAccount metadata. Microsoft documents this as a required pod template label. I moved the label to a Deployment pod template and kept the client ID annotation on the ServiceAccount.
- The .NET example used `new ManagedIdentityCredential("client-id")`, but current Azure.Identity documentation shows `ManagedIdentityCredential` takes `ManagedIdentityId` or options. I updated the sample to use `ManagedIdentityId.FromUserAssignedClientId(...)`.
- The lifecycle section said deleting a user-assigned identity removes it from attached resources and deletes role assignments. Microsoft documentation says deleting a user-assigned identity does not remove references from assigned resources, and role assignments are not automatically deleted when managed identities are deleted. I corrected the cleanup guidance.

## Review Notes
The Azure CLI commands and SDK examples are otherwise aligned with current Microsoft documentation. Azure CLI was not installed locally in this environment, so CLI command validation was performed against Microsoft Learn CLI reference pages rather than local `az --help` output.
