# How to Set Up High Availability for a Cloud SQL Instance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, High Availability, Failover, Database Reliability

Description: Learn how to configure high availability for Cloud SQL instances to ensure automatic failover and minimal downtime for your production databases.

---

Database downtime is the kind of problem that wakes you up at 3 AM. High availability in Cloud SQL helps prevent that by maintaining a standby replica in a different zone that can take over automatically if the primary goes down. This guide walks through setting it up, understanding how it works, and what to expect during failover.

## How Cloud SQL HA Works

Cloud SQL high availability uses a regional configuration. When you enable HA, Google creates two instances:

1. **Primary instance** - Serves all read and write traffic
2. **Standby instance** - Sits in a different zone in the same region, receives synchronous replication from the primary

The key word here is "synchronous." Every write to the primary must be acknowledged by the standby before it is committed. This means:

- Zero data loss during failover (RPO = 0)
- Slightly higher write latency compared to a non-HA instance
- Automatic failover typically completes in about 60-120 seconds

```mermaid
graph TD
    A[Application] --> B[Primary Instance - Zone A]
    B -->|Synchronous Replication| C[Standby Instance - Zone B]
    D[Health Check] --> B
    D --> C
    D -->|Primary fails| E[Failover: Standby becomes Primary]
```

## Creating a New HA Instance

The simplest approach is to create the instance with HA from the start.

Using gcloud:

```bash
# Create a Cloud SQL instance with high availability enabled
gcloud sql instances create myapp-db \
    --database-version=POSTGRES_15 \
    --tier=db-custom-4-16384 \
    --region=us-central1 \
    --availability-type=REGIONAL \
    --storage-type=SSD \
    --storage-size=100GB \
    --storage-auto-increase \
    --backup-start-time=02:00 \
    --enable-point-in-time-recovery \
    --root-password=your-secure-password
```

The flag that matters is `--availability-type=REGIONAL`. Setting it to `ZONAL` gives you a single-zone instance without HA.

Using Terraform:

```hcl
# Terraform resource for a Cloud SQL HA instance
resource "google_sql_database_instance" "main" {
  name             = "myapp-db"
  database_version = "POSTGRES_15"
  region           = "us-central1"

  settings {
    tier              = "db-custom-4-16384"
    availability_type = "REGIONAL"  # This enables HA

    backup_configuration {
      enabled                        = true
      start_time                     = "02:00"
      point_in_time_recovery_enabled = true
      retained_backups               = 14
    }

    disk_type       = "PD_SSD"
    disk_size       = 100
    disk_autoresize = true

    ip_configuration {
      ipv4_enabled    = false
      private_network = "projects/my-project/global/networks/my-vpc"
    }
  }

  deletion_protection = true
}
```

## Enabling HA on an Existing Instance

If you already have a single-zone (ZONAL) instance, you can convert it to HA:

```bash
# Convert an existing instance to high availability
# This will cause a brief restart of the instance
gcloud sql instances patch myapp-db \
    --availability-type=REGIONAL
```

Be aware that this operation causes a brief outage while the standby is provisioned and initial sync completes. Plan to do this during a maintenance window.

## What Triggers Failover

Cloud SQL monitors the primary instance and triggers automatic failover when:

- The primary instance becomes unresponsive
- The zone hosting the primary experiences an outage
- The primary instance crashes

You can also trigger a manual failover for testing:

```bash
# Manually trigger a failover for testing
# The standby becomes the new primary, and a new standby is created
gcloud sql instances failover myapp-db
```

This is valuable for testing your application's behavior during failover. I recommend running a manual failover in staging before you ever need a real one.

## What Happens During Failover

During a failover event, here is the sequence:

1. Cloud SQL detects the primary is unhealthy
2. The standby is promoted to primary
3. The instance's IP address stays the same (critical for your application)
4. A new standby is created in the original primary's zone
5. Synchronous replication resumes from the new primary to the new standby

The failover typically takes 60-120 seconds. During this time:

- Existing connections are dropped
- New connections are refused
- Your application must handle reconnection

## Application-Side Considerations

Your application needs to handle failover gracefully. Here are the key practices.

### Connection Retry Logic

Implement exponential backoff for database connections:

```python
# Python example with retry logic for Cloud SQL failover
import time
import psycopg2
from psycopg2 import OperationalError

def get_connection(max_retries=5):
    """Connect to the database with retry logic for failover handling."""
    retry_count = 0
    base_delay = 1  # Start with 1 second delay

    while retry_count < max_retries:
        try:
            conn = psycopg2.connect(
                host="127.0.0.1",
                port=5432,
                dbname="myapp",
                user="myapp_user",
                password="password",
                connect_timeout=5
            )
            return conn
        except OperationalError as e:
            retry_count += 1
            delay = base_delay * (2 ** retry_count)  # Exponential backoff
            print(f"Connection failed (attempt {retry_count}): {e}")
            print(f"Retrying in {delay} seconds...")
            time.sleep(delay)

    raise Exception("Could not connect after maximum retries")
```

### Connection Pooling

Use a connection pool that can detect stale connections and replace them:

```python
# Using SQLAlchemy with connection pool health checks
from sqlalchemy import create_engine

engine = create_engine(
    "postgresql://myapp_user:password@127.0.0.1:5432/myapp",
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,  # Check connection health before using it
    pool_recycle=1800,    # Recycle connections every 30 minutes
    connect_args={"connect_timeout": 5}
)
```

The `pool_pre_ping=True` setting is important - it sends a lightweight query to verify the connection is alive before handing it to your application.

## Monitoring HA Status

Set up monitoring to track your HA instance's health:

```bash
# Check the current state of your instance
gcloud sql instances describe myapp-db \
    --format="json(state, settings.availabilityType, failoverReplica)"
```

Key Cloud Monitoring metrics to watch:

- `database/replication/replica_lag` - Should be near zero for HA
- `database/instance_state` - Tracks if the instance is running
- `database/uptime` - Resets after a failover

Create an alert policy for replication lag:

```bash
# Create an alerting policy for replication lag
gcloud monitoring policies create \
    --notification-channels=projects/my-project/notificationChannels/12345 \
    --display-name="Cloud SQL HA Replication Lag" \
    --condition-display-name="Replication lag > 5s" \
    --condition-filter='resource.type = "cloudsql_database" AND metric.type = "cloudsql.googleapis.com/database/replication/replica_lag"' \
    --condition-threshold-value=5 \
    --condition-threshold-duration=60s
```

## Cost Impact

High availability roughly doubles your instance cost because you are running two instances. For a `db-custom-4-16384` instance:

- Without HA: ~$300/month
- With HA: ~$600/month

Storage costs are also doubled since the standby maintains its own copy of the data.

This is a significant cost increase, so consider whether every database needs HA. Development and staging environments usually do not. But for production databases where downtime has a real business cost, HA pays for itself the first time it saves you from an outage.

## HA vs Read Replicas

People sometimes confuse high availability with read replicas. They serve different purposes:

| Feature | High Availability | Read Replicas |
|---------|------------------|---------------|
| Purpose | Automatic failover | Read scaling |
| Replication | Synchronous | Asynchronous |
| Data loss risk | None (RPO = 0) | Possible lag |
| Can serve traffic | No (standby only) | Yes (read queries) |
| Failover | Automatic | Manual promotion |
| Same region | Yes (different zone) | Same or different region |

You can - and often should - use both. HA protects against zone failures, while read replicas help distribute read load and can serve as disaster recovery in another region.

## Testing Your HA Setup

Before you rely on HA in production, test it:

1. **Run a manual failover** and measure how long your application is unavailable
2. **Monitor connections during failover** to verify your retry logic works
3. **Check data consistency** after failover to confirm no writes were lost
4. **Test multiple failovers** back-to-back to make sure the cycle works

```bash
# Trigger a failover and monitor the instance state
gcloud sql instances failover myapp-db

# Watch the instance state until it returns to RUNNABLE
watch -n 5 "gcloud sql instances describe myapp-db --format='value(state)'"
```

## Summary

High availability in Cloud SQL is straightforward to enable but requires thoughtful application design to take full advantage of. Enable it with `--availability-type=REGIONAL`, implement retry logic in your application, monitor replication lag, and test failover before you need it for real. The cost is roughly double, but for production databases, the protection against zone-level failures is worth every penny.
