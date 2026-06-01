# Validation Summary: How to Run Azure Container Instances with Managed Identity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Container Instances
- Azure managed identities
- Microsoft Entra ID authentication
- Azure CLI
- Azure Key Vault
- Azure Storage Blob
- Azure SQL Database
- Azure Container Registry
- Python Azure SDK
- Node.js Azure SDK
- .NET Azure SDK
- YAML container group configuration

## Sources Consulted
- Microsoft Learn: Use managed identities with Azure Container Instances - https://learn.microsoft.com/azure/container-instances/container-instances-managed-identity
- Microsoft Learn: Azure Container Instances YAML reference - https://learn.microsoft.com/azure/container-instances/container-instances-reference-yaml
- Microsoft Learn: Azure CLI `az container create` reference - https://learn.microsoft.com/cli/azure/container
- Microsoft Learn: Deploy to Azure Container Instances from Azure Container Registry using a managed identity - https://learn.microsoft.com/azure/container-instances/using-azure-container-registry-mi
- Microsoft Learn: Python `ManagedIdentityCredential` class - https://learn.microsoft.com/python/api/azure-identity/azure.identity.managedidentitycredential
- Microsoft Learn: Authenticate Azure-hosted Python apps using a user-assigned managed identity - https://learn.microsoft.com/azure/developer/python/sdk/authentication/user-assigned-managed-identity
- Microsoft Learn: JavaScript `DefaultAzureCredential` class - https://learn.microsoft.com/javascript/api/@azure/identity/defaultazurecredential
- Microsoft Learn: JavaScript `DefaultAzureCredentialClientIdOptions` interface - https://learn.microsoft.com/javascript/api/@azure/identity/defaultazurecredentialclientidoptions

## Issues Found
- The post used the older "Azure Active Directory" / "AAD" terminology. Updated the text to "Microsoft Entra ID" and "Microsoft Entra authentication" to match current Microsoft documentation.
- The setup examples used a private Azure Container Registry image while only showing `--assign-identity`. ACI does not use the assigned identity for ACR image pulls unless the deployment also configures registry pull authentication. Updated the basic managed identity examples to use a public Microsoft sample image so the snippets focus on managed identity setup.
- The ACR section only granted `AcrPull`, but did not show how to configure ACI to use the identity for pulling the image. Added `--acr-identity $IDENTITY_ID` to the ACR deployment command, matching current Azure CLI and ACI documentation.
- The manual token section described the IMDS endpoint without an OS caveat. Clarified that the `169.254.169.254` IMDS endpoint applies to Linux containers and that Windows containers use `IDENTITY_ENDPOINT` and `IDENTITY_HEADER`.

## Review Notes
The SDK examples are syntactically valid and use current Azure Identity patterns. For production Azure-hosted applications, Microsoft recommends `ManagedIdentityCredential` when you want to avoid accidentally using another credential in the `DefaultAzureCredential` chain, but the examples are still technically correct for the tutorial's local-and-ACI workflow.
