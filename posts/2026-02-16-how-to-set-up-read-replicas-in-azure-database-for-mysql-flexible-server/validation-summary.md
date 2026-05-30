# Validation Summary: How to Set Up Read Replicas in Azure Database for MySQL Flexible Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Database for MySQL Flexible Server
- Azure CLI
- Azure Monitor metric alerts
- MySQL binlog replication
- MySQL Connector/Python
- ProxySQL

## Sources Consulted
- Microsoft Learn: Read replicas in Azure Database for MySQL Flexible Server: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-read-replicas
- Microsoft Learn: Create and manage read replicas using Azure CLI: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/how-to-read-replicas-cli
- Microsoft Learn: Azure CLI reference for `az mysql flexible-server replica`: https://learn.microsoft.com/en-us/cli/azure/mysql/flexible-server/replica
- Microsoft Learn: Monitoring data reference for Azure Database for MySQL Flexible Server: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-monitor-mysql-reference
- Microsoft Learn: Azure Database for MySQL Flexible Server server parameters: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-server-parameters
- Microsoft Learn: Azure Database for MySQL Flexible Server high availability FAQ: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-high-availability-faq
- MySQL Connector/Python Developer Guide: https://dev.mysql.com/doc/connector-python/en/connector-python-connectargs.html

## Issues Found
- The Azure CLI replica creation examples used `--name`. Current Azure CLI documentation requires `--replica-name` for `az mysql flexible-server replica create`, so all replica creation examples were updated.
- The prerequisites did not mention the pricing-tier requirement. Azure read replicas are supported for General Purpose and Memory-Optimized source servers, not Burstable, so the prerequisite was corrected.
- The `binlog_expire_logs_seconds` prerequisite implied the default value directly controls managed read replica correctness. Azure manages read replica binlog retention internally, so the text was narrowed to longer retention scenarios.
- The Azure Monitor alert example used `ReplicationLag`, which is not the current REST/API metric name. It was changed to `replication_lag`.
- The load-balancing section described the sample as round-robin, but the code uses `random.choice`. The text was corrected to random selection.
- The scaling section suggested scaling replicas smaller without noting Microsoft's recommendation to keep replica capacity equal to or greater than the source when the source is updated. A short caveat was added.
- The disaster recovery section suggested setting up replication back to the old primary after promotion. Because stopping replication makes a replica standalone and cannot be undone, the text now says to create a new replica or rebuild the old primary as needed.
- The limitations section said replicas must be in the same subscription as the source server. Current CLI documentation supports source servers in different resource groups or subscriptions when `--source-server` is passed as a resource ID, so this was corrected.
- The limitations section said only the primary can have high availability. Current documentation says read replicas are supported for HA-enabled servers, while read replicas themselves do not provide automatic failover. The wording was corrected.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI validation was performed against the current official Microsoft Learn CLI reference instead of local `az --help` output.
