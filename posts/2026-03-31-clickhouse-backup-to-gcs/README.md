# How to Back Up ClickHouse to Google Cloud Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Backup, Google Cloud Storage, GCS, Disaster Recovery

Description: Learn how to configure ClickHouse BACKUP commands to write directly to Google Cloud Storage for durable, offsite backups.

---

ClickHouse's native BACKUP/RESTORE feature supports writing backups directly to Google Cloud Storage (GCS). This provides durable, offsite backup storage without requiring intermediate local disk space.

## Prerequisites

You need a GCS bucket and an HMAC key for a service account. ClickHouse accesses GCS through the S3-compatible XML API, so generate an HMAC key from Google Cloud Storage's Interoperability settings for a service account that has access to the bucket (for example, the Storage Object Admin role).

## Configuring GCS Storage in ClickHouse

Add GCS as a storage disk in `config.d/gcs-backup.xml`. Because GCS is accessed through the S3-compatible API, the disk `type` is `s3`:

```xml
<clickhouse>
    <storage_configuration>
        <disks>
            <gcs_backup>
                <type>s3</type>
                <support_batch_delete>false</support_batch_delete>
                <endpoint>https://storage.googleapis.com/my-clickhouse-backups/backups/</endpoint>
                <access_key_id>YOUR_HMAC_KEY</access_key_id>
                <secret_access_key>YOUR_HMAC_SECRET</secret_access_key>
                <metadata_path>/var/lib/clickhouse/disks/gcs_backup/</metadata_path>
            </gcs_backup>
        </disks>
    </storage_configuration>
    <backups>
        <allowed_disk>gcs_backup</allowed_disk>
        <allowed_path>/</allowed_path>
    </backups>
</clickhouse>
```

`support_batch_delete` must be set to `false` because GCS does not support the S3 batch delete operation.

## Setting Up Authentication

The HMAC key and secret are passed via the `access_key_id` and `secret_access_key` fields above. To avoid storing secrets in the config file, reference environment variables instead:

```xml
<access_key_id from_env="GCS_HMAC_KEY"/>
<secret_access_key from_env="GCS_HMAC_SECRET"/>
```

Then export them before starting ClickHouse:

```bash
export GCS_HMAC_KEY=GOOG1EXAMPLEKEY
export GCS_HMAC_SECRET=examplesecret
```

## Creating a Full Backup to GCS

Run a full backup of a database:

```sql
BACKUP DATABASE my_database
TO Disk('gcs_backup', 'my_database_backup_2026-03-31/') ASYNC;
```

Back up a specific table:

```sql
BACKUP TABLE my_database.events
TO Disk('gcs_backup', 'events_backup_2026-03-31/') ASYNC;
```

## Monitoring Backup Progress

Check the status of an async backup:

```sql
SELECT
    id,
    name,
    status,
    start_time,
    end_time,
    num_files,
    uncompressed_size,
    compressed_size,
    error
FROM system.backups
ORDER BY start_time DESC
LIMIT 5;
```

## Creating Incremental Backups

Use the `base_backup` option to create incremental backups that only store changed data:

```sql
-- Full backup on Monday
BACKUP DATABASE my_database
TO Disk('gcs_backup', 'full_backup_2026-03-31/');

-- Incremental backup on Tuesday
BACKUP DATABASE my_database
TO Disk('gcs_backup', 'incremental_2026-04-01/')
SETTINGS base_backup = Disk('gcs_backup', 'full_backup_2026-03-31/');
```

## Restoring from GCS

Restore a backup from GCS into a new database name using the `AS` clause:

```sql
RESTORE DATABASE my_database AS my_database_restored
FROM Disk('gcs_backup', 'my_database_backup_2026-03-31/');
```

Restore a specific table under a new name:

```sql
RESTORE TABLE my_database.events AS my_database.events_restored
FROM Disk('gcs_backup', 'events_backup_2026-03-31/');
```

## Automating with Shell Script

Automate daily backups with a shell script and cron:

```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d)
clickhouse-client --query "BACKUP DATABASE production TO Disk('gcs_backup', 'prod_backup_${DATE}/')"
echo "Backup completed: prod_backup_${DATE}"
```

Schedule it with cron:

```bash
0 2 * * * /usr/local/bin/clickhouse-backup-gcs.sh >> /var/log/clickhouse-backup.log 2>&1
```

## Summary

Backing up ClickHouse to GCS requires configuring an `s3`-type disk pointing at the GCS S3-compatible endpoint with HMAC credentials, then using the native BACKUP command. Incremental backups with `base_backup` reduce storage costs for daily backup schedules. Monitor backup status via `system.backups` and test restores regularly.
