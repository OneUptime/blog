# How to Handle Terraform Enterprise Backup and Recovery

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, Backups, Recovery, Disaster Recovery, DevOps

Description: Learn how to implement a backup and recovery strategy for Terraform Enterprise, covering database backups, object storage, configuration backup, and tested recovery procedures.

---

Terraform Enterprise holds the keys to your infrastructure. State files, workspace configurations, policy sets, variable values, and run history - losing any of this data could mean days of recovery work or, worse, infrastructure drift you cannot reconcile. A solid backup strategy is not a nice-to-have; it is a requirement for running TFE responsibly.

This guide covers what to back up, how to do it, and how to verify that your backups actually work by testing recovery.

## What Needs to Be Backed Up

TFE stores data in three places, and all three need to be included in your backup strategy:

1. **PostgreSQL database**: Contains workspace configurations, user accounts, team memberships, organization settings, run metadata, and policy data.
2. **Object storage**: Contains Terraform state files, plan outputs, configuration versions, and policy bundles.
3. **TFE configuration**: Environment variables, TLS certificates, license file, and Docker Compose or Helm configuration.

Missing any one of these makes a full recovery impossible.

## Backing Up PostgreSQL

### Automated Daily Backups

```bash
#!/bin/bash
# backup-tfe-postgres.sh
# Run this as a cron job for automated daily backups

# Configuration
BACKUP_DIR="/opt/tfe-backups/postgres"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/tfe_postgres_${TIMESTAMP}.sql.gz"

# Database connection details
DB_HOST="tfe-postgres.abc123.us-east-1.rds.amazonaws.com"
DB_PORT="5432"
DB_NAME="tfe"
DB_USER="tfe_admin"

# Create backup directory if it does not exist
mkdir -p "${BACKUP_DIR}"

# Perform the backup with compression
PGPASSWORD="${DB_PASSWORD}" pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --format=custom \
  --compress=9 \
  --verbose \
  --file="${BACKUP_FILE}" \
  2>> "${BACKUP_DIR}/backup.log"

# Check if backup was successful
if [ $? -eq 0 ]; then
  echo "[${TIMESTAMP}] Backup completed: ${BACKUP_FILE}" >> "${BACKUP_DIR}/backup.log"

  # Upload to S3 for offsite storage
  aws s3 cp "${BACKUP_FILE}" "s3://tfe-backups-bucket/postgres/${TIMESTAMP}/"

  # Clean up old local backups
  find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete
else
  echo "[${TIMESTAMP}] BACKUP FAILED" >> "${BACKUP_DIR}/backup.log"
  # Send an alert - this is critical
  # Use your monitoring tool to alert on backup failures
  exit 1
fi
```

### AWS RDS Automated Snapshots

If you use RDS for the TFE database, leverage automated snapshots:

```bash
# Enable automated backups with 14-day retention
aws rds modify-db-instance \
  --db-instance-identifier tfe-postgres \
  --backup-retention-period 14 \
  --preferred-backup-window "03:00-04:00" \
  --apply-immediately

# Create a manual snapshot before major changes
aws rds create-db-snapshot \
  --db-instance-identifier tfe-postgres \
  --db-snapshot-identifier tfe-pre-upgrade-$(date +%Y%m%d)

# List existing snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier tfe-postgres \
  --query 'DBSnapshots[].{ID:DBSnapshotIdentifier,Time:SnapshotCreateTime,Status:Status}' \
  --output table
```

## Backing Up Object Storage

### S3 Cross-Region Replication

For S3-based object storage, set up cross-region replication:

```hcl
# Terraform configuration for S3 backup replication
resource "aws_s3_bucket" "tfe_backup" {
  bucket   = "tfe-object-storage-backup"
  provider = aws.backup_region
}

resource "aws_s3_bucket_versioning" "tfe_backup" {
  bucket   = aws_s3_bucket.tfe_backup.id
  provider = aws.backup_region

  versioning_configuration {
    status = "Enabled"
  }
}

# Replication configuration on the primary bucket
resource "aws_s3_bucket_replication_configuration" "tfe_replication" {
  bucket = aws_s3_bucket.tfe_primary.id
  role   = aws_iam_role.tfe_replication.arn

  rule {
    id     = "replicate-all"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.tfe_backup.arn
      storage_class = "STANDARD_IA"

      # Encrypt replicated objects with a different KMS key
      encryption_configuration {
        replica_kms_key_id = aws_kms_key.backup_region.arn
      }
    }
  }
}
```

### Manual Object Storage Backup

```bash
# Sync the entire TFE object storage bucket to a backup location
aws s3 sync \
  s3://tfe-object-storage-prod \
  s3://tfe-object-storage-backup \
  --source-region us-east-1 \
  --region us-west-2

# For Azure Blob Storage
az storage blob copy start-batch \
  --destination-container tfe-objects-backup \
  --account-name tfebackupaccount \
  --source-container tfe-objects \
  --source-account-name tfestorageaccount \
  --source-account-key "${SOURCE_KEY}"
```

## Backing Up TFE Configuration

```bash
#!/bin/bash
# backup-tfe-config.sh
# Back up TFE configuration files and secrets

BACKUP_DIR="/opt/tfe-backups/config"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CONFIG_ARCHIVE="${BACKUP_DIR}/tfe_config_${TIMESTAMP}.tar.gz.enc"

mkdir -p "${BACKUP_DIR}"

# Create a temporary directory for config files
TEMP_DIR=$(mktemp -d)

# Copy TFE configuration files
cp /opt/tfe/docker-compose.yml "${TEMP_DIR}/"
cp /opt/tfe/.env "${TEMP_DIR}/"
cp -r /opt/tfe/certs/ "${TEMP_DIR}/certs/"
cp /opt/tfe/license.rli "${TEMP_DIR}/" 2>/dev/null

# Export current TFE settings via API
curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  https://tfe.example.com/api/v2/admin/general-settings \
  > "${TEMP_DIR}/admin-settings.json"

# Export organization and workspace configurations
curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  https://tfe.example.com/api/v2/admin/organizations \
  > "${TEMP_DIR}/organizations.json"

# Create encrypted archive
tar czf - -C "${TEMP_DIR}" . | \
  openssl enc -aes-256-cbc -salt -pbkdf2 \
  -pass file:/opt/tfe-backups/encryption-key \
  -out "${CONFIG_ARCHIVE}"

# Clean up temporary files
rm -rf "${TEMP_DIR}"

# Upload to secure backup location
aws s3 cp "${CONFIG_ARCHIVE}" \
  "s3://tfe-backups-bucket/config/${TIMESTAMP}/"

echo "Configuration backup completed: ${CONFIG_ARCHIVE}"
```

## Full Backup Script

Combine everything into a single script:

```bash
#!/bin/bash
# full-tfe-backup.sh
# Complete TFE backup - run daily via cron

set -euo pipefail

LOG_FILE="/var/log/tfe-backup.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

log "Starting full TFE backup"

# Step 1: Back up PostgreSQL
log "Backing up PostgreSQL database..."
/opt/tfe-backups/scripts/backup-tfe-postgres.sh
if [ $? -ne 0 ]; then
  log "ERROR: PostgreSQL backup failed"
  exit 1
fi

# Step 2: Back up object storage
log "Syncing object storage..."
aws s3 sync s3://tfe-object-storage-prod s3://tfe-object-storage-backup \
  --quiet 2>> "${LOG_FILE}"
if [ $? -ne 0 ]; then
  log "ERROR: Object storage sync failed"
  exit 1
fi

# Step 3: Back up configuration
log "Backing up TFE configuration..."
/opt/tfe-backups/scripts/backup-tfe-config.sh
if [ $? -ne 0 ]; then
  log "ERROR: Configuration backup failed"
  exit 1
fi

log "Full TFE backup completed successfully"
```

Set up the cron job:

```bash
# Run full backup daily at 2 AM
echo "0 2 * * * /opt/tfe-backups/scripts/full-tfe-backup.sh" | crontab -
```

## Recovery Procedures

### Restoring PostgreSQL

```bash
# Restore from a pg_dump backup
PGPASSWORD="${DB_PASSWORD}" pg_restore \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --clean \
  --if-exists \
  --verbose \
  "/opt/tfe-backups/postgres/tfe_postgres_20260223.sql.gz"

# Restore from an RDS snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier tfe-postgres-restored \
  --db-snapshot-identifier tfe-pre-upgrade-20260223 \
  --db-instance-class db.r6g.large \
  --db-subnet-group-name tfe-db-subnet-group
```

### Restoring Object Storage

```bash
# Sync backup bucket back to primary
aws s3 sync \
  s3://tfe-object-storage-backup \
  s3://tfe-object-storage-prod \
  --source-region us-west-2 \
  --region us-east-1
```

### Full Recovery Steps

1. Deploy a fresh TFE instance (or repair the existing one)
2. Restore the PostgreSQL database
3. Restore object storage data
4. Restore the TFE configuration (certificates, env vars, license)
5. Start TFE and verify the health check passes
6. Log in and verify workspaces, state files, and run history are intact
7. Run a test plan in a non-production workspace to confirm full functionality

## Testing Your Backups

Backups that are never tested are not really backups. Schedule regular recovery drills:

```bash
# Quarterly recovery test checklist
# 1. Spin up a test TFE instance in an isolated environment
# 2. Restore the database from the latest backup
# 3. Restore object storage to a test bucket
# 4. Configure the test instance to use restored data
# 5. Verify login works
# 6. Verify workspace list matches production
# 7. Verify state files are readable
# 8. Run a plan in a test workspace
# 9. Document the recovery time (RTO)
# 10. Tear down the test environment
```

## Monitoring Backup Health

Use [OneUptime](https://oneuptime.com) or a similar monitoring tool to track:

- Backup job completion status
- Backup file sizes (sudden drops indicate problems)
- Time since last successful backup
- Storage usage in backup locations
- Recovery test results

## Summary

A complete TFE backup strategy covers three things: the PostgreSQL database, object storage, and the TFE configuration itself. Automate all three, store backups offsite, encrypt them, and test recovery regularly. The worst time to discover your backup does not work is when you actually need it. Build the backup pipeline now, test it quarterly, and sleep better knowing your infrastructure management platform is recoverable.
