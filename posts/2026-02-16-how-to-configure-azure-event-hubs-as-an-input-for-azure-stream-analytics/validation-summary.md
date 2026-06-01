# Validation Summary: How to Configure Azure Event Hubs as an Input for Azure Stream Analytics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Event Hubs
- Azure Stream Analytics
- Azure CLI
- Azure Resource Manager input configuration
- Stream Analytics Query Language
- Managed identities and Azure RBAC

## Sources Consulted
- Microsoft Learn: Stream data as input into Stream Analytics - https://learn.microsoft.com/en-us/azure/stream-analytics/stream-analytics-define-inputs
- Microsoft Learn: Azure CLI `az eventhubs eventhub` reference - https://learn.microsoft.com/en-us/cli/azure/eventhubs/eventhub?view=azure-cli-latest
- Microsoft Learn: Microsoft.StreamAnalytics/streamingjobs ARM template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.streamanalytics/streamingjobs
- Microsoft Learn: Azure Stream Analytics streaming units explained - https://learn.microsoft.com/en-us/azure/stream-analytics/stream-analytics-streaming-unit-consumption
- Microsoft Learn: Use query parallelization and scale in Azure Stream Analytics - https://learn.microsoft.com/en-in/azure/stream-analytics/stream-analytics-parallelization
- Microsoft Learn: Stream Analytics `FROM` query syntax - https://learn.microsoft.com/en-us/stream-analytics-query/from-azure-stream-analytics
- Microsoft Learn: Configuring event ordering policies for Azure Stream Analytics - https://learn.microsoft.com/en-us/azure/stream-analytics/event-ordering
- Microsoft Learn: Dynamically add partitions to an event hub - https://learn.microsoft.com/en-us/azure/event-hubs/dynamically-add-partitions
- Microsoft Learn: User-assigned managed identities for Azure Stream Analytics - https://learn.microsoft.com/en-us/azure/stream-analytics/stream-analytics-user-assigned-managed-identity-overview
- Microsoft Learn: Analyze Stream Analytics job performance by using metrics and dimensions - https://learn.microsoft.com/en-us/azure/stream-analytics/stream-analytics-job-analysis-with-metric-dimensions

## Issues Found
- Updated the Event Hub creation command from the outdated `--message-retention 1` option to current Azure CLI syntax, `--retention-time-in-hours 24`, and clarified that the value is in hours.
- Removed the unsupported throughput claim tying 4 partitions to 4 MB/s input. Event Hubs throughput depends on capacity settings such as throughput units or the selected tier, not just partition count.
- Corrected partition-count guidance to note that Standard tier partition counts are fixed after creation, while Premium and Dedicated tiers can dynamically add partitions with ordering caveats.
- Reworded the consumer group warning to reflect the documented reader limit per consumer group and partition.
- Corrected managed identity guidance. Stream Analytics managed identity must be enabled or selected; it is not simply on by default for every job.
- Changed the shared access key retrieval example to query `primaryKey`, because the ARM input snippet uses `sharedAccessPolicyKey` rather than a full connection string.
- Removed JavaScript-style comments from the JSON ARM snippet and added `authenticationMode: "ConnectionString"` so the snippet remains valid JSON.
- Corrected Event Hub input serialization formats to JSON, CSV, and Avro. Removed Parquet from the Event Hub input list.
- Replaced the inaccurate "1 SU per partition" scaling formula with current Microsoft guidance that one V2 streaming unit can process roughly 7 MB/s depending on query complexity.
- Fixed the partitioned Stream Analytics query so `PARTITION BY` appears before `TIMESTAMP BY`, matching the documented `FROM` clause syntax.

## Review Notes
The Azure CLI was not installed in the local workspace, so command validation was performed against the official Azure CLI reference rather than local `az --help` output.
