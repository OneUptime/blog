# Validation Summary: How to Set Up Streaming Ingestion in Azure Data Explorer from Event Hubs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Data Explorer
- Azure Event Hubs
- Kusto Query Language (KQL)
- Azure CLI Kusto extension
- Azure managed identities and Azure RBAC
- Azure Event Hubs Python SDK

## Sources Consulted
- Microsoft Learn: Configure streaming ingestion on your Azure Data Explorer cluster: https://learn.microsoft.com/en-us/azure/data-explorer/ingest-data-streaming
- Microsoft Learn: Create an Event Hubs data connection for Azure Data Explorer: https://learn.microsoft.com/en-us/azure/data-explorer/ingest-data-event-hub
- Microsoft Learn: az kusto cluster CLI reference: https://learn.microsoft.com/en-us/cli/azure/kusto/cluster
- Microsoft Learn: az kusto data-connection event-hub CLI reference: https://learn.microsoft.com/en-us/cli/azure/kusto/data-connection/event-hub
- Microsoft Learn: Streaming ingestion policy: https://learn.microsoft.com/en-us/kusto/management/streaming-ingestion-policy
- Microsoft Learn: .alter table policy streamingingestion command: https://learn.microsoft.com/en-us/kusto/management/alter-table-streaming-ingestion-policy-command
- Microsoft Learn: .alter database policy streamingingestion command: https://learn.microsoft.com/en-us/kusto/management/alter-database-streaming-ingestion-policy-command
- Microsoft Learn: .show streamingingestion statistics command: https://learn.microsoft.com/en-us/kusto/management/streaming-ingestion-statistics
- Microsoft Learn: .show streamingingestion failures command: https://learn.microsoft.com/en-us/kusto/management/streaming-ingestion-failures
- Microsoft Learn: ingestion_time() function and ingestion time policy: https://learn.microsoft.com/en-us/kusto/query/ingestion-time-function
- Microsoft Learn: datetime_diff() function: https://learn.microsoft.com/en-us/kusto/query/datetime-diff-function
- Microsoft Learn: Ingestion mappings: https://learn.microsoft.com/en-us/kusto/management/mappings
- Microsoft Learn: Azure Event Hubs Python SDK EventHubProducerClient: https://learn.microsoft.com/en-us/python/api/azure-eventhub/azure.eventhub.eventhubproducerclient

## Issues Found
- The post described Event Hubs data connection setup as enabling a CLI "streaming mode." Azure Data Explorer uses streaming ingestion for Event Hubs data connections based on cluster enablement and the target table or database streaming ingestion policy, not a data connection streaming flag. Updated the wording.
- The streaming ingestion policy examples used `.alter ... policy streamingingestion enable`, which is not valid Kusto syntax. Replaced these examples with JSON policy objects using `{"IsEnabled": true}`.
- The latency query used `ingestion_time()` without enabling the ingestion time policy. Added `.alter table LiveTelemetry policy ingestiontime true` so the monitoring query can return values for newly ingested records.
- The Event Hubs data connection CLI example omitted `--location`, used only `--managed-identity-resource-id`, and selected an Event Hub system property without adding it to the table schema and mapping. Added `--location`, added `--managed-identity`, and removed the unmapped `--event-system-properties` option.
- The streaming ingestion failure query projected non-existent output columns (`Timestamp`, `ErrorKind`, `ErrorMessage`). Replaced them with documented columns: `LastFailureOn`, `FailureKind`, `ErrorCode`, and `Details`.
- The streaming ingestion statistics query filtered on a non-existent `Timestamp` column. Replaced it with `EndTime` and summarized by `IngestionStatus`.
- The post claimed general automatic fallback from streaming ingestion to batched ingestion on streaming failures. Official docs document fallback for transactional update policy retries, not a broad fallback guarantee for all streaming ingestion failures. Updated the section to focus on monitoring failures and accurately scoped fallback behavior.
- The performance guidance included unsupported specific sizing and throughput numbers. Replaced the 20-30% sizing rule and 200MB/sec cluster throughput claim with documented guidance: benchmark and scale by workload, use queued ingestion above about 4GB/hour per table, and account for concurrency limits by cluster cores.
- The post claimed sub-second data freshness and guaranteed sub-second dashboard query response. Adjusted the wording to low-latency data freshness and hot cache helping keep query response times low.

## Review Notes
The post is technically relevant and contains implementation details. Azure CLI was not installed in the local environment, so CLI verification was performed against the official Microsoft Learn CLI reference rather than local `az --help` output.
