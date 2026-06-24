# Troubleshoot Cloud SQL High Availability Failover Not Completing Successfully

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, High Availability, Failover, Database, Disaster Recovery

Description: How to diagnose and resolve Cloud SQL high availability failover failures, including stuck failovers, split-brain scenarios, and recovery procedures.

---

You configured Cloud SQL with high availability expecting that if the primary goes down, the standby takes over automatically. But then the failover actually triggers and something goes wrong - it gets stuck, takes forever, or completes but your application cannot connect. Here is what to check and how to fix it.

## How Cloud SQL HA Failover Works

Cloud SQL high availability uses a regional instance configuration with a primary and standby in different zones within the same region. Writes are synchronously replicated to regional persistent disks in both zones before a transaction is reported as committed. When the primary becomes unhealthy, Cloud SQL automatically fails over to the standby. The standby becomes the primary and serves traffic through the same shared static IP address.

The expected failover downtime is about 60 seconds, though it can differ depending on the Cloud SQL environment.

## Checking Failover Status

```bash
# Check instance state and HA configuration

gcloud sql instances describe my-instance \
    --project=my-project \
    --format="json(state, settings.availabilityType, gceZone, secondaryGceZone)"
```

Check the operations log for failover events:

```bash
# List recent operations including failover attempts
gcloud sql operations list \
    --instance=my-instance \
    --project=my-project \
    --limit=10 \
    --format="table(name, operationType, status, startTime, endTime, error)"
```

Look for operations with type `FAILOVER` and check their status.

## Common Failure Scenarios

### Scenario 1: Failover Stuck in PENDING or RUNNING

The failover operation was triggered but is not completing.

```bash
# Check if there is a stuck operation
gcloud sql operations list \
    --instance=my-instance \
    --project=my-project \
    --filter="status=RUNNING" \
    --format="table(name, operationType, status, startTime)"
```

If a failover has been running for more than 10 minutes, it is likely stuck. Common causes:

- The primary instance is not in a normal operating state, such as during maintenance or another long-running Cloud SQL operation
- The secondary zone or standby instance is unhealthy, which blocks failover until Cloud SQL repairs it
- Crash recovery or workload pressure is making the instance take longer to become available again

There is not much you can do to speed up a stuck failover except wait. If it has been stuck for over 30 minutes, contact Google Cloud support.

### Scenario 2: Application Cannot Connect After Failover

The failover completed but your application still cannot reach the database.

```bash
# Verify the instance is running and check its IP
gcloud sql instances describe my-instance \
    --project=my-project \
    --format="table(state, ipAddresses)"
```

The IP address should stay the same after failover. If your application cannot connect, check:

```bash
# Test connectivity to the instance
gcloud sql connect my-instance --user=DB_USER --project=my-project
```

Common connection issues after failover:

1. **DNS cache** - your application might be caching the old DNS resolution. Restart application pods or clear DNS cache.
2. **Connection pool** - existing connections in your pool are to the old primary and are now dead. Your connection pool needs to detect and replace them.
3. **Cloud SQL Proxy** - if using the proxy, it should automatically reconnect, but sometimes needs a restart.

Fix the connection pool to handle failovers gracefully:

```python
# SQLAlchemy configuration that handles failovers
from sqlalchemy import create_engine

engine = create_engine(
    "postgresql://user:pass@127.0.0.1:5432/mydb",
    # Test connections before using them - catches dead connections after failover
    pool_pre_ping=True,
    # Recycle connections periodically to avoid stale connections
    pool_recycle=300,
    # Set a connection timeout so the app does not hang waiting
    connect_args={"connect_timeout": 10},
)
```

### Scenario 3: Failover Completed But Data Appears Missing

Because current Cloud SQL HA uses synchronous replication to regional persistent disks, committed transactions should not be lost during failover. However, transactions that were in progress when existing connections were closed can be rolled back, and applications that read from separate read replicas might briefly see stale data.

If the missing data was observed through a read replica, check whether that replica had replication lag around the time of failover:

```bash
# Check Cloud Monitoring for read replica lag around the time of failover
gcloud monitoring time-series list \
    --project=my-project \
    --filter='resource.type="cloudsql_database" AND resource.labels.database_id="my-project:my-replica" AND metric.type="cloudsql.googleapis.com/database/replication/replica_lag"' \
    --interval-start-time=$(date -u -d '2 hours ago' +%Y-%m-%dT%H:%M:%SZ) \
    --format="table(points.value.doubleValue, points.interval.endTime)"
```

For the primary HA instance itself, look for application errors or rolled-back transactions around the time existing connections were closed.

### Scenario 4: Failover Keeps Triggering Repeatedly

If the instance keeps failing over back and forth, it usually indicates an underlying resource issue that affects both zones.

```bash
# Check for repeated failover operations
gcloud sql operations list \
    --instance=my-instance \
    --project=my-project \
    --filter="operationType=FAILOVER" \
    --limit=20 \
    --format="table(startTime, status, error)"
```

Common causes of repeated failovers:

- Instance is undersized and keeps running out of CPU or memory
- Storage is full or nearly full
- A problematic query or workload is crashing the database process

Check the error logs:

```bash
# Check Cloud SQL error logs around failover times
gcloud logging read \
    'resource.type="cloudsql_database" AND resource.labels.database_id="my-project:my-instance" AND severity>=ERROR' \
    --project=my-project \
    --limit=30 \
    --format="table(timestamp, textPayload)"
```

## Manual Failover Testing

You should periodically test failover to make sure it works before you need it in an actual outage.

```bash
# Trigger a manual failover (this will cause brief downtime)
gcloud sql instances failover my-instance \
    --project=my-project
```

During the test, monitor:
- How long the failover takes
- Whether your application reconnects automatically
- Whether any in-flight transactions were rolled back

## Ensuring Your Application Handles Failovers

Your application needs retry logic for database connections:

```python
import time
import psycopg2
from psycopg2 import OperationalError

def connect_with_retry(dsn, max_retries=10, base_delay=1):
    """Connect to the database with exponential backoff retry."""
    for attempt in range(max_retries):
        try:
            conn = psycopg2.connect(dsn)
            return conn
        except OperationalError as e:
            if attempt == max_retries - 1:
                raise
            delay = base_delay * (2 ** attempt)
            print(f"Connection failed (attempt {attempt + 1}), retrying in {delay}s: {e}")
            time.sleep(delay)
```

## Failover Readiness Checklist

```mermaid
flowchart TD
    A[HA Failover Readiness] --> B[Verify HA is enabled]
    A --> C[Test failover manually]
    A --> D[Configure app retry logic]
    A --> E[Enable pool_pre_ping]
    A --> F[Set up monitoring alerts]
    A --> G[Document recovery procedure]
    C --> H{Failover near 60s?}
    H -->|No| I[Investigate - check instance state and workload pressure]
    H -->|Yes| J[Document actual failover time]
```

## Key Takeaways

- Always test failover before you need it in production
- Configure your application's connection pool with `pool_pre_ping` or equivalent health checks
- Implement retry logic with exponential backoff for database connections
- Monitor read replica lag separately if your application reads from replicas
- Keep your instance properly sized to avoid resource-related cascading failovers
- Check the operations log for detailed failure information when failovers do not complete

High availability is not set-and-forget. It requires your application to cooperate with the failover process, and it requires regular testing to make sure everything works together.
