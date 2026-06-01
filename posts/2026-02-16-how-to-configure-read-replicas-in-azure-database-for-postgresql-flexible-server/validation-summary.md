# Validation Summary: How to Configure Read Replicas in Azure Database for PostgreSQL Flexible Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Database for PostgreSQL Flexible Server
- Azure CLI
- Azure Monitor metrics alerts
- PostgreSQL physical streaming replication
- Python psycopg2
- SQLAlchemy

## Sources Consulted
- Microsoft Learn: Read replicas in Azure Database for PostgreSQL Flexible Server, https://learn.microsoft.com/en-us/azure/postgresql/read-replica/concepts-read-replicas
- Microsoft Learn: Promote read replicas in Azure Database for PostgreSQL Flexible Server, https://learn.microsoft.com/en-us/azure/postgresql/read-replica/concepts-read-replicas-promote
- Microsoft Learn: Azure CLI `az postgres flexible-server replica`, https://learn.microsoft.com/en-us/cli/azure/postgres/flexible-server/replica
- Microsoft Learn: Supported metrics for Microsoft.DBforPostgreSQL/flexibleServers, https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-dbforpostgresql-flexibleservers-metrics
- SQLAlchemy documentation: SQLAlchemy 2.0 migration guide, https://docs.sqlalchemy.org/en/21/changelog/migration_20.html
- Psycopg documentation: psycopg2 connection API, https://www.psycopg.org/docs/module.html

## Issues Found
- The replica creation description said Azure takes a base backup for replica creation generally. Updated it to distinguish same-region snapshot creation from geo-replica base backup creation.
- The Azure Monitor alert condition used an incorrect metric display string. Updated it to use the supported metric ID `physical_replication_delay_in_seconds`.
- The SQLAlchemy example passed raw strings directly to `Connection.execute()`, which is not valid SQLAlchemy 2.x style. Updated the example to wrap SQL text with `text()` and pass a dictionary for parameters.
- The replica scaling section implied replicas can be scaled down independently for lighter workloads. Updated it to reflect Azure's documented compute and storage symmetry constraints for read replicas.
- The promotion command used the obsolete `replica stop-replication` command. Updated it to the current `az postgres flexible-server replica promote` command with `--promote-mode standalone` and `--promote-option planned`.
- The limitations section said cascading replication is unsupported. Updated it to reflect current support for cascading read replicas in supported regions on PostgreSQL 14 and later.
- The limitations section said replicas are promoted when the primary is deleted. Updated it to the documented guidance that replicas should be deleted before deleting the primary.

## Review Notes
The post is technically relevant and valid after the corrections. The Azure CLI was not installed locally, so CLI syntax was verified against the current Microsoft Learn CLI reference.
