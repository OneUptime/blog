# Validation Summary: How to Use COPY INTO Command to Ingest Data into Azure Synapse Analytics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Synapse Analytics dedicated SQL pool
- T-SQL COPY INTO
- Azure Data Lake Storage Gen2
- Azure Blob Storage authentication
- Azure CLI
- Parquet, ORC, and CSV ingestion

## Sources Consulted
- Microsoft Learn: COPY INTO (Transact-SQL) - Azure Synapse Analytics and Microsoft Fabric: https://learn.microsoft.com/en-us/sql/t-sql/statements/copy-into-transact-sql?view=azure-sqldw-latest
- Microsoft Learn: Tutorial: Load external data using a managed identity: https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/tutorial-external-tables-using-managed-identity
- Microsoft Learn: az synapse sql pool: https://learn.microsoft.com/en-us/cli/azure/synapse/sql/pool?view=azure-cli-lts
- Microsoft Learn: Resource classes for workload management: https://learn.microsoft.com/en-us/azure/synapse-analytics/sql-data-warehouse/resource-classes-for-workload-management
- Microsoft Learn: Best practices for dedicated SQL pools: https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/best-practices-dedicated-sql-pool

## Issues Found
- The introduction said COPY INTO replaced PolyBase and supports more file formats. Updated it to the more precise Microsoft wording that COPY INTO is the primary bulk loading strategy, while avoiding an unsupported file-format comparison.
- The Parquet section said COPY INTO automatically maps Parquet columns to target table columns by name and infers schema in the basic example. Updated it to state that the target table must already exist unless `AUTO_CREATE_TABLE = 'ON'` is used, and that default mapping without a column list is by order.
- The tab-delimited example used `FIELDTERMINATOR = '\t'`. Updated it to `FIELDTERMINATOR = '0x09'`, matching the documented hexadecimal notation support.
- The CSV column mapping example listed target columns but did not include source field ordinals, so it would not skip/reorder source fields as described. Updated it to use field numbers: `CustomerId 1, Email 4, CreatedDate 6`.
- The Parquet column mapping explanation repeated the incorrect name-based automapping claim. Updated it to reference `AUTO_CREATE_TABLE = 'ON'` for schema discovery and otherwise require explicit alignment.
- The SAS token example omitted the leading `?` shown in Microsoft examples. Updated the `SECRET` value to include it.
- The managed identity prerequisite listed Storage Blob Data Reader as sufficient. Updated it to Storage Blob Data Contributor, matching Microsoft's managed identity tutorial.
- The performance guidance said 256 MB to 1 GB files and 60+ files generally maximize parallelism. Updated it to distinguish Parquet/ORC guidance from compressed CSV split guidance, which varies by DWU.
- The wildcard example used an undocumented `**` recursive wildcard. Updated it to show a folder path, because COPY reads folder paths recursively.
- The ADLS Gen2 troubleshooting note said ADLS Gen2 uses `dfs.core.windows.net`, not `blob.core.windows.net`. Updated it because Microsoft documents that the blob endpoint can also be used when DFS is not required by the authentication method.

## Review Notes
The Azure CLI command shape for `az synapse sql pool update --performance-level` matches the current Microsoft CLI reference. The local environment did not have Azure CLI installed, so the CLI command was validated against Microsoft Learn rather than local `az --help`.
