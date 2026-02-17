# How to Create and Manage Read Replicas in Cloud SQL for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, MySQL, Read Replicas, Database Scaling

Description: Learn how to create, configure, and manage read replicas in Cloud SQL for MySQL to scale read-heavy workloads and improve application performance.

---

If your application is read-heavy - and most web applications are - read replicas let you distribute that load across multiple database instances. Cloud SQL for MySQL supports creating read replicas that asynchronously replicate from the primary instance. This post covers how to set them up, manage them, and use them effectively.

## How Read Replicas Work in Cloud SQL

Cloud SQL read replicas use MySQL's native binary log (binlog) replication. The primary instance writes changes to its binary log, and each replica reads those changes and applies them locally. This is asynchronous, meaning:

- Writes go to the primary and are replicated to replicas with a slight delay
- Replicas might be a few seconds behind the primary (replication lag)
- Replicas accept read queries but not write queries

```mermaid
graph LR
    A[Application - Writes] --> B[Primary Instance]
    B -->|Async Replication| C[Read Replica 1]
    B -->|Async Replication| D[Read Replica 2]
    B -->|Async Replication| E[Read Replica 3]
    F[Application - Reads] --> C
    F --> D
    F --> E
```

## Prerequisites

Before creating read replicas, your primary instance needs:

- Binary logging enabled (required for replication)
- Automated backups enabled (required for binary logging)
- A machine type of `db-g1-small` or larger (shared-core instances do not support replicas)

Check your current configuration:

```bash
# Verify that backups and binary logging are enabled
gcloud sql instances describe my-primary-instance \
    --format="json(settings.backupConfiguration)"
```

If backups are not enabled, turn them on:

```bash
# Enable automated backups (also enables binary logging)
gcloud sql instances patch my-primary-instance \
    --backup-start-time=02:00 \
    --enable-bin-log
```

## Creating a Read Replica

Create a replica with the gcloud CLI:

```bash
# Create a read replica of your primary instance
# The replica will be in the same region as the primary by default
gcloud sql instances create my-read-replica-1 \
    --master-instance-name=my-primary-instance \
    --tier=db-custom-2-8192 \
    --storage-type=SSD \
    --storage-size=100GB \
    --storage-auto-increase
```

The replica does not need to be the same machine type as the primary. You can use a smaller or larger tier depending on your read workload. However, if the replica is too small to keep up with the primary's write volume, replication lag will grow.

For Terraform users:

```hcl
# Terraform resource for a Cloud SQL read replica
resource "google_sql_database_instance" "read_replica" {
  name                 = "my-read-replica-1"
  master_instance_name = google_sql_database_instance.primary.name
  database_version     = "MYSQL_8_0"
  region               = "us-central1"

  replica_configuration {
    failover_target = false  # Not a failover target
  }

  settings {
    tier            = "db-custom-2-8192"
    disk_type       = "PD_SSD"
    disk_size       = 100
    disk_autoresize = true

    ip_configuration {
      ipv4_enabled    = false
      private_network = "projects/my-project/global/networks/my-vpc"
    }
  }
}
```

## Creating Multiple Replicas

You can create up to 10 read replicas per primary instance. Create them in parallel for faster setup:

```bash
# Create three read replicas in parallel using background processes
for i in 1 2 3; do
  gcloud sql instances create my-read-replica-${i} \
      --master-instance-name=my-primary-instance \
      --tier=db-custom-2-8192 \
      --storage-type=SSD \
      --storage-size=100GB \
      --async &
done

# Wait for all background jobs to finish
wait
echo "All replica creation requests submitted"
```

The `--async` flag returns immediately without waiting for the operation to complete. Each replica takes 5-10 minutes to create.

## Cross-Region Replicas

You can place replicas in a different region for disaster recovery or to serve reads closer to your users:

```bash
# Create a cross-region read replica
gcloud sql instances create my-replica-europe \
    --master-instance-name=my-primary-instance \
    --tier=db-custom-4-16384 \
    --region=europe-west1 \
    --storage-type=SSD \
    --storage-size=100GB
```

Cross-region replicas have higher replication lag due to network latency between regions, but they are valuable for:

- Disaster recovery (promote the replica if the primary's region goes down)
- Serving reads to users in that geographic area
- Running analytics queries without affecting the primary region

## Monitoring Replication Lag

Replication lag is the most important metric for read replicas. Monitor it closely:

```bash
# Check replication lag for a specific replica
gcloud sql instances describe my-read-replica-1 \
    --format="json(replicaConfiguration, state)"
```

You can also check lag from within MySQL on the replica:

```sql
-- Check replication status from within the replica
SHOW SLAVE STATUS\G

-- Key fields to look at:
-- Seconds_Behind_Master: Current replication lag in seconds
-- Slave_IO_Running: Should be "Yes"
-- Slave_SQL_Running: Should be "Yes"
```

Set up a Cloud Monitoring alert for replication lag:

```bash
# Create a monitoring alert for replication lag exceeding 30 seconds
gcloud monitoring policies create \
    --display-name="MySQL Replica Lag Alert" \
    --condition-display-name="Replication lag > 30s" \
    --condition-filter='resource.type = "cloudsql_database" AND metric.type = "cloudsql.googleapis.com/database/replication/replica_lag"' \
    --condition-threshold-value=30 \
    --condition-threshold-duration=300s \
    --notification-channels=projects/my-project/notificationChannels/12345
```

## Configuring Your Application for Read Replicas

Your application needs to know when to send queries to the primary versus replicas. Here is a common pattern using Python and SQLAlchemy:

```python
# Configure separate database engines for writes and reads
from sqlalchemy import create_engine

# Primary instance handles all writes
write_engine = create_engine(
    "mysql+pymysql://user:password@primary-ip:3306/mydb",
    pool_size=10,
    pool_pre_ping=True
)

# Read replicas handle all reads - use round-robin or random selection
import random

replica_urls = [
    "mysql+pymysql://user:password@replica-1-ip:3306/mydb",
    "mysql+pymysql://user:password@replica-2-ip:3306/mydb",
    "mysql+pymysql://user:password@replica-3-ip:3306/mydb",
]

read_engines = [
    create_engine(url, pool_size=10, pool_pre_ping=True)
    for url in replica_urls
]

def get_read_engine():
    """Return a random read replica engine for load distribution."""
    return random.choice(read_engines)
```

Some frameworks have built-in support for read/write splitting. Django, for example, supports database routers.

## Handling Replication Lag in Application Code

Since replication is asynchronous, a user might write data and then immediately read it from a replica that has not received the update yet. Handle this with a "read your own writes" pattern:

```python
# Read-your-own-writes pattern
# After a write, temporarily read from the primary to avoid stale data

import time

WRITE_TIMESTAMP = {}  # Track recent write times per user

def read_query(user_id, query):
    """Route reads to primary if a recent write occurred, otherwise use replica."""
    last_write = WRITE_TIMESTAMP.get(user_id, 0)
    seconds_since_write = time.time() - last_write

    # If the user wrote within the last 5 seconds, read from primary
    if seconds_since_write < 5:
        return write_engine.execute(query)
    else:
        return get_read_engine().execute(query)

def write_query(user_id, query):
    """Execute a write and track the timestamp."""
    result = write_engine.execute(query)
    WRITE_TIMESTAMP[user_id] = time.time()
    return result
```

## Scaling Replicas Up and Down

You can change a replica's machine type independently of the primary:

```bash
# Scale up a replica to handle more read traffic
gcloud sql instances patch my-read-replica-1 \
    --tier=db-custom-4-16384
```

You can also delete replicas you no longer need:

```bash
# Delete a read replica
gcloud sql instances delete my-read-replica-3
```

Deleting a replica does not affect the primary or other replicas.

## Promoting a Replica to a Standalone Instance

If your primary region fails or you need to split off a database, you can promote a replica:

```bash
# Promote a replica to a standalone primary instance
# This permanently breaks the replication link
gcloud sql instances promote-replica my-read-replica-1
```

After promotion:

- The replica becomes a standalone instance that accepts reads and writes
- Replication from the original primary stops permanently
- You cannot undo this - to re-establish replication, you would need to create a new replica

## Best Practices

1. **Size replicas appropriately**. If a replica cannot keep up with the primary's write throughput, lag will grow unboundedly. Monitor lag and scale up the replica if needed.

2. **Use at least two replicas** for redundancy. If one replica goes down for maintenance, you still have read capacity.

3. **Place a load balancer in front of replicas** if your application connects to them directly. An internal TCP load balancer works well for this.

4. **Do not use replicas for backups**. Replicas are for scaling reads, not for backup. Use Cloud SQL's built-in backup functionality.

5. **Test replica promotion** before you need it. Know how long it takes and what application changes are required.

## Summary

Read replicas in Cloud SQL for MySQL are a powerful way to scale read-heavy workloads. Create them with a single command, monitor replication lag, and configure your application to route reads to replicas and writes to the primary. For disaster recovery, cross-region replicas give you an additional safety net. Just remember that replication is asynchronous - plan your application logic accordingly.
