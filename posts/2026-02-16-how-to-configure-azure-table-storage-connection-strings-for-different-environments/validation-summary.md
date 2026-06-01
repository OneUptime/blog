# Validation Summary: How to Configure Azure Table Storage Connection Strings

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Table Storage
- Azure Storage connection strings
- Azurite
- Azure App Service app settings
- Azure Key Vault
- Azure managed identities and Microsoft Entra ID
- Azure RBAC
- Azure CLI
- Kubernetes Secrets
- .NET configuration
- Python Azure SDK

## Sources Consulted
- Microsoft Learn: Configure Azure Storage connection strings - https://learn.microsoft.com/en-us/azure/storage/common/storage-configure-connection-string
- Microsoft Learn: Azure App Service app settings and connection strings - https://learn.microsoft.com/en-us/azure/app-service/configure-common
- Microsoft Learn: Azure CLI `az webapp config appsettings` - https://learn.microsoft.com/en-us/cli/azure/webapp/config/appsettings
- Microsoft Learn: Azure CLI `az webapp config connection-string` - https://learn.microsoft.com/en-us/cli/azure/webapp/config/connection-string
- Microsoft Learn: Assign an Azure role for access to table data - https://learn.microsoft.com/en-us/azure/storage/tables/assign-azure-role-data-access
- Microsoft Learn: Authorize Azure Storage requests with Microsoft Entra ID - https://learn.microsoft.com/en-us/rest/api/storageservices/authorize-with-azure-active-directory
- Microsoft Learn: Azure.Data.Tables `TableServiceClient` for .NET - https://learn.microsoft.com/en-us/dotnet/api/azure.data.tables.tableserviceclient
- Microsoft Learn: Azure Tables client library for Python - https://learn.microsoft.com/en-us/python/api/overview/azure/data-tables-readme
- Microsoft Learn: Manage Azure Storage account access keys - https://learn.microsoft.com/en-us/azure/storage/common/storage-account-keys-manage

## Issues Found
- The App Service CLI example used `az webapp config connection-string set` with a custom connection string named `AzureTableStorage`, but the .NET code reads `AZURE_TABLE_STORAGE_CONNECTION_STRING`. App Service custom connection strings are exposed with connection-string prefixes, not as that exact environment variable. Changed the commands to `az webapp config appsettings set` and used the `AZURE_TABLE_STORAGE_CONNECTION_STRING` setting name.
- The local `UseDevelopmentStorage=true` example was labeled as Azure Storage Emulator. Current Azure Storage documentation describes this shortcut for the Azurite emulator. Updated the label to Azurite.
- Several `appsettings.*.json` snippets included filename comments inside `json` code blocks. Moved the filenames outside the snippets so the shown JSON is valid configuration content.
- The `.env` guidance implied that a `.env` file alone sets environment variables. Clarified that the file must be loaded by local tooling, or the variable should be set directly.
- The Key Vault section implied that storing a connection string as a secret automatically provides rotation. Clarified that Key Vault provides options for automating rotation; a stored secret alone still needs a rotation process.

## Review Notes
- The managed identity recommendation, `Storage Table Data Contributor` role, Azure Key Vault usage, SAS connection string format, Azurite endpoint, Python `TableServiceClient` usage, and storage key rotation sequence are consistent with Microsoft documentation.
- Azure CLI was not installed in the local environment, so CLI verification was performed against official Microsoft Learn CLI reference pages rather than local `az --help` output.
