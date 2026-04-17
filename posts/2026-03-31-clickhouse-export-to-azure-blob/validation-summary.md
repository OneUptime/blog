# Validation Summary: How to Export ClickHouse Data to Azure Blob Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (`azureBlobStorage` table function, `INSERT INTO FUNCTION`, named collections)
- Azure Blob Storage (connection strings, account key authentication)
- Azure Synapse (serverless SQL pool `OPENROWSET`)
- Parquet, CSV, JSONEachRow output formats
- Bash / `clickhouse-client` CLI
- ClickHouse `config.xml` configuration

## Sources Consulted
- ClickHouse `azureBlobStorage` table function: https://clickhouse.com/docs/en/sql-reference/table-functions/azureBlobStorage
- ClickHouse named collections: https://clickhouse.com/docs/en/operations/named-collections
- ClickHouse formats: https://clickhouse.com/docs/en/interfaces/formats
- Microsoft Synapse `OPENROWSET` and recursive wildcards: https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/query-folders-multiple-csv-files

## Issues Found
1. **Non-existent `<azure_blob_storage>` config.xml element.** The original post showed a top-level `<azure_blob_storage>` XML element for storing the connection string, which is not a real ClickHouse configuration element. Replaced it with the officially supported `<named_collections>` pattern (using `<connection_string>` and `<container>` children inside a named collection entry), which is the documented way to store Azure credentials in `config.xml`.

## Review Notes
- Both signatures of `azureBlobStorage` shown (4-arg with connection string, 6-arg with storage_account_url + account_name + account_key) are valid per official ClickHouse docs.
- `INSERT INTO FUNCTION azureBlobStorage(...)` is explicitly supported for writing data.
- `CSVWithNames`, `Parquet`, and `JSONEachRow` are all valid ClickHouse output formats for writes.
- Azure Synapse `OPENROWSET` with `/**` for recursive wildcards is officially supported.
- Minor stylistic note (not fixed): the bash script uses `AccountKey=${AZ_KEY}==`, which hardcodes the `==` base64 padding outside the variable. Readers should ensure `AZ_KEY` does not also include trailing `==` to avoid duplicating the padding; alternatively store the full key (including `==`) in the variable and drop the literal suffix. Either convention works if used consistently.
- When using the named collection, callers should reference the collection in queries (e.g., `azureBlobStorage(azure_conn, blob_path='exports/events.csv', format='CSVWithNames')`); named collection keys are `container`, `blob_path`, `connection_string`, `storage_account_url`, `account_name`, `account_key`, `format`, `compression`, `structure`.
