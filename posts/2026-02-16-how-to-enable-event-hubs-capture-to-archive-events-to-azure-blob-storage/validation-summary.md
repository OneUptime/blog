# Validation Summary: How to Enable Event Hubs Capture to Archive Events to Azure Blob Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Event Hubs Capture
- Azure Blob Storage
- Azure Data Lake Storage Gen2
- Azure CLI
- Apache Avro
- Python
- Apache Spark
- Azure Synapse Analytics
- Azure Storage lifecycle management

## Sources Consulted
- Azure Event Hubs Capture overview: https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-capture-overview
- Azure CLI `az eventhubs eventhub` reference: https://learn.microsoft.com/en-us/cli/azure/eventhubs/eventhub?view=azure-cli-latest
- Azure Event Hubs REST API capture destination model: https://learn.microsoft.com/en-us/rest/api/eventhub/event-hubs/create-or-update?view=rest-eventhub-2026-01-01
- Azure Event Hubs captured Avro schema: https://learn.microsoft.com/en-us/azure/event-hubs/explore-captured-avro-files
- Azure Synapse serverless SQL `OPENROWSET` reference: https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/develop-openrowset
- Azure Synapse SQL supported data formats: https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/overview-features
- Azure Storage lifecycle management policy REST model: https://learn.microsoft.com/en-us/rest/api/storagerp/management-policies/create-or-update?view=rest-storagerp-2023-05-01

## Issues Found
- The ADLS Gen2 Azure CLI example used `--destination-name "EventHubArchive.AzureDataLake"` and `--data-lake-*` flags that are not part of the current `az eventhubs eventhub update` command. Updated the example to use the supported storage account resource ID and `--blob-container`/file system pattern with `EventHubArchive.AzureBlockBlob`.
- One custom `--archive-name-format` example omitted required placeholders. Updated it to include `{Namespace}`, `{EventHub}`, `{PartitionId}`, `{Year}`, `{Month}`, `{Day}`, `{Hour}`, `{Minute}`, and `{Second}`.
- The Synapse serverless SQL section incorrectly said serverless SQL can query Avro files directly with `FORMAT = 'AVRO'`. Updated the section to explain that serverless SQL cannot read Avro directly and changed the sample to query converted Parquet files.
- The cost section incorrectly said Capture consumes throughput unit egress capacity. Updated it to reflect that Event Hubs Capture bypasses throughput unit/processing unit egress quotas and is billed separately in Standard while included in Premium.

## Review Notes
The Azure CLI was not installed in the local workspace, so command verification was performed against the official Azure CLI documentation rather than local `az --help` output.
