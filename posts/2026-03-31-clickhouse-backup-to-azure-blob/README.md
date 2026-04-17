# How to Back Up ClickHouse to Azure Blob Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Backup, Azure, Blob Storage, Disaster Recovery

Description: Learn how to configure ClickHouse to back up directly to Azure Blob Storage using native BACKUP commands and Azure storage disks.

---

ClickHouse supports writing backups directly to Azure Blob Storage through its object storage disk abstraction. This enables durable, offsite backups without requiring extra tooling or intermediate storage.

## Prerequisites

Create an Azure Storage account and a container for ClickHouse backups. You will need the storage account name, container name, and either an account key or SAS token.

## Configuring Azure Blob Storage in ClickHouse

Add an Azure disk configuration to `config.d/azure-backup.xml`:

```xml
<clickhouse>
    <storage_configuration>
        <disks>
            <azure_backup>
                <type>object_storage</type>
                <object_storage_type>azure_blob_storage</object_storage_type>
                <metadata_type>plain_rewritable</metadata_type>
                <storage_account_url>https://myaccount.blob.core.windows.net</storage_account_url>
                <container_name>clickhouse-backups</container_name>
                <account_name>myaccount</account_name>
                <account_key>your-storage-account-key</account_key>
            </azure_backup>
        </disks>
    </storage_configuration>
    <backups>
        <allowed_disk>azure_backup</allowed_disk>
        <allowed_path>/</allowed_path>
    </backups>
</clickhouse>
```

## Creating a Full Database Backup

Back up an entire database to Azure:

```sql
BACKUP DATABASE production
TO Disk('azure_backup', 'production_backup_2026-03-31/') ASYNC;
```

## Backing Up Individual Tables

For large databases, back up critical tables individually:

```sql
BACKUP TABLE production.orders, production.order_items
TO Disk('azure_backup', 'orders_backup_2026-03-31/');
```

## Monitoring Backup Jobs

Check backup progress and completion:

```sql
SELECT
    id,
    status,
    start_time,
    end_time,
    formatReadableSize(compressed_size) AS backup_size,
    num_files,
    error
FROM system.backups
WHERE start_time >= today()
ORDER BY start_time DESC;
```

## Using Incremental Backups

Reduce storage costs with incremental backups:

```sql
-- Weekly full backup
BACKUP DATABASE production
TO Disk('azure_backup', 'full_2026-03-28/');

-- Daily incremental backups
BACKUP DATABASE production
TO Disk('azure_backup', 'incremental_2026-03-31/')
SETTINGS base_backup = Disk('azure_backup', 'full_2026-03-28/');
```

## Restoring from Azure

Restore the full database from a backup:

```sql
RESTORE DATABASE production AS production_restored
FROM Disk('azure_backup', 'production_backup_2026-03-31/');
```

Restore a specific table only:

```sql
RESTORE TABLE production.orders
FROM Disk('azure_backup', 'orders_backup_2026-03-31/');
```

## Securing Credentials with Azure Workload Identity

For Kubernetes deployments, use Azure Workload Identity instead of account keys:

```xml
<azure_backup>
    <type>object_storage</type>
    <object_storage_type>azure_blob_storage</object_storage_type>
    <storage_account_url>https://myaccount.blob.core.windows.net</storage_account_url>
    <container_name>clickhouse-backups</container_name>
    <use_workload_identity>true</use_workload_identity>
</azure_backup>
```

## Summary

ClickHouse's native BACKUP command writes directly to Azure Blob Storage when an Azure disk is configured. Use account key or Workload Identity authentication, leverage incremental backups to control costs, and monitor via `system.backups`. Store full backups weekly and incremental backups daily for a balanced recovery point objective.
