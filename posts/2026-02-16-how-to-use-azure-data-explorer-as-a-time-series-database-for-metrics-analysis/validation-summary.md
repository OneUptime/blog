# Validation Summary: How to Use Azure Data Explorer as a Time Series Database for Metrics Analysis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Data Explorer
- Kusto Query Language (KQL)
- Azure CLI Kusto extension
- Azure Data Explorer Python SDK
- Grafana Azure Data Explorer data source
- Azure Monitor
- Power BI

## Sources Consulted
- Microsoft Learn: Azure CLI `az kusto cluster` reference - https://learn.microsoft.com/en-us/cli/azure/kusto/cluster
- Microsoft Learn: Azure CLI `az kusto database` reference - https://learn.microsoft.com/en-us/cli/azure/kusto/database
- Microsoft Learn: `.alter table policy streamingingestion` command - https://learn.microsoft.com/en-us/kusto/management/alter-table-streaming-ingestion-policy-command
- Microsoft Learn: `.alter table policy ingestionbatching` command - https://learn.microsoft.com/en-us/kusto/management/alter-table-ingestion-batching-policy
- Microsoft Learn: Ingestion batching policy - https://learn.microsoft.com/en-us/kusto/management/batching-policy
- Microsoft Learn: Ingestion mappings - https://learn.microsoft.com/en-us/kusto/management/mappings
- Microsoft Learn: Ingest JSON data into Azure Data Explorer - https://learn.microsoft.com/en-us/azure/data-explorer/ingest-json-formats
- Microsoft Learn: Azure Data Explorer Python ingestion library - https://learn.microsoft.com/en-us/azure/data-explorer/python-ingest-data
- Microsoft Learn: Materialized view creation and supported aggregations - https://learn.microsoft.com/en-us/kusto/management/materialized-views/materialized-view-create
- Microsoft Learn: Caching policy command - https://learn.microsoft.com/en-us/kusto/management/alter-database-cache-policy-command
- Microsoft Learn: Retention policy - https://learn.microsoft.com/en-au/kusto/management/retention-policy
- Microsoft Learn: `.show extents` command - https://learn.microsoft.com/en-us/kusto/management/show-extents
- Grafana Labs: Azure Data Explorer data source plugin - https://grafana.com/grafana/plugins/grafana-azure-data-explorer-datasource/

## Issues Found
- The Azure CLI database creation example mixed the current extension-style `--database-name` argument with deprecated direct `--soft-delete-period` and `--hot-cache-period` flags. Updated it to use `--read-write-database` with `location`, `soft-delete-period`, and `hot-cache-period`.
- The cluster creation example configured table streaming ingestion later but did not enable streaming ingest on the cluster. Added `--enable-streaming-ingest true`.
- The streaming ingestion policy command used unsupported shorthand syntax. Replaced it with the documented JSON policy object: `{"IsEnabled": true}`.
- The ingestion batching policy JSON was split into a separate text block, making the example not directly runnable as a KQL command. Kept the serialized policy object in the same KQL block.
- The Python sample used `datetime.utcnow()`, which is deprecated in current Python versions. Replaced it with `datetime.now(timezone.utc)`.
- The Grafana query used `$__interval`, but the Azure Data Explorer data source documents `$__timeInterval` for KQL bin sizes. Updated the macro.
- The retention policy command used property-style syntax with `.alter table`; documented examples use `.alter-merge` for `softdelete` and `recoverability`. Updated the command accordingly.

## Review Notes
The post's JSON ingestion sample relies on Azure Data Explorer identity mapping, which is valid because the JSON field names match the table column names case-sensitively. The Azure CLI Kusto command group is still marked experimental in the extension documentation, so examples may need future review if the extension interface changes.
