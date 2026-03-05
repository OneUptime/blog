# How to Restore a Cloud SQL Instance from a Backup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, Backup, Restore, Disaster Recovery

Description: Learn how to restore a Cloud SQL instance from automated or on-demand backups, including restoring to the same instance, a different instance, and point-in-time recovery.

---

Having backups is only half the equation. The other half is knowing how to restore them quickly and correctly when disaster strikes. Cloud SQL provides several restore options - restoring to the same instance, to a different instance, or to a specific point in time. This guide walks through each approach with practical examples and considerations.

## Understanding Your Restore Options

Cloud SQL gives you three ways to restore:

1. **Restore to the same instance** - Overwrites current data with the backup. Fast, but destructive.
2. **Restore to a different instance** - Creates or overwrites data on another instance. Safer for verification.
3. **Point-in-time recovery (PITR)** - Clones the instance to a specific timestamp. Most granular.

Each has its use case:

- Same instance: Production emergency, you need to roll back immediately
- Different instance: You want to verify the backup before switching over
- PITR: You know exactly when the problem occurred (like an accidental DELETE)

## Step 1: List Available Backups

Before restoring, see what backups are available:

```bash
# List all backups for an instance, most recent first
gcloud sql backups list \
    --instance=my-instance \
    --sort-by=~startTime \
    --limit=10
```

Output shows backup IDs, start/end times, status, and type (AUTOMATED or ON_DEMAND). Note the ID of the backup you want to restore.

For more details about a specific backup:

```bash
# Get details about a specific backup
gcloud sql backups describe BACKUP_ID \
    --instance=my-instance
```

## Restoring to the Same Instance

This overwrites the current data in the instance with the backup's data. Use this when you need to roll back immediately.

```bash
# Restore a backup to the same instance
# WARNING: This overwrites all current data
gcloud sql backups restore BACKUP_ID \
    --restore-instance=my-instance
```

What happens during the restore:

1. The instance becomes unavailable
2. All current data is replaced with the backup data
3. Any changes made after the backup time are lost
4. The instance restarts and becomes available again

Restore time depends on database size:

- Small databases (under 10 GB): A few minutes
- Medium databases (10-100 GB): 15-60 minutes
- Large databases (100+ GB): 1-4 hours

### Before You Restore

Create a backup of the current data first, in case you need it:

```bash
# Create a backup of current state before restoring
gcloud sql backups create \
    --instance=my-instance \
    --description="Pre-restore backup - current state"
```

## Restoring to a Different Instance

The safer approach. Restore to a temporary instance, verify the data, then decide whether to switch.

### Create a Temporary Instance

```bash
# Create a temporary instance for the restore
gcloud sql instances create my-instance-restore-test \
    --database-version=POSTGRES_15 \
    --tier=db-custom-4-16384 \
    --region=us-central1 \
    --storage-type=SSD \
    --storage-size=100GB
```

### Restore the Backup

```bash
# Restore the backup to the temporary instance
gcloud sql backups restore BACKUP_ID \
    --restore-instance=my-instance-restore-test \
    --backup-instance=my-instance
```

The `--backup-instance` flag specifies which instance the backup belongs to.

### Verify the Data

```bash
# Connect to the restored instance and verify
gcloud sql connect my-instance-restore-test --user=postgres
```

```sql
-- Run verification queries
-- Check row counts on critical tables
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'products', COUNT(*) FROM products;

-- Check the latest data timestamp
SELECT MAX(created_at) FROM orders;

-- Run any application-specific validation queries
```

### Switch Traffic (If Verified)

If the restored data looks good, you have several options:

**Option A: Update connection strings** to point to the restored instance. This is the cleanest approach but requires an application deployment.

**Option B: Export from restored instance and import to production**:

```bash
# Export specific data from the restored instance
gcloud sql export sql my-instance-restore-test \
    gs://my-bucket/restore-export.sql \
    --database=mydb

# Import into the production instance
gcloud sql import sql my-instance \
    gs://my-bucket/restore-export.sql \
    --database=mydb
```

### Clean Up

```bash
# Delete the temporary instance when done
gcloud sql instances delete my-instance-restore-test
```

## Point-in-Time Recovery

PITR lets you restore to any second within your transaction log retention window. This is the most precise option.

### Check PITR Availability

```bash
# Verify PITR is enabled and check the recovery window
gcloud sql instances describe my-instance \
    --format="json(settings.backupConfiguration.pointInTimeRecoveryEnabled, settings.backupConfiguration.transactionLogRetentionDays)"
```

### Determine the Recovery Timestamp

You need to know the exact timestamp to restore to. Common approaches:

1. **From application logs**: Find when the bad operation happened
2. **From Cloud SQL audit logs**: Check Cloud Logging for the problematic query
3. **From user reports**: Estimate the time based on when users reported the issue

```bash
# Search Cloud Logging for the problematic query
gcloud logging read \
    'resource.type="cloudsql_database" AND resource.labels.database_id="my-project:my-instance" AND textPayload:"DELETE FROM users"' \
    --format="table(timestamp, textPayload)" \
    --limit=10
```

### Perform the PITR

PITR creates a new instance (clone) with data at the specified point:

```bash
# Clone the instance to a point in time
# Use the timestamp just BEFORE the problematic event
gcloud sql instances clone my-instance my-instance-pitr \
    --point-in-time="2026-02-17T14:29:59Z"
```

The timestamp must be in RFC 3339 format and must be within the transaction log retention window.

### Verify and Switch

```bash
# Connect to the PITR clone and verify
gcloud sql connect my-instance-pitr --user=postgres
```

```sql
-- Verify the data looks correct at this point in time
SELECT COUNT(*) FROM users;  -- Should have the rows that were deleted

-- Check the latest transaction time matches your expected restore point
SELECT MAX(updated_at) FROM users;
```

If the data is correct, switch your application to the new instance or export/import the specific data you need.

## Restoring with Terraform

If you manage your infrastructure with Terraform, handle restores carefully:

```hcl
# Import the restored instance into Terraform state
# Do NOT try to restore using Terraform directly

# After restoring via gcloud, import the instance
# terraform import google_sql_database_instance.main my-instance
```

Terraform does not have a native restore operation. Perform restores with gcloud, then reconcile your Terraform state.

## Automating Restore Testing

Schedule regular restore tests to verify backups work:

```bash
#!/bin/bash
# restore-test.sh - Automated monthly restore test

INSTANCE="my-instance"
TEST_INSTANCE="restore-test-$(date +%Y%m%d)"
PROJECT="my-project"

# Get the most recent backup ID
BACKUP_ID=$(gcloud sql backups list \
    --instance=${INSTANCE} \
    --sort-by=~startTime \
    --limit=1 \
    --format="value(id)")

echo "Testing restore of backup ${BACKUP_ID}"

# Create a temporary instance
gcloud sql instances create ${TEST_INSTANCE} \
    --database-version=POSTGRES_15 \
    --tier=db-custom-2-8192 \
    --region=us-central1 \
    --storage-type=SSD \
    --storage-size=50GB

# Restore the backup
gcloud sql backups restore ${BACKUP_ID} \
    --restore-instance=${TEST_INSTANCE} \
    --backup-instance=${INSTANCE}

# Wait for restore to complete
echo "Waiting for restore to complete..."
while true; do
    STATE=$(gcloud sql instances describe ${TEST_INSTANCE} --format="value(state)")
    if [ "${STATE}" = "RUNNABLE" ]; then
        echo "Restore completed successfully!"
        break
    fi
    sleep 30
done

# Run validation (add your own validation queries)
echo "Running validation queries..."

# Clean up
gcloud sql instances delete ${TEST_INSTANCE} --quiet

echo "Restore test completed"
```

## Restore Time Expectations

Restore time depends on several factors:

| Database Size | Backup Restore | PITR Clone |
|---------------|---------------|------------|
| 1 GB | 2-5 minutes | 5-10 minutes |
| 10 GB | 5-15 minutes | 10-20 minutes |
| 100 GB | 30-60 minutes | 45-90 minutes |
| 500 GB | 2-4 hours | 3-5 hours |
| 1 TB+ | 4-8 hours | 5-10 hours |

PITR is slightly slower because it needs to replay transaction logs on top of the base backup.

## Post-Restore Checklist

After restoring, verify these items:

```bash
# 1. Check instance health
gcloud sql instances describe my-instance --format="value(state)"

# 2. Verify connections work
gcloud sql connect my-instance --user=postgres

# 3. Check database list
gcloud sql databases list --instance=my-instance
```

```sql
-- 4. Verify critical table row counts
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM orders;

-- 5. Check for data consistency
SELECT MAX(id) FROM orders;  -- Compare with expected value

-- 6. Verify application functionality
-- Run key application queries to confirm data integrity
```

Additional checks:

- Verify automated backups are still configured
- Check that read replicas are still replicating (they may need to be recreated)
- Confirm monitoring and alerts are active
- Test application connectivity end-to-end
- Review any data that may have been lost between the backup time and the restore time

## Common Restore Mistakes

1. **Not backing up before restoring**: Always create a backup of the current state before overwriting it.
2. **Wrong backup ID**: Double-check the backup timestamp matches what you expect.
3. **Forgetting about replicas**: Restoring a primary can break replication. You may need to delete and recreate replicas.
4. **Not verifying**: Always verify the restored data before switching traffic.
5. **PITR timestamp too precise**: If you pick a timestamp during a transaction, you might get partial data. Choose a clean point.

## Summary

Restoring from a Cloud SQL backup is a straightforward operation, but the decisions around how to restore matter a lot. For production emergencies, restore to the same instance if speed is critical. For safer verification, restore to a temporary instance first. For surgical recovery from known-time incidents, use point-in-time recovery. Test your restore process regularly - a backup you have never restored is a backup you cannot trust.
