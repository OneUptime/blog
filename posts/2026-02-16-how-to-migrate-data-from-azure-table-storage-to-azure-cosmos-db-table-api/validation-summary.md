# Validation Summary: How to Migrate Data from Azure Table Storage to Azure Cosmos DB Table API

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Azure Table Storage
- Azure Cosmos DB for Table
- Azure CLI
- Azure Data Factory copy activity
- Azure Cosmos DB Data Migration Tool
- Python
- Azure SDK for Python `azure-data-tables`

## Sources Consulted
- Microsoft Learn: Azure Table Storage support in Azure Cosmos DB for Table - https://learn.microsoft.com/en-us/azure/cosmos-db/table/support
- Microsoft Learn: Frequently asked questions about Azure Cosmos DB for Table - https://learn.microsoft.com/en-ca/azure/cosmos-db/table/faq
- Microsoft Learn: Azure Cosmos DB indexing overview - https://learn.microsoft.com/en-us/azure/cosmos-db/index-overview
- Microsoft Learn: Azure Cosmos DB Data Migration Tool - https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-migrate-desktop-tool
- Microsoft Learn: Azure Data Factory Azure Table Storage connector - https://learn.microsoft.com/en-us/azure/data-factory/connector-azure-table-storage
- Microsoft Learn: Azure Data Factory pipeline REST model for `AzureTableSource` and `AzureTableSink` - https://learn.microsoft.com/en-us/rest/api/datafactory/pipelines/list-by-factory?view=rest-datafactory-2018-06-01
- Microsoft Learn: Azure SDK for Python `TableClient` API reference - https://learn.microsoft.com/en-us/python/api/azure-data-tables/azure.data.tables.tableclient?view=azure-python
- Microsoft Learn: Azure Table Storage entity group transaction requirements - https://learn.microsoft.com/en-us/rest/api/storageservices/performing-entity-group-transactions
- Microsoft Learn: Azure Cosmos DB for Table Python quickstart - https://learn.microsoft.com/en-us/azure/cosmos-db/table/how-to-use-python
- Microsoft Learn: Azure CLI Data Factory create command - https://learn.microsoft.com/en-nz/cli/azure/datafactory?view=azure-cli-latest
- Microsoft Learn: Azure Cosmos DB CLI samples for Table API - https://learn.microsoft.com/en-us/azure/cosmos-db/scripts/cli/table/create

## Issues Found
- The post described the metadata goal as migration with "minimal downtime and data loss," but the steps shown are an offline copy-and-cutover flow without change feed or dual-write synchronization. I changed the description to "with a planned cutover and validation."
- The tool name was listed as "Data Migration Tool (dt)." Current Microsoft documentation refers to the Azure Cosmos DB Data Migration Tool and its command as `dmt`, so I updated the wording.
- The Data Factory sink was described as a distinct Azure Cosmos DB Table API linked service. Official Data Factory documentation exposes `AzureTableSource` and `AzureTableSink` for table data, while Cosmos DB's Data Factory connector documentation is for NoSQL. I changed the sink wording to use an Azure Table Storage linked service configured with the Cosmos DB Table API connection string.
- The Python migration sample imported `TableServiceClient` but did not use it. I removed the unused import to keep the example accurate.
- The throttling retry sample said it extracted a retry-after header but always used exponential backoff. I updated it to honor `x-ms-retry-after-ms` or `Retry-After` when the response includes them, falling back to exponential backoff.
- The validation sample used `query_entities(query_filter="")`, but `query_entities` requires a filter string. I changed it to use `list_entities(select=[...])` with `itertools.islice` to sample the first 10 entities.

## Review Notes
- The post's core claims about Cosmos DB for Table latency, global distribution, throughput, and automatic indexing align with Microsoft documentation.
- The batch migration code uses `submit_transaction` with batches under 100 entities and grouped by `PartitionKey`, which matches Azure Table transaction requirements. For production-scale migrations, also watch the 4 MiB transaction payload limit and add durable checkpointing.
- The Azure CLI could not be checked with local `az --help` because the Azure CLI is not installed in this environment, so CLI verification used official Microsoft Learn documentation.
