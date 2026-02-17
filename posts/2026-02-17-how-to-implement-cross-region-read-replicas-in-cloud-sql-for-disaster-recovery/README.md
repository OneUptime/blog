# How to Implement Cross-Region Read Replicas in Cloud SQL for Disaster Recovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, Read Replicas, Disaster Recovery, High Availability, Cross-Region

Description: Learn how to set up cross-region read replicas in Cloud SQL for disaster recovery, reduced read latency, and automated failover in multi-region architectures.

---

A single-region database is a single point of failure. If that region goes down - and it has happened - your database goes with it. Cross-region read replicas in Cloud SQL protect you from regional outages by maintaining a synchronized copy of your database in a different region. If the primary fails, you can promote a replica to become the new primary.

Beyond disaster recovery, cross-region replicas also serve read traffic closer to your users, reducing latency for geographically distributed applications.

## Architecture

```mermaid
graph TB
    subgraph "us-central1 (Primary)"
        Primary[Cloud SQL Primary<br>Read + Write]
    end
    subgraph "us-east1 (DR)"
        Replica1[Cross-Region Replica<br>Read Only]
    end
    subgraph "europe-west1 (DR)"
        Replica2[Cross-Region Replica<br>Read Only]
    end
    Primary -->|Async Replication| Replica1
    Primary -->|Async Replication| Replica2
    App1[App - US Central] --> Primary
    App2[App - US East] --> Replica1
    App3[App - Europe] --> Replica2
```

## Understanding Replication Types

Cloud SQL supports two types of replicas:

**Same-region replicas** provide high availability within a region. They use synchronous replication, so data is consistent.

**Cross-region replicas** provide disaster recovery and reduced read latency. They use asynchronous replication, which means there is a small lag between the primary and replica. Typically this lag is under a second, but it can increase during heavy write periods.

## Step 1: Set Up the Primary Instance

If you do not already have a primary instance, create one with the settings needed for cross-region replication.

```bash
# Create a Cloud SQL primary instance with HA enabled
gcloud sql instances create primary-db \
  --database-version=POSTGRES_15 \
  --tier=db-custom-4-16384 \
  --region=us-central1 \
  --availability-type=REGIONAL \
  --storage-type=SSD \
  --storage-size=100GB \
  --storage-auto-increase \
  --backup-start-time=02:00 \
  --enable-bin-log \
  --retained-backups-count=7 \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=4
```

Key flags:
- `--availability-type=REGIONAL` enables HA within the primary region
- `--enable-bin-log` is required for replication (automatically enabled with HA)
- `--backup-start-time` sets automated backup schedule

## Step 2: Create Cross-Region Replicas

Create read replicas in different regions for disaster recovery.

```bash
# Create a cross-region replica in us-east1
gcloud sql instances create replica-east \
  --master-instance-name=primary-db \
  --region=us-east1 \
  --tier=db-custom-4-16384 \
  --storage-type=SSD \
  --storage-size=100GB \
  --storage-auto-increase

# Create a cross-region replica in europe-west1
gcloud sql instances create replica-europe \
  --master-instance-name=primary-db \
  --region=europe-west1 \
  --tier=db-custom-4-16384 \
  --storage-type=SSD \
  --storage-size=100GB \
  --storage-auto-increase
```

The replica will start syncing immediately. Initial sync time depends on database size and network bandwidth between regions.

## Step 3: Monitor Replication Lag

Replication lag is the time difference between when a write happens on the primary and when it appears on the replica. Monitor this closely.

```bash
# Check replication status for a replica
gcloud sql instances describe replica-east \
  --format="value(replicaConfiguration)"

# Check the replication lag metric in Cloud Monitoring
gcloud monitoring metrics list --filter="metric.type=cloudsql.googleapis.com/database/replication/replica_lag"
```

You can also check from within PostgreSQL:

```sql
-- On the primary, check replication status
SELECT
  client_addr,
  state,
  sent_lsn,
  write_lsn,
  flush_lsn,
  replay_lsn,
  pg_wal_lsn_diff(sent_lsn, replay_lsn) AS replication_lag_bytes
FROM pg_stat_replication;
```

For MySQL:

```sql
-- On the replica, check replication lag
SHOW SLAVE STATUS\G
-- Look for Seconds_Behind_Master
```

## Step 4: Configure Application Read Routing

Route read queries to the nearest replica to reduce latency.

### Using Connection Strings

Give your application separate connection strings for the primary and each replica.

```python
# Python example with SQLAlchemy for read/write splitting
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Primary for writes
write_engine = create_engine(
    "postgresql://user:pass@primary-db-ip:5432/mydb",
    pool_size=10,
    max_overflow=20,
)

# Replica for reads - use the nearest replica
read_engine = create_engine(
    "postgresql://user:pass@replica-east-ip:5432/mydb",
    pool_size=20,
    max_overflow=40,
)

WriteSession = sessionmaker(bind=write_engine)
ReadSession = sessionmaker(bind=read_engine)

def get_user(user_id):
    """Read operations use the replica."""
    session = ReadSession()
    try:
        return session.query(User).filter_by(id=user_id).first()
    finally:
        session.close()

def update_user(user_id, data):
    """Write operations use the primary."""
    session = WriteSession()
    try:
        user = session.query(User).filter_by(id=user_id).first()
        for key, value in data.items():
            setattr(user, key, value)
        session.commit()
    finally:
        session.close()
```

### Using Cloud SQL Proxy with Multiple Instances

```bash
# Start Cloud SQL proxy for both primary and replica
cloud-sql-proxy \
  MY_PROJECT:us-central1:primary-db=tcp:5432 \
  MY_PROJECT:us-east1:replica-east=tcp:5433 &
```

Your application connects to `localhost:5432` for writes and `localhost:5433` for reads.

## Step 5: Set Up Disaster Recovery Failover

When the primary region fails, you need to promote a replica to become the new primary. This is a manual process in Cloud SQL - there is no automatic cross-region failover.

### Promoting a Replica

```bash
# Promote the east replica to become a standalone primary
gcloud sql instances promote-replica replica-east
```

After promotion:
- The replica becomes an independent primary instance
- It accepts both reads and writes
- Replication from the old primary stops
- The old primary (if it comes back) is no longer connected

### Updating Application Configuration

After promotion, update your application to point to the new primary:

```bash
# Get the new primary's IP address
gcloud sql instances describe replica-east \
  --format="value(ipAddresses[0].ipAddress)"
```

Update your DNS records or connection strings to point to the promoted instance.

### Building a Failover Runbook

Document the steps so anyone on the team can execute failover under pressure.

```bash
#!/bin/bash
# disaster-recovery-failover.sh
# Run this when the primary region is unavailable

echo "Step 1: Verify primary is unreachable"
gcloud sql instances describe primary-db || echo "PRIMARY UNREACHABLE"

echo "Step 2: Check replica lag before promotion"
gcloud sql instances describe replica-east

echo "Step 3: Promote replica to primary"
gcloud sql instances promote-replica replica-east

echo "Step 4: Wait for promotion to complete"
while true; do
  STATUS=$(gcloud sql instances describe replica-east --format="value(state)")
  if [ "$STATUS" = "RUNNABLE" ]; then
    echo "Promotion complete"
    break
  fi
  echo "Waiting... current status: $STATUS"
  sleep 10
done

echo "Step 5: Get new primary IP"
gcloud sql instances describe replica-east \
  --format="value(ipAddresses[0].ipAddress)"

echo "Step 6: Update DNS/config to point to new primary"
echo "MANUAL: Update your application configuration"

echo "Step 7: Create new replicas for the promoted instance"
gcloud sql instances create new-replica-west \
  --master-instance-name=replica-east \
  --region=us-west1 \
  --tier=db-custom-4-16384
```

## Step 6: Test Your DR Plan

Testing disaster recovery is as important as setting it up. Run a DR drill regularly.

```bash
# Create a test replica for DR drilling (do not use production replicas)
gcloud sql instances create dr-test-replica \
  --master-instance-name=primary-db \
  --region=us-east1 \
  --tier=db-custom-2-8192

# Wait for it to sync
# Then promote it
gcloud sql instances promote-replica dr-test-replica

# Run your application's smoke tests against the promoted replica
# When done, delete the test instance
gcloud sql instances delete dr-test-replica
```

## Cost Considerations

Cross-region replicas are not free. You pay for:

- The replica instance (same pricing as a standalone instance of the same tier)
- Cross-region replication network traffic (egress charges)
- Storage for the replica

A rough estimate for a db-custom-4-16384 instance: about $300-400/month per replica plus network egress. For DR, this is typically worthwhile insurance.

### Optimizing Costs

- **Match replica tier to workload.** If the replica is only for DR (not serving reads), you can use a smaller tier and scale up during failover.
- **Use a single cross-region replica** instead of multiple if budget is tight. One replica in a different region still protects against regional failures.
- **Monitor replica utilization.** If replicas are serving reads, right-size them based on actual load.

## Monitoring and Alerting

Set up alerts for replication health:

```bash
# Alert when replication lag exceeds 30 seconds
gcloud monitoring policies create \
  --display-name="High Replication Lag" \
  --condition-display-name="Replica lag > 30s" \
  --condition-filter='resource.type="cloudsql_database" AND metric.type="cloudsql.googleapis.com/database/replication/replica_lag"' \
  --condition-threshold-value=30 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=300s \
  --notification-channels=CHANNEL_ID
```

## Wrapping Up

Cross-region read replicas in Cloud SQL give you disaster recovery and geographic read distribution in one feature. The setup is straightforward - create a replica in another region and it starts syncing automatically. The harder part is the operational practice: monitoring replication lag, maintaining a tested failover runbook, and ensuring your application can switch to the new primary quickly. Run DR drills quarterly at minimum, and make sure more than one person on the team knows how to execute the failover. When a real regional outage happens, you want the failover to be a well-practiced procedure, not a panicked improvisation.
