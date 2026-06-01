# Validation Summary: How to Export Telemetry Data from Azure IoT Central to Azure Data Explorer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure IoT Central
- Azure Data Explorer
- Azure CLI
- Kusto Query Language (KQL)
- IoT Central data export transforms
- Azure Data Explorer streaming ingestion, retention policies, materialized views, and update policies

## Sources Consulted
- Azure IoT Central: Export IoT data to Azure Data Explorer - https://learn.microsoft.com/en-us/azure/iot-central/core/howto-export-to-azure-data-explorer
- Azure IoT Central: Transform data inside your IoT Central application for export - https://learn.microsoft.com/en-us/azure/iot-central/core/howto-transform-data-internally
- Azure IoT Central quotas and limits - https://learn.microsoft.com/en-us/azure/iot-central/core/concepts-quotas-limits
- Azure CLI `az kusto cluster` reference - https://learn.microsoft.com/en-us/cli/azure/kusto/cluster
- Azure CLI `az kusto database` reference - https://learn.microsoft.com/en-us/cli/azure/kusto/database
- Kusto streaming ingestion policy command - https://learn.microsoft.com/en-us/kusto/management/alter-table-streaming-ingestion-policy-command
- Kusto database security roles - https://learn.microsoft.com/en-us/kusto/management/manage-database-security-roles
- Kusto JSON mapping documentation - https://learn.microsoft.com/en-us/kusto/management/json-mapping
- Kusto retention policy documentation - https://learn.microsoft.com/en-us/kusto/management/retention-policy
- Kusto update policy documentation - https://learn.microsoft.com/en-us/kusto/management/update-policy
- Kusto materialized view creation documentation - https://learn.microsoft.com/en-us/kusto/management/materialized-views/materialized-view-create
- Azure Data Explorer pricing - https://azure.microsoft.com/en-us/pricing/details/data-explorer/
- Microsoft Azure IoT retirement announcement - https://techcommunity.microsoft.com/blog/iotblog/microsofts-commitment-to-azure-iot/4059725

## Issues Found
- The post stated that IoT Central retains telemetry for 30 days by default. Microsoft documents the maximum telemetry retention as 7 days, so the statement was corrected to "up to 7 days."
- The Azure CLI database creation example used deprecated direct `--soft-delete-period` and `--hot-cache-period` parameters. It was updated to the current `--read-write-database` argument shape with `location`, `kind`, `soft-delete-period`, and `hot-cache-period`.
- The post enabled table-level streaming ingestion but did not enable streaming ingestion on the ADX cluster. The cluster creation command now includes `--enable-streaming-ingest true`.
- The table schema and KQL examples assumed `telemetry` was a dynamic object, but IoT Central export telemetry is an array before transformation. A destination transform was added to convert the telemetry array into a dynamic object keyed by telemetry name.
- The named JSON ingestion mapping was removed because IoT Central's Azure Data Explorer destination exports transformed records that should match the table schema; the named mapping would not be referenced by the IoT Central destination as written.
- The Kusto role assignment commands used an unquoted database name containing a hyphen. They now use bracketed database-name syntax: `['iot-telemetry']`.
- The retention policy examples used `.alter ... policy retention softdelete = ...`, while current Kusto examples use `.alter-merge` for shorthand retention changes. The commands were updated accordingly.
- The update policy object omitted `PropagateIngestionProperties`. It was added with `false`, matching the documented update policy shape and examples.
- The cost section claimed the Dev/Test SKU is free for the first cluster. This was corrected to say the Developer tier has no Azure Data Explorer markup and that compute/storage pricing should still be checked.

## Review Notes
Azure IoT Central is still documented and usable as of this review date, but Microsoft has announced retirement of the service on March 31, 2027. Future updates to this post should mention migration planning if the article remains published near that date.
