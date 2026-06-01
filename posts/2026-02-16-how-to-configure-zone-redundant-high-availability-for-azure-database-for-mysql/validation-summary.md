# Validation Summary: How to Configure Zone-Redundant High Availability for Azure Database for MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Database for MySQL Flexible Server
- Azure availability zones and high availability
- Azure CLI
- Azure Monitor metric alerts
- MySQL Connector/Python
- Java DNS cache configuration

## Sources Consulted
- Microsoft Learn: High availability in Azure Database for MySQL Flexible Server: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-high-availability
- Microsoft Learn: Azure CLI reference for `az mysql flexible-server`: https://learn.microsoft.com/en-us/cli/azure/mysql/flexible-server?view=azure-cli-latest
- Microsoft Learn: Configure zone-redundant high availability using Azure CLI: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/scripts/sample-cli-zone-redundant-ha
- Microsoft Learn: Monitoring data reference for Azure Database for MySQL Flexible Server: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-monitor-mysql-reference
- Microsoft Learn: Azure CLI reference for `az monitor metrics alert`: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert?view=azure-cli-latest
- Microsoft Learn: Backup and restore in Azure Database for MySQL Flexible Server: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-backup-restore
- Azure pricing page for Azure Database for MySQL: https://azure.microsoft.com/en-us/pricing/details/mysql/
- MySQL Connector/Python connection arguments: https://dev.mysql.com/doc/connector-python/en/connector-python-connectargs.html
- MySQL Connector/Python connection pool constructor: https://dev.mysql.com/doc/connector-python/en/connector-python-api-mysqlconnectionpool-constructor.html
- Oracle Java networking properties: https://docs.oracle.com/en/java/javase/15/docs/api/java.base/java/net/doc-files/net-properties.html

## Issues Found
- Corrected the HA architecture description. Azure Database for MySQL Flexible Server uses zone-redundant storage for data and log files, and the standby reads and replays logs. The original post implied direct synchronous replication to separate standby storage and that each commit was acknowledged by both servers.
- Corrected the post-failover standby behavior. Azure brings the old primary back as the standby when possible, rather than always provisioning a new standby.
- Corrected the existing-server HA section. Current Microsoft documentation says zone-redundant HA can only be configured during server creation; existing non-HA servers can be enabled for local/same-zone HA, or migrated to a new zone-redundant server.
- Replaced the invalid `--failover Planned` example. Current Azure CLI documentation only lists `--failover Forced` for `az mysql flexible-server restart`.
- Replaced the undocumented `HADRHealthStatus` metric with documented HA replication metrics, and updated the Azure Monitor alert command to use the documented `--action` parameter.
- Updated HA state references from `CreatingStandby` to the documented `ReplicatingData` state.
- Updated DNS failover wording to account for Azure's newer HA load-balancing path, while preserving the guidance to use the server FQDN and avoid aggressive DNS caching.
- Corrected billing guidance. Microsoft documentation states HA bills for both primary and secondary compute and storage, so the post now describes doubled vCores and provisioned storage instead of compute-only doubling.

## Review Notes
- The Azure CLI binary was not installed in the local environment, so CLI verification was done against current Microsoft Learn CLI reference pages rather than local `az --help` output.
- Azure pricing values are region, offer, and date dependent. The post now avoids fixed monthly dollar amounts and uses billing dimensions instead.
