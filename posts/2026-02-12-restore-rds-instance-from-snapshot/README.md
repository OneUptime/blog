# How to Restore an RDS Instance from a Snapshot

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, Backups, Disaster Recovery

Description: Learn how to restore an RDS instance from a snapshot, including configuration options, networking considerations, and post-restore steps.

---

Restoring from a snapshot is something you hope you'll never need to do in an emergency, but when you do, you want to know exactly how it works. Maybe a bad migration corrupted data, a developer accidentally dropped a table, or you need to create a test environment from production data. Whatever the reason, RDS makes snapshot restoration straightforward. Let's go through the entire process.

## Important: Restore Creates a New Instance

The first thing to understand is that restoring from a snapshot always creates a **new** RDS instance. It does not overwrite your existing instance. You'll have both the original instance and the restored instance running simultaneously. This means:

- You need to choose a new DB instance identifier
- You'll need to update your application's connection string to point to the new instance
- You're billed for both instances until you delete one

This design is actually a safety feature. You can verify the restored data before switching your application over, and you can't accidentally destroy your current database during a restore.

## Listing Available Snapshots

First, find the snapshot you want to restore from.

This lists your most recent snapshots for a specific instance.

```bash
# List automated snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier my-production-db \
  --snapshot-type automated \
  --query 'sort_by(DBSnapshots, &SnapshotCreateTime)[-5:].{ID:DBSnapshotIdentifier,Created:SnapshotCreateTime,Status:Status,Engine:Engine,Size:AllocatedStorage}' \
  --output table

# List manual snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier my-production-db \
  --snapshot-type manual \
  --query 'sort_by(DBSnapshots, &SnapshotCreateTime)[-5:].{ID:DBSnapshotIdentifier,Created:SnapshotCreateTime,Status:Status,Engine:Engine,Size:AllocatedStorage}' \
  --output table
```

## Restoring from a Snapshot - Basic

The simplest restore uses the same configuration as the original instance.

This restores a snapshot to a new instance.

```bash
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier my-db-restored \
  --db-snapshot-identifier my-db-before-migration-2026-02-12
```

RDS will use the engine, storage, and most settings from the snapshot. However, several settings are NOT preserved and use defaults:

- Security groups (reverts to the default VPC security group)
- Parameter group (reverts to the default)
- Option group (reverts to the default)
- Backup retention period
- Monitoring settings
- Multi-AZ setting

## Restoring with Full Configuration

For a production restore, specify all the settings explicitly.

This restores with all production-appropriate settings.

```bash
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier my-db-restored \
  --db-snapshot-identifier my-db-before-migration-2026-02-12 \
  --db-instance-class db.r6g.large \
  --db-subnet-group-name my-db-subnet-group \
  --vpc-security-group-ids sg-db-123 \
  --db-parameter-group-name my-postgres-params \
  --option-group-name my-option-group \
  --multi-az \
  --no-publicly-accessible \
  --storage-type gp3 \
  --iops 6000 \
  --storage-throughput 250 \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "sun:05:00-sun:06:00" \
  --enable-cloudwatch-logs-exports '["postgresql"]' \
  --deletion-protection \
  --copy-tags-to-snapshot \
  --tags Key=Environment,Value=production Key=RestoredFrom,Value=my-db-before-migration-2026-02-12
```

## Waiting for the Restore

Restoration time depends on the database size. A small database might take 10-15 minutes, while a large one could take hours.

```bash
# Wait for the instance to become available
aws rds wait db-instance-available \
  --db-instance-identifier my-db-restored

# Or check status periodically
watch -n 30 "aws rds describe-db-instances \
  --db-instance-identifier my-db-restored \
  --query 'DBInstances[0].{Status:DBInstanceStatus,AZ:AvailabilityZone}' \
  --output table"
```

## Post-Restore Verification

After the restore completes, verify the data before switching your application.

### Connect and Check

```bash
# Get the new endpoint
aws rds describe-db-instances \
  --db-instance-identifier my-db-restored \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text

# Connect and verify data
psql -h my-db-restored.abc123.us-east-1.rds.amazonaws.com \
  -U admin -d myappdb
```

Run some verification queries.

```sql
-- Check table counts
SELECT schemaname, relname, n_live_tup
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC
LIMIT 20;

-- Check the latest records to verify data freshness
SELECT MAX(created_at) FROM orders;
SELECT MAX(updated_at) FROM users;

-- Verify specific data integrity
SELECT COUNT(*) FROM orders WHERE created_at > '2026-02-12 00:00:00';
```

## Switching Your Application

Once you've verified the restored data, you have a few options for switching over.

### Option 1: Update Application Config

The simplest approach. Update your application's database connection string to point to the new endpoint.

```bash
# Old endpoint
# my-production-db.abc123.us-east-1.rds.amazonaws.com

# New endpoint
# my-db-restored.abc123.us-east-1.rds.amazonaws.com
```

### Option 2: Rename Instances

Rename the instances so your application doesn't need configuration changes. This requires brief downtime.

This swaps the names of the original and restored instances.

```bash
# Step 1: Rename original (makes the endpoint unavailable briefly)
aws rds modify-db-instance \
  --db-instance-identifier my-production-db \
  --new-db-instance-identifier my-production-db-old \
  --apply-immediately

# Wait for rename to complete
aws rds wait db-instance-available \
  --db-instance-identifier my-production-db-old

# Step 2: Rename restored to the original name
aws rds modify-db-instance \
  --db-instance-identifier my-db-restored \
  --new-db-instance-identifier my-production-db \
  --apply-immediately

# Wait for rename
aws rds wait db-instance-available \
  --db-instance-identifier my-production-db
```

After renaming, the restored instance has the same endpoint as the original, and your application reconnects without config changes.

### Option 3: Route 53 CNAME

If you use a Route 53 CNAME for your database (e.g., `db.myapp.internal`), update the CNAME to point to the new endpoint.

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "db.myapp.internal",
        "Type": "CNAME",
        "TTL": 60,
        "ResourceRecords": [{"Value": "my-db-restored.abc123.us-east-1.rds.amazonaws.com"}]
      }
    }]
  }'
```

## Restoring to a Different Instance Class

You can restore to a different instance class than the original. This is useful for creating a smaller copy for testing.

```bash
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier my-db-test-copy \
  --db-snapshot-identifier my-production-snapshot \
  --db-instance-class db.t3.medium \
  --no-multi-az \
  --no-deletion-protection
```

## Restoring Encrypted Snapshots

If the snapshot is encrypted, the restored instance uses the same KMS key. To use a different key, copy the snapshot first with the new key, then restore from the copy.

```bash
# Copy with a different KMS key
aws rds copy-db-snapshot \
  --source-db-snapshot-identifier my-encrypted-snapshot \
  --target-db-snapshot-identifier my-snapshot-new-key \
  --kms-key-id arn:aws:kms:us-east-1:123456789012:key/new-key-id

# Wait for copy
aws rds wait db-snapshot-available \
  --db-snapshot-identifier my-snapshot-new-key

# Restore from the copy
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier my-db-restored \
  --db-snapshot-identifier my-snapshot-new-key
```

## Restoring Cross-Region Snapshots

If you've copied snapshots to another region, restore from them in that region.

```bash
# In eu-west-1
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier my-db-eu-restored \
  --db-snapshot-identifier my-db-copy-eu \
  --db-subnet-group-name eu-db-subnet-group \
  --vpc-security-group-ids sg-eu-db-123 \
  --region eu-west-1
```

## Automating Restore for DR

Here's a script that automates the full restore process.

This Python script handles finding the latest snapshot, restoring, and waiting for completion.

```python
import boto3
import time

rds = boto3.client('rds')

def restore_latest_snapshot(source_instance, restored_instance, config):
    # Find the latest automated snapshot
    snapshots = rds.describe_db_snapshots(
        DBInstanceIdentifier=source_instance,
        SnapshotType='automated'
    )['DBSnapshots']

    if not snapshots:
        raise Exception(f"No snapshots found for {source_instance}")

    latest = sorted(snapshots, key=lambda s: s['SnapshotCreateTime'])[-1]
    print(f"Restoring from: {latest['DBSnapshotIdentifier']}")
    print(f"Snapshot time: {latest['SnapshotCreateTime']}")

    # Restore
    rds.restore_db_instance_from_db_snapshot(
        DBInstanceIdentifier=restored_instance,
        DBSnapshotIdentifier=latest['DBSnapshotIdentifier'],
        DBInstanceClass=config.get('instance_class', 'db.r6g.large'),
        DBSubnetGroupName=config['subnet_group'],
        VpcSecurityGroupIds=config['security_groups'],
        MultiAZ=config.get('multi_az', True),
        PubliclyAccessible=False,
        CopyTagsToSnapshot=True,
        Tags=[
            {'Key': 'RestoredFrom', 'Value': latest['DBSnapshotIdentifier']},
            {'Key': 'Purpose', 'Value': 'disaster-recovery'}
        ]
    )

    # Wait for restore
    print("Waiting for instance to become available...")
    waiter = rds.get_waiter('db_instance_available')
    waiter.wait(
        DBInstanceIdentifier=restored_instance,
        WaiterConfig={'Delay': 30, 'MaxAttempts': 120}
    )

    # Get endpoint
    instance = rds.describe_db_instances(
        DBInstanceIdentifier=restored_instance
    )['DBInstances'][0]

    endpoint = instance['Endpoint']['Address']
    print(f"Restore complete! Endpoint: {endpoint}")
    return endpoint

# Run
endpoint = restore_latest_snapshot(
    source_instance='my-production-db',
    restored_instance='my-db-restored',
    config={
        'instance_class': 'db.r6g.large',
        'subnet_group': 'my-db-subnet-group',
        'security_groups': ['sg-db-123'],
        'multi_az': True
    }
)
```

## Monitoring and Alerting

Set up monitoring for your restored instance immediately after restore. Don't assume the monitoring from the original instance carries over - it doesn't. Create new CloudWatch alarms and integrate with [OneUptime](https://oneuptime.com/blog/post/aws-infrastructure-monitoring/view) for comprehensive monitoring.

## Wrapping Up

Restoring from a snapshot is straightforward, but the devil is in the details. Remember that restoration creates a new instance, security groups and parameter groups need to be specified explicitly, and you should verify the data before switching your application. Practice the restore process regularly so when you actually need it, you can execute confidently. For point-in-time recovery to a specific second, check out [restoring to a point in time](https://oneuptime.com/blog/post/restore-rds-instance-point-in-time/view).
