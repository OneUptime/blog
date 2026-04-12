# How to Set Up Cross-Region MySQL Backups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Backup, Cloud

Description: Learn how to set up cross-region MySQL backups using S3 cross-region replication, mysqldump uploads, and XtraBackup streaming for geographic redundancy.

---

Cross-region backups protect against regional cloud failures, data center disasters, and accidental deletion of the primary backup location. They ensure that a copy of your MySQL data exists in a geographically separate location, independent of the primary infrastructure.

## Why Cross-Region Matters

Storing backups in the same region as your production database creates a single point of failure. A regional outage, account compromise, or misconfigured delete policy could destroy both your database and its backups simultaneously. Cross-region copies eliminate this risk.

## Approach 1: Direct Upload to a Different Region

When creating a backup, specify a bucket in a different AWS region:

```bash
#!/bin/bash
DB="myapp_db"
DATE=$(date +%F)
PRIMARY_REGION="us-east-1"
DR_REGION="eu-west-1"
DR_BUCKET="s3://myapp-mysql-dr-eu"

# Create backup
mysqldump \
  --single-transaction \
  --routines --triggers --events \
  "$DB" | gzip > /tmp/"$DB-$DATE.sql.gz"

# Upload to DR region
AWS_DEFAULT_REGION="$DR_REGION" aws s3 cp \
  /tmp/"$DB-$DATE.sql.gz" \
  "$DR_BUCKET/$DB/$DATE/$DB-$DATE.sql.gz" \
  --sse AES256

rm -f /tmp/"$DB-$DATE.sql.gz"
```

## Approach 2: S3 Cross-Region Replication

Configure automatic replication from the primary bucket to a DR bucket in another region using S3 Replication Rules:

```json
{
  "Role": "arn:aws:iam::123456789:role/s3-replication-role",
  "Rules": [
    {
      "ID": "mysql-backup-replication",
      "Priority": 1,
      "Status": "Enabled",
      "Filter": {
        "Prefix": "mysql-backups/"
      },
      "Destination": {
        "Bucket": "arn:aws:s3:::myapp-mysql-dr-eu",
        "StorageClass": "STANDARD_IA",
        "EncryptionConfiguration": {
          "ReplicaKmsKeyID": "arn:aws:kms:eu-west-1:123456789:key/abc"
        }
      },
      "DeleteMarkerReplication": {
        "Status": "Disabled"
      }
    }
  ]
}
```

Apply this with the AWS CLI:

```bash
aws s3api put-bucket-replication \
  --bucket myapp-mysql-backups-us \
  --replication-configuration file://replication.json \
  --region us-east-1
```

## Approach 3: Streaming XtraBackup Directly to a Remote Region

For large databases, stream directly to the remote bucket without creating a local file:

```bash
xtrabackup --backup --stream=xbstream \
  --user=backup_user --password=secret | \
  gzip | \
  aws s3 cp - \
    s3://myapp-mysql-dr-eu/full/$(date +%F).xbstream.gz \
    --region eu-west-1
```

This uses no local disk space and is efficient for databases too large to store temporarily.

## Verifying Cross-Region Copy Integrity

After uploading, verify the backup exists and check the checksum:

```bash
# Generate checksum during upload
CHECKSUM=$(md5sum /tmp/myapp_db-2026-03-31.sql.gz | awk '{print $1}')
echo "$CHECKSUM" | aws s3 cp - s3://myapp-mysql-dr-eu/checksums/2026-03-31.md5

# Verify on restore
REMOTE_CHECKSUM=$(aws s3 cp s3://myapp-mysql-dr-eu/checksums/2026-03-31.md5 - --region eu-west-1)
DOWNLOADED_CHECKSUM=$(aws s3 cp s3://myapp-mysql-dr-eu/myapp_db/2026-03-31/myapp_db-2026-03-31.sql.gz - --region eu-west-1 | md5sum | awk '{print $1}')

if [ "$REMOTE_CHECKSUM" = "$DOWNLOADED_CHECKSUM" ]; then
  echo "Checksum verified"
else
  echo "Checksum mismatch - backup may be corrupt"
fi
```

## Lifecycle and Retention in the DR Region

Set separate lifecycle rules in the DR bucket for cost optimization:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket myapp-mysql-dr-eu \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "dr-retention",
      "Status": "Enabled",
      "Filter": {"Prefix": ""},
      "Transitions": [{"Days": 30, "StorageClass": "GLACIER"}],
      "Expiration": {"Days": 365}
    }]
  }' \
  --region eu-west-1
```

## Summary

Cross-region MySQL backups protect against regional failures by maintaining a geographically separate backup copy. Direct uploads to a DR bucket, S3 cross-region replication, or streaming XtraBackup are all viable approaches. Always verify backup integrity with checksums and test restoration from the DR region periodically.
