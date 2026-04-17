# Validation Summary: How to Configure Azure Blob Storage as ClickHouse Backend

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (azure_blob_storage disk type, cache disk, MergeTree storage policies, TTL, ALTER TABLE MOVE PARTITION)
- Azure Blob Storage
- Azure CLI (`az group`, `az storage account`, `az storage container`)
- Azure Managed Identity / RBAC (`Storage Blob Data Contributor` role)

## Sources Consulted
- ClickHouse "External disks for storing data" docs: https://clickhouse.com/docs/en/operations/storing-data
- ClickHouse storing-data.md source on GitHub: https://github.com/ClickHouse/ClickHouse/blob/master/docs/en/operations/storing-data.md
- ClickHouse integration test config example: https://github.com/ClickHouse/ClickHouse/blob/master/tests/integration/test_merge_tree_azure_blob_storage/configs/config.d/storage_conf.xml
- Azure CLI `az storage account` reference: https://learn.microsoft.com/en-us/cli/azure/storage/account
- Azure RBAC `Storage Blob Data Contributor` role: https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/storage

## Issues Found
1. **Invalid `send_metadata` parameter** — the original config included `<send_metadata>true</send_metadata>` inside the `azure_cold` disk. `send_metadata` is not a valid configuration parameter for the `azure_blob_storage` disk type per the official ClickHouse docs (it is not listed under connection, limit, or other parameters). It was an older S3-disk-related option and does not apply here. **Fix:** removed the line.
2. **Incorrect upload size parameter name** — the original config used `<max_single_part_upload_size>...</max_single_part_upload_size>`. The official ClickHouse docs list this parameter as `s3_max_single_part_upload_size` (with the `s3_` prefix) even for the `azure_blob_storage` disk type. **Fix:** renamed the element to `<s3_max_single_part_upload_size>`.

## Review Notes
- Authentication parameters (`storage_account_url`, `container_name`, `account_name`, `account_key`) and the Managed Identity fallback (omit `account_name`/`account_key`) match the documented behavior — the disk tries all available auth methods including Managed Identity Credential.
- Cache disk parameters (`type=cache`, `disk`, `path`, `max_size=50Gi`, `cache_on_write_operations`) are valid; `max_size` accepts a human-readable size like `50Gi`.
- Storage policy structure, TTL syntax (`MODIFY TTL ... TO VOLUME 'cold'`), `ALTER TABLE ... MOVE PARTITION ... TO DISK`, and `system.parts` / `system.disks` queries all match current ClickHouse behavior.
- Azure CLI commands for creating the resource group, StorageV2 / Standard_LRS account, and container are correct.
- The hot/cold tiering example uses `move_factor` and `max_data_part_size_bytes`, both valid MergeTree storage policy options.
