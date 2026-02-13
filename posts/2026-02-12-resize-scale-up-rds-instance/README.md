# How to Resize (Scale Up) an RDS Instance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, Scaling, Database, Performance

Description: Complete guide to resizing Amazon RDS instances including instance class changes, storage scaling, and strategies to minimize downtime during the process.

---

Your database is running hot. CPU is consistently above 80%, memory pressure is causing swap usage, or I/O latency is climbing. You've optimized your queries, added indexes, and tuned parameters. The next step is scaling up - moving to a bigger instance class with more CPU, memory, and network bandwidth.

Resizing an RDS instance is straightforward, but understanding the implications for downtime, cost, and performance is important before you pull the trigger. Let's walk through the process, the different scenarios, and how to minimize impact on your application.

## Understanding RDS Instance Classes

RDS instance classes follow a naming convention that tells you a lot at a glance:

- `db.r6g.xlarge` - **r** = memory-optimized, **6g** = generation 6 Graviton, **xlarge** = size
- `db.m6i.2xlarge` - **m** = general purpose, **6i** = generation 6 Intel, **2xlarge** = size
- `db.t4g.medium` - **t** = burstable, **4g** = generation 4 Graviton, **medium** = size

The main families:

- **T series (burstable)**: Good for development and low-traffic workloads. Uses CPU credits that can run out under sustained load.
- **M series (general purpose)**: Balanced compute, memory, and networking. Good default choice.
- **R series (memory optimized)**: More memory per vCPU. Best for workloads with large working sets that benefit from caching.
- **X series (memory intensive)**: Even more memory than R series. For extremely large databases that need to fit in RAM.

## Checking Your Current Instance

Before resizing, understand what you're working with:

```bash
# Check current instance details including class, storage, and engine
aws rds describe-db-instances \
  --db-instance-identifier my-database \
  --query 'DBInstances[0].{Class:DBInstanceClass,Engine:Engine,Storage:AllocatedStorage,StorageType:StorageType,MultiAZ:MultiAZ,Status:DBInstanceStatus}'
```

Also check your current resource usage to inform the sizing decision:

```bash
# Get CPU utilization over the last 24 hours
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=my-database \
  --start-time $(date -u -v-24H +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average Maximum \
  --output table
```

## Resizing the Instance Class

The actual resize is a single CLI command:

```bash
# Resize to a larger instance class - applied during next maintenance window
aws rds modify-db-instance \
  --db-instance-identifier my-database \
  --db-instance-class db.r6g.xlarge \
  --apply-immediately false
```

Or if you need it done right now:

```bash
# Resize immediately (causes downtime)
aws rds modify-db-instance \
  --db-instance-identifier my-database \
  --db-instance-class db.r6g.xlarge \
  --apply-immediately
```

## What Happens During a Resize

When you resize an RDS instance, here's the sequence:

1. AWS provisions a new host with the target instance class
2. Your database enters the "modifying" state
3. Data is migrated to the new host
4. The database restarts on the new hardware
5. The endpoint stays the same - no connection string changes needed

For **Single-AZ instances**, there's downtime during the switch. Typically 5-15 minutes, though it can be longer for very large instances.

For **Multi-AZ instances**, the process is smoother:
1. The standby is upgraded first
2. A failover occurs (20-30 seconds of downtime)
3. The old primary becomes the new standby and gets upgraded
4. Another failover brings traffic back to the original AZ

This is why running Multi-AZ for production databases is so important. The downtime drops from minutes to seconds.

## Minimizing Downtime

### Use Multi-AZ

If you're not already on Multi-AZ, enable it before resizing:

```bash
# Enable Multi-AZ (this itself requires a brief outage for Single-AZ to Multi-AZ conversion)
aws rds modify-db-instance \
  --db-instance-identifier my-database \
  --multi-az \
  --apply-immediately
```

Wait for the modification to complete before proceeding with the resize.

### Schedule During Low-Traffic Windows

If you're using `--apply-immediately false`, the resize happens during your maintenance window. Make sure that window is set to a low-traffic period:

```bash
# Check your current maintenance window
aws rds describe-db-instances \
  --db-instance-identifier my-database \
  --query 'DBInstances[0].PreferredMaintenanceWindow'

# Update the maintenance window if needed
aws rds modify-db-instance \
  --db-instance-identifier my-database \
  --preferred-maintenance-window "sun:03:00-sun:04:00"
```

### Prepare Your Application

Make sure your application handles brief connection interruptions gracefully:

```python
import time
import psycopg2
from psycopg2 import OperationalError

def get_connection(max_retries=5, base_delay=1):
    """Get a database connection with exponential backoff retry."""
    for attempt in range(max_retries):
        try:
            conn = psycopg2.connect(
                host='my-database.abc123.us-east-1.rds.amazonaws.com',
                dbname='myapp',
                user='admin',
                password='secret',
                connect_timeout=5
            )
            return conn
        except OperationalError as e:
            if attempt == max_retries - 1:
                raise
            delay = base_delay * (2 ** attempt)
            print(f"Connection failed, retrying in {delay}s: {e}")
            time.sleep(delay)
```

## Scaling Storage

Sometimes you don't need a bigger instance - you need more disk. RDS lets you increase storage independently:

```bash
# Increase allocated storage from 100GB to 200GB
aws rds modify-db-instance \
  --db-instance-identifier my-database \
  --allocated-storage 200 \
  --apply-immediately
```

Important limitations:
- You can only **increase** storage, never decrease it
- After a storage modification, you can't modify storage again for 6 hours
- Storage modifications have zero downtime - they happen in the background

### Changing Storage Type

You can also switch between storage types. For example, moving from gp2 to gp3 for better price-performance:

```bash
# Switch from gp2 to gp3 and set IOPS and throughput
aws rds modify-db-instance \
  --db-instance-identifier my-database \
  --storage-type gp3 \
  --iops 3000 \
  --storage-throughput 125 \
  --apply-immediately
```

gp3 lets you provision IOPS and throughput independently of storage size, which is more cost-effective than gp2 for many workloads.

## Scaling Down

Yes, you can scale down too. If you over-provisioned or traffic has decreased, moving to a smaller instance saves money:

```bash
# Scale down to a smaller instance class
aws rds modify-db-instance \
  --db-instance-identifier my-database \
  --db-instance-class db.r6g.large \
  --apply-immediately
```

The same downtime considerations apply when scaling down. Test thoroughly afterward to make sure the smaller instance can handle your workload.

## Monitoring After the Resize

After resizing, watch your metrics closely for at least 24 hours:

```bash
# Monitor key metrics after resize
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=my-database \
  --start-time $(date -u -v-2H +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

Things to check:

- **CPU utilization**: Should be lower after scaling up
- **Freeable memory**: Should be higher with a larger instance
- **Buffer cache hit ratio**: Should improve with more memory
- **Query latency**: Should decrease if the bottleneck was resource-related

For deeper analysis, use [Performance Insights](https://oneuptime.com/blog/post/2026-02-12-monitor-rds-with-performance-insights/view) to compare query performance before and after the resize. And make sure you have [CloudWatch alarms](https://oneuptime.com/blog/post/2026-02-12-set-up-cloudwatch-alarms-for-rds-metrics/view) set up to catch any issues that arise.

## When to Scale Up vs. Scale Out

Scaling up (bigger instance) is the right choice when:
- Most queries hit the primary database
- Your workload is write-heavy
- You need more memory for caching

Scaling out (adding read replicas) is better when:
- Read traffic significantly exceeds write traffic
- You can split reads to replicas in your application
- You want geographic distribution

Often the best approach is a combination - scale up the primary for writes and add replicas for reads. Consider enabling [storage auto scaling](https://oneuptime.com/blog/post/2026-02-12-enable-rds-storage-auto-scaling/view) as well so you don't have to manually manage disk space.
