# Validation Summary: How to Migrate Azure SQL Database to Google Cloud SQL for SQL Server

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Azure SQL Database
- Google Cloud SQL for SQL Server
- SQL Server
- Azure CLI
- Google Cloud CLI
- SqlPackage
- Cloud SQL Auth Proxy
- Cloud Monitoring
- Kubernetes sidecar containers
- Python pyodbc connection strings

## Sources Consulted
- Google Cloud SQL database version policies: https://docs.cloud.google.com/sql/docs/db-versions
- Google Cloud SQL for SQL Server features and unsupported features: https://docs.cloud.google.com/sql/docs/features
- Google Cloud SQL for SQL Server instance creation: https://docs.cloud.google.com/sql/docs/sqlserver/create-instance
- Google Cloud SQL for SQL Server BAK import and export: https://docs.cloud.google.com/sql/docs/sqlserver/import-export/import-export-bak
- Google Cloud SQL for SQL Server import/export best practices and SqlPackage guidance: https://cloud.google.com/sql/docs/sqlserver/import-export/
- Google Cloud SQL Auth Proxy for SQL Server: https://docs.cloud.google.com/sql/docs/sqlserver/sql-proxy
- Google Cloud SQL Auth Proxy connection guide: https://docs.cloud.google.com/sql/docs/sqlserver/connect-auth-proxy
- gcloud sql instances create command reference: https://cloud.google.com/sdk/gcloud/reference/sql/instances/create
- gcloud sql import bak command reference: https://cloud.google.com/sdk/gcloud/reference/sql/import/bak
- gcloud monitoring policies create command reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Azure CLI az sql db command reference: https://learn.microsoft.com/en-us/cli/azure/sql/db
- Azure SQL Database Hyperscale FAQ: https://learn.microsoft.com/en-us/azure/azure-sql/database/service-tier-hyperscale-frequently-asked-questions-faq
- Microsoft sys.dm_db_partition_stats documentation: https://learn.microsoft.com/sql/relational-databases/system-dynamic-management-views/sys-dm-db-partition-stats-transact-sql

## Issues Found
- The assessment query used `s.row_count` from `sys.partitions`, but `sys.partitions` exposes a `rows` column, not `row_count`. Replaced the query with `sys.dm_db_partition_stats`, using its documented `row_count` and `reserved_page_count` fields so the table size and row count query works on SQL Server and Azure SQL Database.

## Review Notes
- The local environment does not have `gcloud` or `az` installed, so CLI syntax was verified against official command references rather than local `--help` output.
- The post correctly notes that `gcloud sql import bak` is for BAK files and that BACPAC migrations should use SqlPackage or an intermediate SQL Server restore/export path.
