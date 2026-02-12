# How to Enable RDS Storage Auto Scaling

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, Storage, Auto Scaling, Database

Description: Learn how to enable and configure RDS Storage Auto Scaling to automatically expand database storage when running low, preventing outages from full disks.

---

Running out of disk space on a database is one of those problems that's completely preventable yet still catches teams off guard. Your database grows steadily over months, nobody notices the storage consumption trending upward, and then one day writes start failing because the disk is full. Depending on the engine, this can range from degraded performance to a full outage.

RDS Storage Auto Scaling solves this by automatically increasing your allocated storage when it detects you're running low. It's been available since 2019, it's free to enable (you just pay for the additional storage), and there's really no good reason not to use it.

## How Storage Auto Scaling Works

When enabled, RDS monitors your free storage space. If available space drops below 10% of allocated storage and stays low for at least 5 minutes, RDS automatically increases the storage. The increase is the greater of:

- 5 GB
- 10% of currently allocated storage
- The storage increase predicted to be needed based on the rate of consumption over the past hour

The scaling happens in the background with zero downtime. Your application continues reading and writing normally throughout the process.

There's one important limit: you set a **maximum storage threshold** when enabling auto scaling. RDS will never grow beyond this limit. This prevents runaway growth from a data leak, log explosion, or application bug that writes endless data.

## Enabling Storage Auto Scaling on a New Instance

When creating a new RDS instance, include the max allocated storage parameter:

```bash
# Create an RDS instance with storage auto scaling enabled
# Starts with 100GB, can grow up to 500GB
aws rds create-db-instance \
  --db-instance-identifier my-database \
  --db-instance-class db.r6g.large \
  --engine postgres \
  --master-username admin \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 100 \
  --max-allocated-storage 500 \
  --storage-type gp3
```

The `--max-allocated-storage` parameter is what turns on auto scaling. If you don't include it, auto scaling is disabled.

## Enabling Storage Auto Scaling on an Existing Instance

For instances that are already running:

```bash
# Enable storage auto scaling on an existing instance
# Set max storage to 1000GB (1TB)
aws rds modify-db-instance \
  --db-instance-identifier my-existing-database \
  --max-allocated-storage 1000 \
  --apply-immediately
```

This takes effect immediately. No restart required, no downtime. RDS starts monitoring your storage right away.

## Choosing the Right Maximum Storage Threshold

The max storage threshold is the most important decision here. Set it too low and you'll still run out of space. Set it too high and a runaway process could rack up a huge storage bill.

Here's how to think about it:

```bash
# Check current storage usage and allocation
aws rds describe-db-instances \
  --db-instance-identifier my-database \
  --query 'DBInstances[0].{Allocated:AllocatedStorage,MaxAllocated:MaxAllocatedStorage,StorageType:StorageType}'

# Check free storage over the last 30 days to understand growth rate
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name FreeStorageSpace \
  --dimensions Name=DBInstanceIdentifier,Value=my-database \
  --start-time $(date -u -v-30d +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400 \
  --statistics Average \
  --output table
```

A reasonable approach:

- **If your database grows slowly (< 5 GB/month)**: Set max to 2-3x current allocation
- **If your database grows moderately (5-50 GB/month)**: Set max to 3-5x current allocation
- **If your database grows rapidly (> 50 GB/month)**: Set max to 5-10x current allocation, and also investigate why it's growing so fast

For most production databases, I'd recommend setting the max to at least 3x your current allocation. This gives you plenty of runway without being reckless.

## Storage Auto Scaling Limitations

There are a few things to be aware of:

**Cooldown period**: After a storage auto scaling event, RDS won't scale again for at least 6 hours. This is to prevent rapid successive increases. It means you need enough headroom for 6 hours of growth in each scaling increment.

**Cannot scale down**: Storage auto scaling only goes up, never down. Once RDS increases your storage, you're paying for that larger amount even if you free up space. There's no automatic shrinking.

**Maximum size limits**: Different storage types have different maximums:
- gp2/gp3: 64 TB
- io1/io2: 64 TB
- Magnetic: 3 TB

**Aurora is different**: Aurora handles storage completely differently. It auto-scales by design and doesn't use this feature. Aurora storage grows in 10 GB increments up to 128 TB without any configuration.

## Monitoring Storage Auto Scaling Events

When auto scaling occurs, RDS generates events you can track:

```bash
# Check for recent storage modification events
aws rds describe-events \
  --source-identifier my-database \
  --source-type db-instance \
  --event-categories '["configuration change"]' \
  --duration 10080
```

You should also set up a CloudWatch alarm to alert you when storage is getting low, even with auto scaling enabled. This way you're aware of unusual growth patterns:

```bash
# Alert when free storage drops below 20% (even with auto scaling)
# For a 100GB database, that's 20GB
aws cloudwatch put-metric-alarm \
  --alarm-name "rds-mydb-storage-trend" \
  --alarm-description "Free storage below 20% - check growth rate" \
  --metric-name FreeStorageSpace \
  --namespace AWS/RDS \
  --statistic Average \
  --period 3600 \
  --evaluation-periods 6 \
  --threshold 21474836480 \
  --comparison-operator LessThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=my-database \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:rds-alerts
```

## Enabling Auto Scaling Across All Instances

If you want to enable storage auto scaling on every RDS instance in your account, here's a script:

```python
import boto3

def enable_auto_scaling_all_instances(multiplier=3):
    """Enable storage auto scaling on all RDS instances.

    Sets max storage to current allocation * multiplier.
    """
    rds = boto3.client('rds')

    instances = rds.describe_db_instances()['DBInstances']

    for instance in instances:
        instance_id = instance['DBInstanceIdentifier']
        current_storage = instance['AllocatedStorage']
        current_max = instance.get('MaxAllocatedStorage')
        engine = instance['Engine']

        # Skip Aurora instances (they handle storage differently)
        if 'aurora' in engine:
            print(f"Skipping {instance_id} (Aurora handles storage automatically)")
            continue

        # Calculate the target max storage
        target_max = current_storage * multiplier

        # Cap at 64TB for gp2/gp3/io1
        target_max = min(target_max, 65536)

        if current_max and current_max >= target_max:
            print(f"Skipping {instance_id} (already has max {current_max}GB)")
            continue

        print(f"Enabling auto scaling on {instance_id}: "
              f"current={current_storage}GB, max={target_max}GB")

        rds.modify_db_instance(
            DBInstanceIdentifier=instance_id,
            MaxAllocatedStorage=target_max,
            ApplyImmediately=True
        )

enable_auto_scaling_all_instances()
```

## Disabling Storage Auto Scaling

If you need to turn off auto scaling (maybe for cost control), set the max allocated storage to the current allocated storage:

```bash
# Check current allocated storage
CURRENT=$(aws rds describe-db-instances \
  --db-instance-identifier my-database \
  --query 'DBInstances[0].AllocatedStorage' \
  --output text)

# Disable auto scaling by setting max to current
aws rds modify-db-instance \
  --db-instance-identifier my-database \
  --max-allocated-storage $CURRENT \
  --apply-immediately
```

## Terraform Configuration

If you're managing RDS with Terraform, enabling storage auto scaling is one parameter:

```hcl
resource "aws_db_instance" "production" {
  identifier           = "my-database"
  instance_class       = "db.r6g.large"
  engine               = "postgres"
  engine_version       = "16.2"
  allocated_storage    = 100
  max_allocated_storage = 500  # This enables storage auto scaling
  storage_type         = "gp3"

  username = "admin"
  password = var.db_password

  multi_az = true
}
```

For more on managing RDS with Terraform, see our guide on [setting up RDS with Terraform](https://oneuptime.com/blog/post/set-up-rds-with-terraform/view).

## Best Practices

**Always enable storage auto scaling on production databases.** The cost of a few extra GB of storage is nothing compared to the cost of a disk-full outage.

**Set meaningful max thresholds, not arbitrary huge numbers.** If you set the max to 64 TB, a logging bug could generate a very expensive surprise.

**Monitor the growth rate, not just the free space.** A database that's growing 10x faster than expected indicates an application problem that auto scaling will mask but not fix.

**Combine with storage alarms.** Even with auto scaling, you should have [CloudWatch alarms](https://oneuptime.com/blog/post/set-up-cloudwatch-alarms-for-rds-metrics/view) for low storage. The alarm acts as a canary - if it fires, it means your database is growing fast enough to trigger scaling, and you should investigate why.

Storage auto scaling is one of those "set it and forget it" features that genuinely makes your infrastructure more resilient. Take five minutes to enable it on all your instances and move on to problems that actually need your attention.
