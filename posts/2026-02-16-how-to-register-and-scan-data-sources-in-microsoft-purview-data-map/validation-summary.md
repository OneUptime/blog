# Validation Summary: How to Register and Scan Data Sources in Microsoft Purview Data Map

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Purview Data Map
- Microsoft Purview scanning data-plane REST API
- Azure SQL Database
- Azure Storage / Azure Blob Storage
- Azure Synapse Analytics
- Azure managed identities
- Azure RBAC
- Azure CLI
- Python requests
- T-SQL

## Sources Consulted
- Microsoft Purview Scanning Data Plane REST API - Data Sources Create Or Replace: https://learn.microsoft.com/en-us/rest/api/purview/scanningdataplane/data-sources/create-or-replace?view=rest-purview-scanningdataplane-2023-09-01
- Microsoft Purview Scanning Data Plane REST API - Scans Create Or Replace: https://learn.microsoft.com/en-us/rest/api/purview/scanningdataplane/scans/create-or-replace?view=rest-purview-scanningdataplane-2023-09-01
- Microsoft Purview Scanning Data Plane REST API - Triggers Create Or Replace: https://learn.microsoft.com/en-us/rest/api/purview/scanningdataplane/triggers/create-or-replace?view=rest-purview-scanningdataplane-2023-09-01
- Microsoft Purview Scanning Data Plane REST API - Scan Result: https://learn.microsoft.com/en-us/rest/api/purview/scanningdataplane/scan-result?view=rest-purview-scanningdataplane-2023-09-01
- Scans and ingestion in Microsoft Purview Data Map: https://learn.microsoft.com/en-us/purview/data-map-scan-ingestion
- Discover and govern Azure SQL database in Microsoft Purview: https://learn.microsoft.com/en-us/purview/register-scan-azure-sql-database
- Discover and govern Azure Blob Storage in Microsoft Purview: https://learn.microsoft.com/en-us/azure/purview/register-scan-azure-blob-storage-source
- Azure CLI az role assignment documentation: https://learn.microsoft.com/en-us/cli/azure/role/assignment?view=azure-cli-latest
- Azure RBAC role assignment using Azure CLI: https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-cli

## Issues Found
- The REST API examples used the older `2022-07-01-preview` API version. Updated the examples to use the current documented scanning data-plane API version, `2023-09-01`.
- The Python snippets referenced `access_token` without defining it. Added an explicit placeholder variable so the snippets are syntactically complete.
- The prerequisites understated Purview portal permissions and source permissions. Updated them to include both Data Source Administrator and Data Reader in Purview, plus source-specific read permissions.
- The Azure CLI role assignment used `--assignee-object-id` without `--assignee-principal-type`. Added `--assignee-principal-type ServicePrincipal`, matching Azure RBAC CLI guidance for object ID assignments.
- The Azure Storage registration example described the payload as covering both Azure Blob Storage and ADLS Gen2. Narrowed the text to Azure Blob Storage because Microsoft Purview documents ADLS Gen2 as a separate data source type with its own endpoint pattern.
- The managed identity scan payloads used credential scan kinds (`AzureSqlDatabaseCredential`, `AzureStorageCredential`) and credential references. Changed them to the managed identity scan kinds (`AzureSqlDatabaseMsi`, `AzureStorageMsi`) and removed credential blocks that are not part of the MSI scan payload shape.
- The scan history example printed `lastUpdatedAssetsCount`, which is not documented in the current scan result model. Changed it to print `lastUpdatedAt`.
- The data sampling explanation said Microsoft Purview stores sample values. Reworded it to say Purview stores scan metadata, schema, and classifications rather than copying source data into the catalog.

## Review Notes
The Synapse section shows the registration payload but does not include the corresponding `requests.put` call. This is incomplete as a tutorial example, but not technically incorrect in the narrow snippet because it only demonstrates the payload shape.
