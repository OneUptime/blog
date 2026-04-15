# Validation Summary: How to Query Delta Lake Tables from ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (deltaLake table function, DeltaLake table engine)
- Delta Lake (open-source storage format)
- Amazon S3
- Azure Blob Storage / ADLS
- Apache Parquet
- Named Collections (ClickHouse credential management)

## Sources Consulted
- ClickHouse Delta Lake table engine documentation: https://clickhouse.com/docs/engines/table-engines/integrations/deltalake
- ClickHouse deltaLake table function documentation: https://clickhouse.com/docs/sql-reference/table-functions/deltalake
- ClickHouse Data Lakes FAQ: https://clickhouse.com/docs/faq/general/datalake
- ClickHouse Named Collections documentation: https://clickhouse.com/docs/operations/named-collections

## Issues Found

### 1. Azure section used wrong function (`deltaLake` instead of `deltaLakeAzure`)
- **What was wrong:** The "Querying Azure Data Lake Storage" section used `deltaLake()` with a single Azure URL. The `deltaLake()` function is an alias for `deltaLakeS3()` and only works with S3-compatible storage. Azure requires the separate `deltaLakeAzure()` function.
- **What was changed:** Replaced `deltaLake(...)` with `deltaLakeAzure(...)` and updated the parameters to match the correct signature: `deltaLakeAzure(storage_account_url, container_name, blobpath, account_name, account_key)`. Also changed the URL from `dfs.core.windows.net` to `blob.core.windows.net` to match the Azure Blob Storage endpoint format used in official ClickHouse documentation.
- **Why:** The original code would fail at runtime because `deltaLake()` does not understand Azure authentication or URL formats. The `deltaLakeAzure()` function has a different parameter layout (storage account URL, container, and blob path are separate arguments).

## Review Notes
- The predicate pushdown claim ("Predicates are pushed down to the Delta Lake log for efficient partition pruning") is broadly correct. ClickHouse uses Delta Lake transaction log metadata for partition pruning and statistics-based pruning (min/max). The phrasing is slightly simplified but not inaccurate for a tutorial.
- The Prerequisites section states Delta Lake tables "must be stored on S3-compatible storage" but the post also covers Azure. This is mildly inconsistent but not a blocking error since the S3 prerequisite applies to the initial examples.
- `DESCRIBE TABLE` with the `deltaLake` table function is not explicitly shown in official docs but is consistent with standard ClickHouse behavior for table functions and should work as described.
- ClickHouse also supports `deltaLakeLocal()` for Delta Lake tables on local filesystems and `deltaLakeCluster()`/`deltaLakeAzureCluster()` for distributed queries, which could be covered in a future update.
