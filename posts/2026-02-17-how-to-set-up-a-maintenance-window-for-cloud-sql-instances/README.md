# How to Set Up a Maintenance Window for Cloud SQL Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, Maintenance Window, Database Management, Operation

Description: Learn how to configure maintenance windows for Cloud SQL instances to control when Google applies updates, minimizing disruption to your applications.

---

Google periodically applies maintenance updates to Cloud SQL instances - things like minor version upgrades, security patches, and infrastructure updates. If you do not set a maintenance window, Cloud SQL uses its default maintenance windows, which might not match your application's lowest-traffic period. Setting up a maintenance window lets you control when these updates occur. This guide covers how to configure it, what to expect during maintenance, and how to minimize the impact.

## What Happens During Maintenance

During a maintenance event, Google updates the underlying infrastructure or database software. Here is what typically happens:

1. The instance becomes unavailable briefly while Cloud SQL moves it to updated infrastructure
2. For Cloud SQL Enterprise edition instances, connectivity loss is typically less than 30 seconds on average; Cloud SQL Enterprise Plus edition can provide sub-second downtime for planned maintenance
3. The instance restarts with the updated software
4. Existing connections are dropped and must be re-established

Maintenance is mandatory - you cannot skip it indefinitely. What you can control is when it happens.

## Types of Maintenance

Cloud SQL has two maintenance categories:

**Scheduled maintenance** includes planned updates like minor database version upgrades and security patches. These respect your maintenance window unless the update is time-sensitive.

**Emergency maintenance** is for critical security fixes that cannot wait. These are rare but can happen outside your maintenance window.

## Configuring a Maintenance Window

### Using gcloud CLI

Set a maintenance window to occur on Sundays at 3 AM UTC:

```bash
# Set the maintenance window to Sunday at 3 AM UTC

# day: SUN, MON, TUE, WED, THU, FRI, SAT
# hour: 0-23 (UTC)
gcloud sql instances patch my-instance \
    --maintenance-window-day=SUN \
    --maintenance-window-hour=3
```

The maintenance window is a 1-hour block. Google will start maintenance sometime during that hour, but the actual disruption is usually much shorter.

### Using Terraform

```hcl
# Terraform configuration with maintenance window
resource "google_sql_database_instance" "main" {
  name             = "production-db"
  database_version = "POSTGRES_15"
  region           = "us-central1"

  settings {
    tier = "db-custom-4-16384"

    maintenance_window {
      day          = 7  # Sunday (1=Monday, 7=Sunday)
      hour         = 3  # 3 AM UTC
      update_track = "stable"  # or "canary" or "week5"
    }
  }
}
```

### Using the Console

In the Google Cloud Console:

1. Go to SQL in the left navigation
2. Click on your instance
3. Click Edit
4. Expand the Maintenance section
5. Set the preferred day and hour
6. Choose the update track
7. Click Save

## Choosing the Right Window

Pick a time that meets these criteria:

- **Lowest traffic period** for your application
- **Adequate staffing** - someone should be available to respond if something goes wrong
- **Not conflicting with other scheduled tasks** like batch jobs, reports, or deployments

For a US-focused application, Sunday 3-5 AM UTC (Saturday 10 PM - midnight EST) is a common choice. For global applications, analyze your traffic patterns to find the true low point.

```bash
# Check your instance's recent connection patterns
# Look at the Cloud Monitoring console for the metric:
# MySQL / SQL Server: cloudsql.googleapis.com/database/network/connections
# PostgreSQL: cloudsql.googleapis.com/database/postgresql/num_backends
# Find the time with consistently lowest connection counts
```

## Update Tracks

Cloud SQL offers three maintenance timing options. In Terraform and the REST API these are called update tracks:

### Stable Track

- Receives updates in Week 2 of the rollout, after the canary track
- More conservative - lower risk of issues
- Recommended for production

### Canary Track

- Receives updates in Week 1 of the rollout, before the stable track
- Gets new features and patches sooner
- Slightly higher risk since updates are newer

### Week 5 Track

- Receives updates in Week 5 of the rollout
- Gives you more time after the maintenance notification to prepare
- Useful for production environments that need a longer validation period

Configure the maintenance timing with gcloud:

```bash
# Set the maintenance timing to production / Week 2 (recommended for production)
gcloud sql instances patch my-instance \
    --maintenance-release-channel=production

# Or use the preview / Week 1 channel to get updates sooner
gcloud sql instances patch my-instance \
    --maintenance-release-channel=preview

# Or use Week 5 to receive updates later in the rollout
gcloud sql instances patch my-instance \
    --maintenance-release-channel=week5
```

For most production databases, use production / stable timing. Use preview / canary for staging or development environments where you want to validate updates before they hit production.

## Maintenance Denial Periods

If you have a critical business period - like Black Friday for an e-commerce site - you can set a deny maintenance period:

```bash
# Deny maintenance during a specific period
# For example, deny from November 25 to December 2
gcloud sql instances patch my-instance \
    --deny-maintenance-period-start-date=2026-11-25 \
    --deny-maintenance-period-end-date=2026-12-02 \
    --deny-maintenance-period-time=00:00:00
```

Deny periods can be up to 90 days. Use them sparingly - delaying maintenance too long can leave you exposed to unpatched vulnerabilities.

## Minimizing Maintenance Impact

### Enable High Availability

High availability helps protect against zonal and instance failures, and is still recommended for production databases. For planned maintenance downtime, the edition matters: Cloud SQL Enterprise edition instances typically lose connectivity for less than 30 seconds on average, while Enterprise Plus edition supports near-zero downtime planned maintenance.

```bash
# Enable HA for regional availability
gcloud sql instances patch my-instance \
    --availability-type=REGIONAL
```

Applications should still be prepared for dropped connections during maintenance and failover events.

### Implement Connection Retry Logic

Your application should handle connection drops gracefully:

```python
# Python retry logic for handling maintenance-related disconnections
import time
import psycopg2
from psycopg2 import OperationalError

def execute_with_retry(query, params=None, max_retries=5):
    """Execute a query with retry logic for maintenance events."""
    for attempt in range(max_retries):
        try:
            conn = psycopg2.connect(
                host="127.0.0.1",
                port=5432,
                dbname="mydb",
                user="app_user",
                password="password",
                connect_timeout=5
            )
            with conn.cursor() as cur:
                cur.execute(query, params)
                if cur.description:
                    result = cur.fetchall()
                else:
                    conn.commit()
                    result = None
                return result
        except OperationalError as e:
            wait_time = min(2 ** attempt, 30)  # Cap at 30 seconds
            print(f"Database connection error (attempt {attempt + 1}): {e}")
            print(f"Retrying in {wait_time} seconds...")
            time.sleep(wait_time)

    raise Exception("Failed to execute query after maximum retries")
```

### Use Connection Pooling with Health Checks

Connection pools that validate connections before use handle maintenance transparently:

```python
# SQLAlchemy with pool_pre_ping to detect dropped connections
from sqlalchemy import create_engine

engine = create_engine(
    "postgresql://user:pass@127.0.0.1:5432/mydb",
    pool_pre_ping=True,       # Validate connections before use
    pool_recycle=600,          # Recycle connections every 10 minutes
    pool_size=10,
    max_overflow=20,
    connect_args={
        "connect_timeout": 5,
        "options": "-c statement_timeout=30000"
    }
)
```

## Monitoring Maintenance Events

### Check Upcoming Maintenance

```bash
# Check if any maintenance is scheduled for your instance
gcloud sql instances describe my-instance \
    --format="json(scheduledMaintenance)"
```

### Set Up Notifications

Opt in to notifications and check upcoming maintenance before it occurs:

```bash
# Maintenance notifications are email opt-in.
# You can also view upcoming maintenance events in Logs Explorer
# by selecting the maintenance-events log name.
gcloud logging read \
    'logName:"maintenance-events" AND resource.type="cloudsql_database"' \
    --limit=10
```

You can opt in to Cloud SQL maintenance emails from the Google Cloud Console Communication page. Each user who needs email notifications must opt in separately, and the instance must have a maintenance window.

### Review Past Maintenance

Check what maintenance was performed:

```bash
# List recent operations including maintenance events
gcloud sql operations list \
    --instance=my-instance \
    --filter="operationType=MAINTENANCE" \
    --limit=10
```

## Maintenance for Read Replicas

Cloud SQL maintains read replicas before the primary instance. If the primary has a maintenance window, read replicas observe the same maintenance window:

```bash
# Set a maintenance window for a read replica instance
gcloud sql instances patch my-replica-1 \
    --maintenance-window-day=SUN \
    --maintenance-window-hour=4
```

If a primary has multiple read replicas, Cloud SQL might update some of the replicas at the same time. Do not rely on staggered replica windows to guarantee that only one replica is maintained at once; make sure the application can tolerate individual replica unavailability.

```bash
# Check recent maintenance operations
gcloud sql operations list \
    --instance=my-instance \
    --filter="operationType=MAINTENANCE" \
    --limit=10
```

## Maintenance Window Best Practices

1. **Always set a maintenance window for production instances**. Do not rely on the default maintenance windows.

2. **Use production / stable maintenance timing** for production databases. Let preview / canary environments catch issues first.

3. **Enable HA** for production availability. Still plan for maintenance-related connection drops.

4. **Test maintenance behavior in staging** by triggering a manual restart during your maintenance window.

5. **Communicate maintenance windows** to your team. Everyone should know when database maintenance might occur.

6. **Plan for maintenance in your SLO budget**. Cloud SQL maintenance is predictable, so factor it into your availability calculations.

7. **Avoid overlapping windows across unrelated critical instances**. Primary read replicas observe the primary instance's maintenance window.

## Summary

Setting up a maintenance window for Cloud SQL is a simple configuration change that gives you control over when updates happen. Pick a low-traffic time, use production / stable maintenance timing, enable HA for production availability, and make sure your application has retry logic for connection drops. Maintenance is inevitable, but with the right setup, it should be invisible to your users.
