# Validation Summary: How to Use ClickHouse Azure Queue Storage Engine

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (AzureQueue table engine, MergeTree engine, Materialized Views)
- Azure Blob Storage / Azure Data Lake Storage Gen2
- SQL (DDL for CREATE TABLE, SELECT)
- Azure Storage authentication (connection strings, SAS tokens)

## Sources Consulted
- [ClickHouse AzureQueue Table Engine Docs](https://clickhouse.com/docs/engines/table-engines/integrations/azure-queue)
- [ClickHouse S3Queue Table Engine Docs](https://clickhouse.com/docs/engines/table-engines/integrations/s3queue) (AzureQueue inherits settings from S3Queue)
- [ClickHouse 24.8 Changelog](https://clickhouse.com/docs/changelogs/24.8) (confirmed AzureQueue was introduced in 24.8)
- [ClickHouse 24.6 Changelog](https://clickhouse.com/docs/changelogs/24.6) (buckets setting history)

## Issues Found

1. **Incorrect version claim**: The post stated "ClickHouse 24.1+" as the minimum version. Per the official 24.8 changelog, AzureQueue was added in 24.8 (`#65458`). Updated to "ClickHouse 24.8+".

2. **Incorrect setting name prefixes**: The post used `azure_queue_polling_min_timeout_ms`, `azure_queue_polling_max_timeout_ms`, `azure_queue_max_processed_files_before_commit`, and `azure_queue_buckets`. According to the official AzureQueue docs: *"The set of supported settings is mostly the same as for S3Queue table engine, but without `s3queue_` prefix."* The correct names have no prefix: `polling_min_timeout_ms`, `polling_max_timeout_ms`, `max_processed_files_before_commit`, `buckets`. Fixed throughout the post (CREATE TABLE example, settings reference table, distributed section, summary).

3. **`buckets` used with `unordered` mode**: The post's "Distributed AzureQueue" example set `mode = 'unordered'` alongside `buckets = 4`. The S3Queue/AzureQueue docs state the `buckets` setting is for "Ordered" mode (available since 24.6). Changed the example to `mode = 'ordered'` and updated the descriptive text accordingly.

4. **Wrong column name in `system.azure_queue_log`**: The post queried `last_exception`. The actual schema uses `exception` (String). Updated both SELECT queries.

5. **Settings table `buckets` default**: The post listed `buckets` default as `1`. The S3Queue/AzureQueue reference shows `0` as the default (meaning no bucket distribution). Corrected to `0` and clarified this is ordered-mode only.

## Review Notes
- The post correctly describes `AzureQueue` as the Azure counterpart to `S3Queue`, and the overall architecture (AzureQueue → Materialized View → MergeTree target) matches the recommended pattern in ClickHouse docs.
- The CREATE TABLE signature `AzureQueue(connection_string, container, blob_path, format)` is correct.
- The SAS-URL authentication form with an empty container parameter is consistent with how AzureBlobStorage / AzureQueue handle URL-based auth.
- The description of `polling_max_timeout_ms` as providing exponential backoff is a reasonable high-level characterization, though strictly the docs describe it as the maximum polling wait and use `polling_backoff_ms` as the per-empty-poll increment.
- Blob path glob examples (`*.csv`, `**.json`, `dt=2024-01-*/**.parquet`) align with ClickHouse's supported glob patterns.
- Format examples (`CSVWithNames`, `JSONEachRow`, `Parquet`, `ORC`) are all valid ClickHouse input formats.
- Future caveat: `system.azure_queue_settings` (mentioned in docs as complementary to the engine) is available only from 24.10; not referenced in the post but readers on 24.8/24.9 should be aware.
