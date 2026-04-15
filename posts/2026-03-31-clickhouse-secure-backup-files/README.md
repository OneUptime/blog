# How to Secure ClickHouse Backup Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Backup, Security, Encryption, S3

Description: Secure ClickHouse backup files by encrypting backups at rest, using access-controlled storage destinations, and verifying backup integrity with checksums.

---

ClickHouse backups contain your most sensitive data. Without proper security controls, backup files stored on S3 or local disks can be accessed by anyone with access to the storage layer. Encrypting backups, restricting access, and verifying integrity are essential practices for production deployments.

## Backup Encryption at Rest

ClickHouse supports encrypted backups using AES-128 or AES-256. Configure an encrypted disk as the backup target:

```xml
<storage_configuration>
  <disks>
    <backup_encrypted>
      <type>encrypted</type>
      <disk>backup_s3</disk>
      <path>/</path>
      <key>your-32-byte-hex-encryption-key-here</key>
      <algorithm>AES_256_CTR</algorithm>
    </backup_encrypted>

    <backup_s3>
      <type>s3</type>
      <endpoint>https://s3.amazonaws.com/my-backups-bucket/clickhouse/</endpoint>
      <access_key_id>BACKUP_ACCESS_KEY</access_key_id>
      <secret_access_key>BACKUP_SECRET_KEY</secret_access_key>
    </backup_s3>
  </disks>
</storage_configuration>
```

## Running an Encrypted Backup

```sql
BACKUP TABLE mydb.events
TO Disk('backup_encrypted', 'events-backup-2026-03-31/');
```

The data is encrypted before being written to S3, so the bucket contents are unreadable without the key.

## S3 Bucket Policy for Backup Access Control

Restrict backup bucket access to only the ClickHouse service role and backup admin role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::my-backups-bucket/*"],
      "Condition": {
        "StringNotEquals": {
          "aws:PrincipalArn": [
            "arn:aws:iam::123456789:role/clickhouse-backup-role",
            "arn:aws:iam::123456789:role/backup-admin-role"
          ]
        }
      }
    }
  ]
}
```

## Enabling S3 Object Lock

Enable S3 Object Lock with governance mode to prevent backup deletion for a minimum retention period:

```bash
aws s3api put-object-lock-configuration \
    --bucket my-backups-bucket \
    --object-lock-configuration \
    '{"ObjectLockEnabled":"Enabled","Rule":{"DefaultRetention":{"Mode":"GOVERNANCE","Days":30}}}'
```

This ensures backups cannot be deleted within the retention window, protecting against ransomware attacks that delete backups before encrypting the primary data.

## Verifying Backup Integrity

After each backup, verify it can be restored:

```sql
-- Restore to a test table for verification
RESTORE TABLE mydb.events AS mydb.events_restore_test
FROM Disk('backup_encrypted', 'events-backup-2026-03-31/');

-- Verify row count matches
SELECT
    (SELECT count() FROM mydb.events) AS source_rows,
    (SELECT count() FROM mydb.events_restore_test) AS backup_rows,
    source_rows = backup_rows AS integrity_ok;

-- Clean up test restore
DROP TABLE mydb.events_restore_test;
```

## Checking Backup Metadata

ClickHouse automatically verifies checksums during backup and restore operations. You can inspect backup metadata through the `system.backups` table:

```sql
SELECT
    id,
    name,
    status,
    num_files,
    total_size,
    uncompressed_size,
    compressed_size
FROM system.backups
WHERE name = 'events-backup-2026-03-31'
ORDER BY start_time DESC;
```

If the backup completed with status `BACKUP_CREATED`, the data passed integrity checks. A failed checksum verification during restore will produce an error, preventing silent corruption.

## Audit Trail for Backup Access

Enable S3 server access logging on the backup bucket:

```bash
aws s3api put-bucket-logging \
    --bucket my-backups-bucket \
    --bucket-logging-status '{
        "LoggingEnabled": {
            "TargetBucket": "my-access-logs-bucket",
            "TargetPrefix": "clickhouse-backups/"
        }
    }'
```

Review these logs regularly for unexpected access patterns.

## Local Backup Encryption

For local disk backups, use OS-level encryption:

```bash
# Encrypt a local backup with GPG
clickhouse-backup create mydb_backup
tar -czf - /var/lib/clickhouse/backups/mydb_backup | \
    gpg --symmetric --cipher-algo AES256 \
    -o /backup/mydb_backup-$(date +%Y%m%d).tar.gz.gpg

# Store the passphrase in Vault, not in a file
```

## Summary

Securing ClickHouse backups requires encryption at rest using ClickHouse's encrypted disk type or external encryption, strict S3 bucket policies limiting access to backup roles only, S3 Object Lock to prevent deletion within the retention window, and regular restore tests to verify backup integrity. Treat backup files with the same security rigor as production data.
