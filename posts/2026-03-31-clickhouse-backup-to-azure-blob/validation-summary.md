# Validation Summary: How to Back Up ClickHouse to Azure Blob Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (BACKUP/RESTORE statements, `system.backups` table, storage_configuration XML, object_storage disks)
- Azure Blob Storage
- Azure Workload Identity (for Kubernetes / AKS auth)

## Sources Consulted
- ClickHouse BACKUP / RESTORE reference: https://clickhouse.com/docs/sql-reference/statements/backup
- ClickHouse backup & restore overview: https://clickhouse.com/docs/operations/backup
- Configure a backup destination (disk): https://clickhouse.com/docs/operations/backup/disk
- External disks for storing data (object_storage, azure_blob_storage): https://clickhouse.com/docs/operations/storing-data
- AzureBlobStorage table engine / integration docs: https://clickhouse.com/docs/engines/table-engines/integrations/azureBlobStorage
- Upstream PR for managed-identity/workload-identity Azure auth (ClickHouse #61785) and related issue #53850

## Issues Found
1. **`SETTINGS async = true` in `BACKUP` — incorrect syntax.** `async` is not a BACKUP setting; it is a statement modifier. Changed to the `ASYNC` keyword placed after the destination, per the documented grammar: `BACKUP [ASYNC] {TABLE | DATABASE} ... TO <dest>`.
2. **`system.backups` column `total_size` does not exist.** Replaced with `compressed_size` (other valid options: `uncompressed_size`). Actual columns are `id`, `name`, `status`, `num_files`, `uncompressed_size`, `compressed_size`, `error`, `start_time`, `end_time`.
3. **`system.backups` column `exception` does not exist.** Replaced with `error`, which is the documented column name for backup failure messages.
4. **`<use_managed_identity_auth>` is not a real ClickHouse config element.** The correct XML element is `<use_workload_identity>` (added in 24.5 via PR #61785, tracked by issue #53850). Updated both the XML snippet and the surrounding heading/text (renamed from "Azure Managed Identity" to "Azure Workload Identity") so the ClickHouse-facing terminology matches what the server actually accepts.

## Review Notes
- The modern `<type>object_storage</type>` + `<object_storage_type>azure_blob_storage</object_storage_type>` disk form is correct and preferred from ClickHouse 24.1+. The legacy `<type>azure_blob_storage</type>` is also still supported; either would be valid here.
- `<metadata_type>plain_rewritable</metadata_type>` is supported for Azure disks from 24.5+ — noted for readers on older versions.
- `<backups><allowed_disk>` / `<allowed_path>` element names, the `Disk('name', 'path/')` destination form, the `base_backup = Disk(...)` setting for incremental backups, and the `RESTORE DATABASE ... AS ...` rename form are all correct per the official docs.
- ClickHouse also supports `BACKUP ... TO AzureBlobStorage(connection_string, container, path, account, key)` as a direct destination without configuring a disk; the post chooses the disk-based flow, which is a reasonable style choice and not an error.
- `system.backup_log` exists alongside `system.backups` for historical operations; not required for this post but worth noting as a future enhancement.
