# Validation Summary: How to Ingest Data into Azure Data Explorer Using Kusto

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Data Explorer
- Kusto Query Language management commands
- Azure Blob Storage ingestion
- Azure Event Grid data connections
- Azure CLI Kusto extension
- Kusto Python SDK
- Kusto .NET SDK

## Sources Consulted
- Microsoft Learn: Azure Data Explorer data ingestion overview - https://learn.microsoft.com/en-us/azure/data-explorer/ingest-data-overview
- Microsoft Learn: Ingest JSON formatted data into Azure Data Explorer - https://learn.microsoft.com/en-us/azure/data-explorer/ingest-json-formats
- Microsoft Learn: .ingest inline command - https://learn.microsoft.com/en-us/kusto/management/data-ingestion/ingest-inline
- Microsoft Learn: .ingest into command - https://learn.microsoft.com/en-us/kusto/management/data-ingestion/ingest-into-command
- Microsoft Learn: Configure streaming ingestion on your Azure Data Explorer cluster - https://learn.microsoft.com/en-us/azure/data-explorer/ingest-data-streaming
- Microsoft Learn: Monitor queued ingestion with metrics - https://learn.microsoft.com/en-us/azure/data-explorer/monitor-queued-ingestion
- Microsoft Learn: Azure CLI az kusto data-connection event-grid reference - https://learn.microsoft.com/en-us/cli/azure/kusto/data-connection/event-grid
- Microsoft Learn: Ingest data using the Kusto .NET SDK - https://learn.microsoft.com/en-us/azure/data-explorer/net-sdk-ingest-data
- Microsoft Learn: Kusto ingest client interfaces and factory classes - https://learn.microsoft.com/en-us/azure/data-explorer/kusto/api/netfx/kusto-ingest-client-reference
- Microsoft Learn: Retention policy - https://learn.microsoft.com/en-us/kusto/management/retention-policy
- Microsoft Learn: .show ingestion failures command - https://learn.microsoft.com/en-us/kusto/management/ingestion-failures
- Microsoft Learn: .show extents command - https://learn.microsoft.com/en-us/kusto/management/show-extents
- Azure SDK source: azure-kusto-python ingestion properties and queued ingest client - https://github.com/Azure/azure-kusto-python

## Issues Found
- The JSON ingestion mapping was written as separate quoted string fragments. Changed it to a single Kusto verbatim string literal so the `.create table ... ingestion json mapping` command is directly runnable.
- The .NET SDK example used `KustoIngestionProperties` with a queued ingestion client. Changed it to `KustoQueuedIngestionProperties`, which is the SDK type documented for queued ingestion.
- The Event Grid section used invalid KQL syntax, `.create table AppLogs ingestion batching policy`. Changed it to `.alter-merge table AppLogs policy ingestionbatching`, which is the documented ingestion batching policy command.
- The monitoring section labeled `.show commands` as checking successful ingestions. Narrowed the comment to "recent direct ingestion commands" because `.show commands` does not represent a general success log for all queued SDK/data-connection ingestions.

## Review Notes
The Azure CLI example uses the documented `az kusto data-connection event-grid create` parameters. Local Azure CLI was not installed in the review environment, so CLI validation was performed against the official Microsoft Learn command reference instead of local `az --help`.
