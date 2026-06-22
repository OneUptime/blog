# Validation Summary: How to Fix 'Connection String' Errors in Azure

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Storage accounts and Blob Storage
- Azure SQL Database
- Azure Service Bus
- Azure Cosmos DB for NoSQL
- Azure CLI
- Python Azure SDKs
- pyodbc and ODBC Driver 18 for SQL Server
- Azure Key Vault references for App Service
- Managed identity authentication

## Sources Consulted
- Microsoft Learn: Configure Azure Storage connection strings: https://learn.microsoft.com/en-us/azure/storage/common/storage-configure-connection-string
- Microsoft Learn: az storage account network-rule CLI reference: https://learn.microsoft.com/en-us/cli/azure/storage/account/network-rule?view=azure-cli-latest
- Microsoft Learn: az sql db CLI reference: https://learn.microsoft.com/en-us/cli/azure/sql/db?view=azure-cli-latest
- Microsoft Learn: Azure SQL Database server-level firewall rules: https://learn.microsoft.com/en-us/azure/azure-sql/database/firewall-create-server-level-portal-quickstart?view=azuresql
- Microsoft Learn: Microsoft Entra ID with the ODBC Driver for SQL Server: https://learn.microsoft.com/en-us/sql/connect/odbc/using-azure-active-directory?view=sql-server-ver17
- Microsoft Learn: Contained database users: https://learn.microsoft.com/en-us/sql/relational-databases/databases/contained-databases?view=sql-server-ver17
- Microsoft Learn: Azure Service Bus Python client library: https://learn.microsoft.com/en-us/python/api/overview/azure/servicebus-readme?view=azure-python
- Microsoft Learn: ServiceBusAdministrationClient class: https://learn.microsoft.com/en-us/python/api/azure-servicebus/azure.servicebus.management.servicebusadministrationclient?view=azure-python
- Microsoft Learn: az servicebus queue authorization-rule CLI reference: https://learn.microsoft.com/en-us/cli/azure/servicebus/queue/authorization-rule?view=azure-cli-latest
- Microsoft Learn: az cosmosdb CLI reference: https://learn.microsoft.com/en-us/cli/azure/cosmosdb?view=azure-cli-latest
- Microsoft Learn: Azure Cosmos DB firewall configuration: https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-configure-firewall

## Issues Found
- The SAS token example used an expiry date in 2024, which would be expired for this 2026-dated post. Updated the example expiry to 2027.
- The Blob container creation example caught every exception and would attempt creation even on authentication or network errors. Changed it to catch `ResourceNotFoundError`, matching the intended "container does not exist" case.
- The Storage 403 heading incorrectly described the error as "The specified resource does not exist." Changed it to authorization or network access denied, which matches firewall and authorization failures.
- The SQL section used `az sql db execute`, which is not a current Azure CLI command in the `az sql db` command group. Replaced it with a `sqlcmd` example for creating a contained database user and granting roles.
- The SQL common mistakes list said using `Database` instead of `Initial Catalog` is wrong. Both are accepted connection string keywords, so the note now warns about omitting or using the wrong database name.
- The Service Bus queue existence example used private sender internals (`sender._handler`) and did not reliably check entity existence. Replaced it with `ServiceBusAdministrationClient.get_queue()` and `ResourceNotFoundError`.
- The debug helper masked keys and passwords but would print SAS signatures. Updated masking to include signature and secret fields.

## Review Notes
The Azure CLI is not installed in the local environment, so CLI validation was performed against Microsoft Learn CLI reference pages rather than local `az --help` output. Python snippets were checked with `ast.parse` for syntax after edits.
