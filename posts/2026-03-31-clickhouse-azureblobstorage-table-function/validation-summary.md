# Validation Summary: How to Use azureBlobStorage() Table Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (`azureBlobStorage()` table function)
- Azure Blob Storage
- ClickHouse named collections (XML configuration)
- Data formats: Parquet, CSV, TSV, JSONEachRow, ORC, Avro

## Sources Consulted
- ClickHouse official documentation: https://clickhouse.com/docs/en/sql-reference/table-functions/azureBlobStorage
- ClickHouse named collections documentation: https://clickhouse.com/docs/en/operations/named-collections

## Issues Found

1. **"Reading Parquet Files from Azure" example used the storage_account_url form but omitted `account_name` and `account_key`.** The function signature for the URL form is `azureBlobStorage(storage_account_url, container_name, blobpath, account_name, account_key [, format, ...])` — the credentials are required positional arguments. Added `'myaccount'` and `'ACCOUNT_KEY'` to the argument list so the example matches the documented signature.

2. **"Filtering by Partition Path" example had the same missing-credentials issue.** Fixed the same way by inserting `account_name` and `account_key` ahead of the format argument.

3. **Named-collection query used positional arguments for the overrides.** The documented named-collection invocation form is `azureBlobStorage(named_collection[, option=value, ...])` — overrides must be keyword arguments. Changed `azureBlobStorage(azure_prod, 'data/2025-01/*.parquet', 'Parquet')` to `azureBlobStorage(azure_prod, blob_path = 'data/2025-01/*.parquet', format = 'Parquet')`.

4. **"Basic Syntax" section described the function as taking exactly four positional arguments.** The two-form signature (connection string vs. storage account URL) was not reflected. Replaced the numbered list with an explicit breakdown of the two forms so readers understand which credential arguments belong to each.

## Review Notes

- The `connection_string` field used in the XML named collection is accepted by ClickHouse (mirrors the connection-string positional form). The official docs tend to use `storage_account_url` + `account_name` + `account_key`; either approach works, so I left the author's choice as-is.
- `CREATE TABLE <name> AS azureBlobStorage(...)` is not shown in the official `azureBlobStorage` docs, but ClickHouse generally supports `CREATE TABLE <name> AS <tableFunction>(...)` across its table functions, so the example is consistent with ClickHouse behaviour.
- The format list (Parquet, CSV, TSV, JSONEachRow, ORC, Avro) is accurate — the table function uses the standard ClickHouse Formats system, so any input/output-capable format works.
- Schema inference via `DESCRIBE TABLE azureBlobStorage(...)` is correct; Parquet and ORC both carry type metadata suitable for inference.
