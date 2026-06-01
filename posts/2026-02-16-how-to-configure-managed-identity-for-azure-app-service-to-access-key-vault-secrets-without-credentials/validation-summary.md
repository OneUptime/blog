# Validation Summary: How to Configure Managed Identity for Azure App Service to Access Key Vault

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure App Service
- Azure Managed Identity
- Microsoft Entra ID
- Azure Key Vault
- Azure RBAC
- Azure CLI
- Azure PowerShell
- Azure SDK for .NET
- Azure SDK for Python
- Azure SDK for JavaScript/Node.js

## Sources Consulted
- Microsoft Learn: Managed identities for Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/overview-managed-identity
- Microsoft Learn: Use Key Vault references as app settings in Azure App Service and Azure Functions - https://learn.microsoft.com/en-gb/azure/app-service/app-service-key-vault-references
- Microsoft Learn: Azure CLI `az webapp identity` reference - https://learn.microsoft.com/en-us/cli/azure/webapp/identity
- Microsoft Learn: Provide access to Key Vault keys, certificates, and secrets with Azure RBAC - https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide
- Microsoft Learn: Configure network security for Azure Key Vault - https://learn.microsoft.com/en-us/azure/key-vault/general/network-security
- Microsoft Learn: Azure Identity client library for .NET - https://learn.microsoft.com/en-us/dotnet/api/overview/azure/identity-readme

## Issues Found
- The managed identity flow described App Service as using the Azure Instance Metadata Service endpoint. Azure App Service exposes a local managed identity endpoint through `IDENTITY_ENDPOINT` and `IDENTITY_HEADER`, so the explanation and sequence diagram were updated to avoid implying the VM IMDS flow.
- The Key Vault networking section recommended App Service outbound IP allowlisting for firewall-enabled vaults. Microsoft documentation says Key Vault references should not depend on App Service public outbound IPs because the origin IP can differ, so the section now recommends VNet integration with a private endpoint or virtual network rule.
- The same networking section presented trusted Microsoft services bypass as a general alternative. Microsoft documents that the trusted services list is limited and does not provide a blanket exception for arbitrary customer code, so the text now states that the bypass only applies where the service scenario is supported.
- The user-assigned managed identity example used Azure PowerShell to assign the identity to App Service. Microsoft documentation states that adding a user-assigned identity to App Service by Azure PowerShell is currently not supported, so the example was changed to Azure CLI and now also sets `keyVaultReferenceIdentity` for Key Vault references.

## Review Notes
The SDK examples use current Azure Identity and Key Vault Secret client patterns. Key Vault references without a pinned secret version use the latest version and are refreshed by App Service within 24 hours, which is relevant operational behavior but not required for this tutorial's correctness.
