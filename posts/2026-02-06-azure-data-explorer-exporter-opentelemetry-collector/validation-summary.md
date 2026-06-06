# Validation Summary: How to Configure the Azure Data Explorer Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- Azure Data Explorer exporter
- Azure Data Explorer / Kusto Query Language
- Azure CLI
- Microsoft Entra service principals and managed identity

## Sources Consulted
- OpenTelemetry Collector Contrib Azure Data Explorer exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/azuredataexplorerexporter/README.md
- OpenTelemetry Collector Contrib Azure Data Explorer exporter config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/azuredataexplorerexporter/config.go
- Microsoft Learn, Ingest data from OpenTelemetry to Azure Data Explorer: https://learn.microsoft.com/en-us/azure/data-explorer/open-telemetry-connector
- Microsoft Learn, Azure CLI `az kusto cluster`: https://learn.microsoft.com/en-us/cli/azure/kusto/cluster
- Microsoft Learn, JSON ingestion mappings in Azure Data Explorer: https://learn.microsoft.com/en-us/azure/data-explorer/ingest-json-formats
- Microsoft Learn, Kusto caching policy command: https://learn.microsoft.com/en-us/kusto/management/alter-table-cache-policy-command
- Microsoft Learn, Kusto partitioning policy: https://learn.microsoft.com/en-us/kusto/management/partitioning-policy
- Microsoft Learn, Kusto row-level security policy: https://learn.microsoft.com/en-gb/kusto/management/row-level-security-policy
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/

## Issues Found
- The exporter configuration used unsupported field names such as `database`, `client_id`, `client_secret`, `traces_table`, `metrics_table`, `logs_table`, and `*_mapping`. Updated them to the documented ADX exporter fields: `db_name`, `application_id`, `application_key`, `*_table_name`, and `*_table_json_mapping`.
- The examples used `ingestion_type: "streaming"`, but the ADX exporter accepts `managed` for streaming ingestion and `queued` for queued ingestion. Updated the examples and explanatory text.
- The examples used ingestion endpoint-style cluster URIs. Updated them to the documented cluster URI form, `https://<cluster>.<region>.kusto.windows.net`.
- The advanced configuration included unsupported ADX exporter options: `max_batch_size_mb`, `flush_interval`, and `compression`. Removed those and kept supported exporter helper settings.
- The managed identity example used `use_managed_identity: true`, which is not a documented exporter option. Replaced it with `managed_identity_id: "system"`.
- The ADX table definitions did not match the exporter’s documented output schema. Replaced them with the official `OTELTraces`, `OTELMetrics`, and `OTELLogs` schemas.
- The ingestion mapping examples had broken Markdown fences and mapped to fields not produced by the exporter. Rewrote them as valid Kusto JSON mapping commands using the corrected exporter field names.
- Several KQL examples queried nonexistent columns such as `ServiceName`, `Duration`, `Value`, `StatusCode`, `TraceId`, and `SpanId`. Updated them to use `ResourceAttributes["service.name"]`, computed durations from `StartTime` and `EndTime`, `MetricValue`, `SpanStatus`, `TraceID`, and `SpanID`.
- The performance section showed a non-existent `.create table ... column-index` command. Replaced it with guidance and KQL that projects frequently queried dynamic fields through materialized views or update-policy tables.
- The row-level security example used `restricted_view_access`, which is not the row-level security policy command. Replaced it with the documented `row_level_security` policy syntax.
- The Azure CLI cluster creation example omitted required SKU capacity and did not enable streaming ingest at the cluster level. Added `capacity=2` and `--enable-streaming-ingest true`.
- The auto-stop example used an unsupported `--auto-stop-idle-minutes` flag and called it auto-scale. Changed it to the documented `--enable-auto-stop true` flag and renamed the section to Auto-Stop.

## Review Notes
The routing processor example remains a high-level illustration and assumes the Collector distribution includes the routing processor. For new deployments, teams may prefer the routing connector or other current routing patterns depending on their Collector version and signal routing requirements.
