# Validation Summary: How to Use ClickHouse with Multi-Cloud Object Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (storage configuration, MergeTree engine, TTL policies, s3() table function)
- Amazon S3
- Google Cloud Storage (GCS) via S3-compatible interop API
- Azure Blob Storage

## Sources Consulted
- ClickHouse documentation on S3-backed MergeTree storage: https://clickhouse.com/docs/en/integrations/s3
- ClickHouse documentation on storage configuration and disk policies: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-s3
- ClickHouse documentation on Azure Blob Storage integration: https://clickhouse.com/docs/en/integrations/azure
- ClickHouse documentation on the s3() table function: https://clickhouse.com/docs/en/sql-reference/table-functions/s3
- ClickHouse documentation on TTL for data movement: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- Google Cloud Storage interoperability (HMAC keys, S3-compatible endpoint): https://cloud.google.com/storage/docs/interoperability

## Issues Found

### 1. Missing `gcs_policy` storage policy definition
- **What was wrong:** The SQL section referenced `storage_policy = 'gcs_policy'` in the `CREATE TABLE events_eu` statement, but the XML configuration only defined a `multi_cloud` policy. The `gcs_policy` was never defined, so the CREATE TABLE would fail with an unknown storage policy error.
- **What was changed:** Added a `gcs_policy` policy definition to the `<policies>` section of the XML configuration, mapping it to the `gcs` disk.
- **Why:** Every storage policy referenced in a `SETTINGS storage_policy = '...'` clause must be defined in the server's storage configuration.

### 2. Incorrect GCS region identifier in SQL comment
- **What was wrong:** The comment on the `CREATE TABLE events_eu` statement said "eu-west-1 bucket", but `eu-west-1` is an AWS region identifier. Since this table uses GCS, the region should follow GCS naming conventions.
- **What was changed:** Changed the comment from "eu-west-1 bucket" to "europe-west1 bucket" to use the correct GCS region format.
- **Why:** GCS uses region identifiers like `europe-west1`, not AWS-style identifiers like `eu-west-1`. The incorrect naming could confuse readers about which cloud provider they are configuring.

## Review Notes
- The Azure Blob Storage disk type `azure_blob_storage` and its configuration fields (`storage_account_url`, `container_name`, `account_name`, `account_key`) are correct for current ClickHouse versions.
- The GCS interop approach using `<type>s3</type>` with HMAC keys and the `storage.googleapis.com` endpoint is the standard way to use GCS with ClickHouse's S3 disk backend.
- The `s3()` table function syntax used for ad-hoc queries is correct.
- The TTL-to-disk syntax is correct for automating data movement between storage backends.
- Placeholder credentials (AWS_KEY, AWS_SECRET, etc.) are used appropriately for illustration purposes.
