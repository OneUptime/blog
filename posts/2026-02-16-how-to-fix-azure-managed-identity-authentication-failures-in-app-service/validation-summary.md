# Validation Summary: How to Fix Azure Managed Identity Authentication Failures in App Service

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure App Service
- Managed identities for Azure resources
- Microsoft Entra ID
- Azure RBAC
- Azure CLI
- Azure SDK for Python
- Azure SDK for .NET
- Azure Key Vault
- Azure Storage
- Azure Service Bus
- Azure SQL Database

## Sources Consulted
- Microsoft Learn: Use managed identities for App Service and Azure Functions - https://learn.microsoft.com/en-us/azure/app-service/overview-managed-identity
- Microsoft Learn: Azure Identity for Python ManagedIdentityCredential class - https://learn.microsoft.com/en-us/python/api/azure-identity/azure.identity.managedidentitycredential
- Microsoft Learn: Authenticate Azure-hosted Python apps to Azure resources using a user-assigned managed identity - https://learn.microsoft.com/en-us/azure/developer/python/sdk/authentication/user-assigned-managed-identity
- Microsoft Learn: Azure CLI az webapp identity command reference - https://learn.microsoft.com/en-us/cli/azure/webapp/identity
- Microsoft Learn: Assign Azure roles using Azure CLI - https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-cli
- Microsoft Learn: Azure built-in roles - https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles
- Microsoft Learn: Troubleshoot Azure RBAC - https://learn.microsoft.com/en-us/azure/role-based-access-control/troubleshooting
- Microsoft Learn: Provide access to Key Vault keys, certificates, and secrets with Azure RBAC - https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide
- Microsoft Learn: Prepare for Key Vault API version 2026-02-01 and later - https://learn.microsoft.com/en-us/azure/key-vault/general/access-control-default
- Microsoft Learn: Assign a Key Vault access policy with Azure CLI - https://learn.microsoft.com/en-us/azure/key-vault/general/assign-access-policy
- Microsoft Learn: Logging with the Azure SDK for .NET - https://learn.microsoft.com/en-us/dotnet/azure/sdk/logging
- Microsoft Learn: Authenticate and authorize an application with Microsoft Entra ID to access Azure Service Bus entities - https://learn.microsoft.com/en-us/azure/service-bus-messaging/authenticate-application

## Issues Found
- The Python example was labeled as using `DefaultAzureCredential`, but the code imported and used `ManagedIdentityCredential`. Updated the comment to match the actual credential class and current Azure Identity guidance for Azure-hosted apps.
- The RBAC propagation guidance implied a simple "up to 10 minutes" delay and recommended a fixed 5-minute wait. Updated it to mention several-minute propagation, Azure Resource Manager caching, managed identity back-end token caching of around 24 hours for group or role membership changes, and retry logic as the safer deployment behavior.
- The .NET debugging tip incorrectly said to set `AZURE_SDK_LOGGING=true`. Current Azure SDK for .NET documentation uses `AzureEventSourceListener` or ASP.NET Core logging configuration, so the sentence was corrected.

## Review Notes
The remaining Azure CLI commands, managed identity endpoint example, Key Vault access model check, role assignment examples, deployment slot identity guidance, and common token resource/audience examples are consistent with current Microsoft documentation. Key Vault defaults are changing for new vaults created with API version `2026-02-01` or later, but both RBAC and access policy models remain supported, so the post's troubleshooting guidance remains valid.
