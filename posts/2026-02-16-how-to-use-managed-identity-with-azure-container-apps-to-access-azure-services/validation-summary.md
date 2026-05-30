# Validation Summary: How to Use Managed Identity with Azure Container Apps to Access Azure Services

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Container Apps
- Managed identities for Azure resources
- Microsoft Entra ID
- Azure Key Vault
- Azure Storage Blob
- Azure SQL Database
- Azure Service Bus
- Azure Container Registry
- Azure CLI
- Azure Identity SDK for JavaScript and Python
- Node.js mssql package

## Sources Consulted
- Microsoft Learn: Managed identities in Azure Container Apps: https://learn.microsoft.com/en-us/azure/container-apps/managed-identity
- Microsoft Learn: Azure CLI az containerapp identity: https://learn.microsoft.com/en-us/cli/azure/containerapp/identity
- Microsoft Learn: Azure CLI az containerapp registry: https://learn.microsoft.com/en-us/cli/azure/containerapp/registry
- Microsoft Learn: Azure Key Vault RBAC guide: https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide
- Microsoft Learn: Azure CLI az role assignment: https://learn.microsoft.com/en-us/cli/azure/role/assignment
- Microsoft Learn: Connect to Azure SQL Database using Node.js and mssql: https://learn.microsoft.com/en-us/azure/azure-sql/database/azure-sql-javascript-mssql-quickstart
- Microsoft Learn: Configure Microsoft Entra authentication for Azure SQL: https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-aad-configure
- Tedious documentation: Connection authentication options: https://tediousjs.github.io/tedious/api-connection.html
- Microsoft Learn: DefaultAzureCredential client ID options for JavaScript: https://learn.microsoft.com/en-us/javascript/api/@azure/identity/defaultazurecredentialclientidoptions
- Microsoft Learn: Azure Identity credential chains for Python: https://learn.microsoft.com/en-us/azure/developer/python/sdk/authentication/credential-chains

## Issues Found
- The Key Vault example said to use Azure RBAC but used `az keyvault set-policy`, which configures the legacy access-policy permission model. Changed it to assign the `Key Vault Secrets User` RBAC role at the vault scope.
- The Azure SQL example granted the container app identity Microsoft Entra admin on the SQL server. That is not the normal least-privilege way to grant application data access and can only represent a server-level admin configuration. Changed it to create a contained database user for the managed identity and grant database roles.

## Review Notes
- The post still uses "Azure AD" in some explanatory text and tags. Microsoft now uses "Microsoft Entra ID", but Azure AD remains common in older command names, SDK option names, and developer terminology.
- The Azure SQL role grants are illustrative. Production applications should grant narrower database permissions than `db_datareader` and `db_datawriter` when possible.
