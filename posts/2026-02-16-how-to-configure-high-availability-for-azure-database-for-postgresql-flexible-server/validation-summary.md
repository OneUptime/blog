# Validation Summary: How to Configure High Availability for Azure Database

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Database for PostgreSQL Flexible Server
- Azure CLI
- Azure Monitor and Resource Health alerts
- PostgreSQL high availability and failover
- psycopg2 for Python
- Java DNS caching
- .NET Framework DNS caching

## Sources Consulted
- Microsoft Learn: Configure high availability for Azure Database for PostgreSQL Flexible Server - https://learn.microsoft.com/en-us/azure/postgresql/high-availability/how-to-configure-high-availability
- Microsoft Learn: Reliability and high availability in Azure Database for PostgreSQL - https://learn.microsoft.com/en-us/azure/reliability/reliability-azure-database-postgresql
- Microsoft Learn: Azure CLI `az postgres flexible-server` reference - https://learn.microsoft.com/en-us/cli/azure/postgres/flexible-server
- Microsoft Learn: Azure Database for PostgreSQL monitoring and metrics - https://learn.microsoft.com/en-us/azure/postgresql/monitor/concepts-monitoring
- Microsoft Learn: High Availability health status monitoring for Azure Database for PostgreSQL - https://learn.microsoft.com/en-us/azure/postgresql/high-availability/how-to-monitor-high-availability
- Microsoft Learn: Azure CLI `az monitor activity-log alert` reference - https://learn.microsoft.com/en-us/cli/azure/monitor/activity-log/alert
- Microsoft Azure pricing: Azure Database for PostgreSQL Flexible Server pricing FAQ - https://azure.microsoft.com/pricing/details/postgresql
- psycopg2 documentation: connection pooling - https://www.psycopg.org/docs/pool.html
- Oracle Java networking properties documentation - https://docs.oracle.com/en/java/javase/13/docs/api/java.base/java/net/doc-files/net-properties.html
- Microsoft Learn: `ServicePointManager.DnsRefreshTimeout` - https://learn.microsoft.com/en-us/dotnet/api/system.net.servicepointmanager.dnsrefreshtimeout

## Issues Found
- The Azure CLI examples used the deprecated `--high-availability` parameter. Updated zone-redundant create, update, and disable examples to use the current `--zonal-resiliency` parameter.
- The same-zone HA CLI example used deprecated direct same-zone syntax. Updated it to the current `--zonal-resiliency Enabled --allow-same-zone` fallback pattern described by Microsoft.
- The portal instructions referred to the older "High Availability" tab and "Zone redundant" selection. Updated the wording to the current "Business Critical (High availability)" and "Zonal Resiliency" flow.
- The post stated that enabling HA on an existing server causes a brief connection interruption. Microsoft documentation says enabling or disabling HA is an online operation and does not affect application connectivity, so the statement was corrected.
- The second Python snippet used `time.sleep()` without importing `time` in that code block. Added `import time`.
- The .NET DNS caching note applied `ServicePointManager.DnsRefreshTimeout` broadly. Microsoft documents that property as implemented only on .NET Framework, so the wording was narrowed.
- The Azure Monitor alert example used an unverified metric name, `Is HA Enabled`, which is not listed in the Azure Database for PostgreSQL metrics documentation. Replaced it with a Resource Health activity log alert, matching Microsoft's HA health monitoring guidance.
- The cost section stated that storage costs remain the same with HA. Azure pricing states zone-redundant HA bills provisioned compute and storage for both primary and secondary replicas, so the section was corrected.

## Review Notes
The post remains a technically relevant implementation guide. Example prices are still approximate and should be treated as illustrative because Azure prices vary by region, SKU generation, contract, and date.
