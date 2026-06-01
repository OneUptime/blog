# Validation Summary: How to Create an Azure Database for PostgreSQL Flexible Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Database for PostgreSQL Flexible Server
- PostgreSQL
- Azure CLI
- Microsoft Entra ID authentication
- Azure Monitor diagnostics and metric alerts
- PgBouncer

## Sources Consulted
- Microsoft Learn: Quickstart - Create an Azure Database for PostgreSQL flexible server: https://learn.microsoft.com/en-us/azure/postgresql/configure-maintain/quickstart-create-server
- Microsoft Learn: Azure Database for PostgreSQL supported versions: https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-supported-versions
- Microsoft Learn: Compute options in Azure Database for PostgreSQL: https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-compute
- Microsoft Learn: Storage in Azure Database for PostgreSQL: https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-storage
- Microsoft Learn: Backup and restore in Azure Database for PostgreSQL: https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-backup-restore
- Microsoft Learn: Azure CLI az postgres flexible-server reference: https://learn.microsoft.com/en-us/cli/azure/postgres/flexible-server?view=azure-cli-latest
- Microsoft Learn: Azure CLI az postgres flexible-server firewall-rule reference: https://learn.microsoft.com/en-us/cli/azure/postgres/flexible-server/firewall-rule?view=azure-cli-latest
- Microsoft Learn: Azure CLI az postgres flexible-server parameter reference: https://learn.microsoft.com/en-us/cli/azure/postgres/flexible-server/parameter?view=azure-cli-latest
- Microsoft Learn: PgBouncer in Azure Database for PostgreSQL: https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-pgbouncer
- Microsoft Learn: Firewall rules in Azure Database for PostgreSQL: https://learn.microsoft.com/azure/postgresql/flexible-server/concepts-firewall-rules
- Microsoft Learn: High availability in Azure Database for PostgreSQL: https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-high-availability
- Microsoft Learn: Microsoft Entra authentication with Azure Database for PostgreSQL: https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/security-entra-concepts
- Microsoft Learn: Logs in Azure Database for PostgreSQL: https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-logging
- Microsoft Learn: Supported logs for Microsoft.DBforPostgreSQL/flexibleServers: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-dbforpostgresql-flexibleservers-logs
- Microsoft Learn: Azure Database for PostgreSQL - Hyperscale (Citus) is now Azure Cosmos DB for PostgreSQL: https://learn.microsoft.com/en-ie/azure/postgresql/hyperscale/moved
- Microsoft Learn: Azure Cosmos DB for PostgreSQL retirement guidance and Elastic Clusters direction: https://learn.microsoft.com/en-us/azure/cosmos-db/postgresql/introduction
- Microsoft Learn Q&A: Azure Database for PostgreSQL Single Server retirement date: https://learn.microsoft.com/en-us/answers/questions/1299567/can-i-continue-running-my-azure-database-for-postg

## Issues Found
- The introduction said Flexible Server replaced both Single Server and Hyperscale (Citus) for all new PostgreSQL workloads. Hyperscale (Citus) was renamed to Azure Cosmos DB for PostgreSQL, and current Microsoft guidance points distributed PostgreSQL workloads toward Azure Database for PostgreSQL Elastic Clusters. I narrowed the Flexible Server recommendation to single-node workloads and added the Elastic Clusters caveat.
- The post described Single Server as being on the deprecation path. Single Server's retirement date has passed, so I changed this to say it has been retired.
- The supported PostgreSQL version list and "latest version" recommendation were outdated. I updated the text and CLI examples from PostgreSQL 16 to PostgreSQL 18, while retaining older supported versions as compatibility choices.
- The compute and memory table used outdated vCore and RAM ranges. I updated it to match current Microsoft compute documentation, including 192-vCore VM series and memory-per-vCore guidance.
- The storage range was listed as 32 GB to 32 TB. Current storage documentation lists up to 64 TiB depending on storage type, so I corrected the storage section.
- Backup retention was listed as 1-35 days. Current Flexible Server documentation and CLI reference list 7-35 days, so I corrected the retention range.
- Built-in PgBouncer was described without a tier limitation. Microsoft documents that built-in PgBouncer is supported on General Purpose and Memory Optimized tiers, not Burstable, so I added that caveat.
- The main HA CLI example used `--high-availability ZoneRedundant`, which the Azure CLI reference marks as deprecated in favor of `--zonal-resiliency`. I updated the example to use `--zonal-resiliency Enabled` with separate primary and standby zones.
- The firewall-rule example used the deprecated `--rule-name` pattern. I updated it to the current `--server-name` plus rule `--name` form indicated by the Azure CLI deprecation notice.
- The Azure CLI prerequisite pinned version 2.40.0. Because the examples rely on current CLI behavior and Microsoft documentation changes flags over time, I changed this to require a current Azure CLI installation.

## Review Notes
- The local environment does not have the Azure CLI installed, so command validation was performed against Microsoft Learn Azure CLI reference pages rather than local `az --help` output.
- The diagnostic settings category `PostgreSQLLogs`, metric category `AllMetrics`, authentication modes, private/public networking descriptions, HA behavior, psql SSL connection format, and listed extensions were consistent with current Microsoft documentation.
