# Use Automatic Failover for Cloud SQL PostgreSQL with Cross-Region Read Replicas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, PostgreSQL, Failover, High Availability, Cross-Region Replication

Description: Set up automatic failover for Cloud SQL PostgreSQL using cross-region read replicas to ensure database availability during regional outages with minimal data loss.

---

Your database is the most critical piece of your infrastructure. When it goes down, everything goes down. Cloud SQL provides high availability within a single region using synchronous replication to a standby instance. But what happens when the entire region has an outage? That is where cross-region read replicas come in. By maintaining a replica in a different region, you have a warm standby that can be promoted to a primary if disaster strikes.

In this guide, I will show you how to set up cross-region read replicas for Cloud SQL PostgreSQL, designate a disaster recovery replica when you are using Cloud SQL Enterprise Plus, and handle the application-level routing changes needed to make failover as smooth as possible.

## Setting Up the Primary Instance

Start with a properly configured primary instance with high availability enabled.

```bash
# Create the primary Cloud SQL instance with HA enabled

gcloud sql instances create primary-db \
  --database-version=POSTGRES_15 \
  --tier=db-custom-4-16384 \
  --region=us-central1 \
  --availability-type=REGIONAL \
  --edition=ENTERPRISE_PLUS \
  --storage-type=SSD \
  --storage-size=100GB \
  --storage-auto-increase \
  --backup-start-time=02:00 \
  --enable-point-in-time-recovery \
  --retained-backups-count=14 \
  --retained-transaction-log-days=7

# Create the application database
gcloud sql databases create myapp --instance=primary-db

# Create the application user
gcloud sql users create app_user \
  --instance=primary-db \
  --password=your-secure-password
```

## Creating Cross-Region Read Replicas

Create read replicas in different regions for disaster recovery and read scaling.

```bash
# Create a read replica in Europe
gcloud sql instances create replica-europe \
  --master-instance-name=primary-db \
  --region=europe-west1 \
  --database-version=POSTGRES_15 \
  --tier=db-custom-4-16384 \
  --availability-type=REGIONAL \
  --edition=ENTERPRISE_PLUS \
  --storage-type=SSD

# Create a read replica in Asia
gcloud sql instances create replica-asia \
  --master-instance-name=primary-db \
  --region=asia-east1 \
  --database-version=POSTGRES_15 \
  --tier=db-custom-4-16384 \
  --availability-type=ZONAL \
  --edition=ENTERPRISE_PLUS \
  --storage-type=SSD

# Verify replica status
gcloud sql instances describe replica-europe --format='value(masterInstanceName,databaseReplicationEnabled)'
gcloud sql instances describe replica-asia --format='value(masterInstanceName,databaseReplicationEnabled)'
```

## Designating a Failover Replica

With Cloud SQL Enterprise Plus, mark one cross-region read replica as the disaster recovery (DR) replica. Standard read replicas are promoted manually and intentionally; they are not automatic HA failover targets.

```bash
# Set the European replica as the designated DR replica for the primary
gcloud sql instances patch primary-db \
  --failover-dr-replica-name=replica-europe

# Verify the DR replica is set
gcloud sql instances describe primary-db \
  --format='value(settings.replicationCluster.failoverDrReplicaName)'
gcloud sql instances describe replica-europe \
  --format='table(name,region,drReplica)'
```

## Application Connection Architecture

Your application needs to handle connecting to the right instance. Use a connection management layer that knows about the primary and replicas.

```python
# db_connection.py - Connection manager with failover support
import os
import logging
from contextlib import contextmanager
from sqlalchemy import create_engine, engine, text

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Manages database connections with failover support."""

    def __init__(self):
        # Primary connection for writes
        self.primary_engine = self._create_engine(
            os.environ['PRIMARY_DB_HOST'],
            os.environ['DB_NAME'],
            os.environ['DB_USER'],
            os.environ['DB_PASS'],
        )

        # Read replica connections for reads
        self.replica_engines = []
        for replica_host in os.environ.get('REPLICA_HOSTS', '').split(','):
            if replica_host.strip():
                engine = self._create_engine(
                    replica_host.strip(),
                    os.environ['DB_NAME'],
                    os.environ['DB_USER'],
                    os.environ['DB_PASS'],
                )
                self.replica_engines.append(engine)

        self._replica_index = 0

    def _create_engine(self, host, database, user, password):
        """Create a SQLAlchemy engine with connection pooling."""
        return create_engine(
            engine.URL.create(
                drivername='postgresql+pg8000',
                username=user,
                password=password,
                database=database,
                query={'unix_sock': f'/cloudsql/{host}/.s.PGSQL.5432'},
            ),
            pool_size=10,
            max_overflow=5,
            pool_timeout=30,
            pool_recycle=1800,
            pool_pre_ping=True,  # Verify connections before using them
        )

    @contextmanager
    def write_connection(self):
        """Get a connection to the primary for write operations."""
        conn = self.primary_engine.connect()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    @contextmanager
    def read_connection(self):
        """Get a connection to a read replica with round-robin selection."""
        if not self.replica_engines:
            # Fall back to primary if no replicas are configured
            with self.write_connection() as conn:
                yield conn
                return

        # Round-robin across replicas
        engine = self.replica_engines[self._replica_index % len(self.replica_engines)]
        self._replica_index += 1

        try:
            conn = engine.connect()
        except Exception as e:
            logger.warning(f'Replica connection failed, falling back to primary: {e}')
            with self.write_connection() as conn:
                yield conn
            return

        try:
            yield conn
        finally:
            conn.close()

    def health_check(self):
        """Check connectivity to primary and all replicas."""
        status = {'primary': False, 'replicas': []}

        try:
            with self.primary_engine.connect() as conn:
                conn.execute(text('SELECT 1'))
                status['primary'] = True
        except Exception as e:
            logger.error(f'Primary health check failed: {e}')

        for i, engine in enumerate(self.replica_engines):
            try:
                with engine.connect() as conn:
                    conn.execute(text('SELECT 1'))
                    status['replicas'].append({'index': i, 'healthy': True})
            except Exception as e:
                status['replicas'].append({'index': i, 'healthy': False, 'error': str(e)})

        return status
```

## Monitoring Replication Lag

Replication lag tells you how far behind the replica is from the primary. During normal operation, keep it as low as possible and set thresholds based on your workload and recovery point objective.

```python
# monitor_replication.py - Track replication lag
from google.cloud import monitoring_v3
import time

def check_replication_lag(project_id, instance_name):
    """Query Cloud Monitoring for replication lag metrics."""
    client = monitoring_v3.MetricServiceClient()
    project_name = f'projects/{project_id}'

    # Query the replication lag metric
    interval = monitoring_v3.TimeInterval({
        'end_time': {'seconds': int(time.time())},
        'start_time': {'seconds': int(time.time()) - 300},  # Last 5 minutes
    })

    results = client.list_time_series(
        request={
            'name': project_name,
            'filter': f'metric.type="cloudsql.googleapis.com/database/postgres/replication/replica_byte_lag" AND resource.labels.database_id="{project_id}:{instance_name}"',
            'interval': interval,
        }
    )

    for result in results:
        for point in result.points:
            lag_bytes = point.value.int64_value
            print(f'Replication lag for {instance_name}: {lag_bytes} bytes')
            if lag_bytes > 10 * 1024 * 1024:  # 10 MB threshold
                print(f'WARNING: High replication lag detected!')
            return lag_bytes

    return None
```

## Performing Manual Failover

If the primary region goes down, promote the replica to become the new primary. For a designated Enterprise Plus DR replica, use replica failover; otherwise, use regular replica promotion.

```bash
# Fail over to the designated DR replica
gcloud sql instances promote-replica replica-europe --failover

# The DR replica is now the primary instance
# Update your application configuration to point to the new primary
# If you are not using a Cloud SQL DNS write endpoint, update connection strings

# After failover, you may want to create a new replica in another region
gcloud sql instances create new-replica-us \
  --master-instance-name=replica-europe \
  --region=us-central1 \
  --tier=db-custom-4-16384
```

## Automating Failover Invocation with Cloud Functions

Set up guarded failover invocation using Cloud Monitoring alerts and Cloud Functions. Keep human approval or strong safeguards in the workflow so a transient alert does not promote a replica unnecessarily.

```python
# failover_function.py - Replica failover triggered by a verified monitoring alert
import base64
import os
import json
from google.cloud import pubsub_v1
from googleapiclient import discovery

sql_service = discovery.build('sqladmin', 'v1beta4')
publisher = pubsub_v1.PublisherClient()

PROJECT = os.environ['PROJECT_ID']
FAILOVER_REPLICA = os.environ['FAILOVER_REPLICA']
NOTIFICATION_TOPIC = os.environ['NOTIFICATION_TOPIC']

def handle_failover_alert(event, context):
    """Triggered by a Cloud Monitoring alert when the primary is down."""
    alert_data = json.loads(base64.b64decode(event['data']).decode('utf-8'))
    topic_path = publisher.topic_path(PROJECT, NOTIFICATION_TOPIC)

    # Verify this is a genuine outage, not a transient blip
    if alert_data.get('incident', {}).get('state') != 'open':
        print('Alert is not in open state, skipping failover')
        return

    print(f'Primary database outage detected. Initiating failover to {FAILOVER_REPLICA}')

    try:
        # Promote the designated DR replica with replica failover
        operation = sql_service.instances().promoteReplica(
            project=PROJECT,
            instance=FAILOVER_REPLICA,
            failover=True,
        ).execute()

        # Notify the team
        publisher.publish(
            topic_path,
            data=json.dumps({
                'action': 'database_failover',
                'old_primary': 'primary-db',
                'new_primary': FAILOVER_REPLICA,
                'status': 'initiated',
            }).encode('utf-8'),
        )

        print(f'Failover initiated. Operation: {operation}')

    except Exception as e:
        print(f'Failover failed: {e}')
        # Notify the team about the failure
        publisher.publish(
            topic_path,
            data=json.dumps({
                'action': 'failover_failed',
                'error': str(e),
            }).encode('utf-8'),
        )
```

## Post-Failover Steps

After a failover, there are several things you need to handle.

```bash
# 1. Update DNS or connection strings to point to the new primary
# If you are not using a Cloud SQL DNS write endpoint, update the instance connection name

# 2. Create a new read replica in a different region
gcloud sql instances create new-replica-us \
  --master-instance-name=replica-europe \
  --region=us-central1 \
  --tier=db-custom-4-16384

# 3. Verify data integrity
gcloud sql connect replica-europe --user=app_user --database=myapp << EOF
SELECT count(*) FROM orders;
SELECT max(created_at) FROM orders;
EOF

# 4. Update monitoring alerts to watch the new primary
```

## Wrapping Up

Cross-region read replicas provide a safety net for regional outages. The key points to remember: always monitor replication lag so you know your data loss exposure, test your failover process regularly so you are confident it works, and have a documented runbook for post-failover steps. Automated failover invocation can reduce recovery time, but it needs careful safeguards to avoid false-positive triggers.

OneUptime can monitor your database primary and replicas across regions, tracking replication lag, connection counts, and query performance. When combined with uptime monitoring of your application endpoints, it gives you a complete picture of your database high availability setup and helps you catch issues before they require failover.
