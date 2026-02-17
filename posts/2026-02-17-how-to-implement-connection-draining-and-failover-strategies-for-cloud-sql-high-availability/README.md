# How to Implement Connection Draining and Failover Strategies for Cloud SQL High Availability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, High Availability, Connection Draining, Failover

Description: Learn how to implement connection draining and failover strategies for Cloud SQL to minimize downtime during maintenance events, failovers, and database upgrades.

---

Database failovers are inevitable. Whether it is a planned maintenance window, an unexpected zone outage, or a manual failover for testing, your application needs to handle the transition gracefully. Without proper connection draining and failover handling, you get a cascade of connection errors, transaction failures, and potentially corrupted data.

Cloud SQL's high availability configuration handles the infrastructure-level failover automatically, but your application still needs to be designed to work with it. This guide covers the strategies for making failovers as smooth as possible.

## How Cloud SQL Failover Works

When you create a Cloud SQL instance with high availability enabled, Google provisions a primary instance and a standby instance in a different zone within the same region. The standby receives all writes via synchronous replication. During a failover, the standby becomes the new primary, and the IP address is remapped.

The failover itself takes about 30 seconds to a few minutes. During this time, existing connections are dropped, new connections fail, and any in-flight transactions are rolled back. Your application needs to handle all of this.

## Step 1: Enable High Availability

```bash
# Create a Cloud SQL instance with high availability
gcloud sql instances create production-db \
  --database-version=POSTGRES_15 \
  --tier=db-custom-4-16384 \
  --region=us-central1 \
  --availability-type=REGIONAL \
  --storage-auto-increase \
  --backup-start-time=02:00 \
  --enable-point-in-time-recovery \
  --retained-transaction-log-days=7 \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=3

# For an existing instance, patch it to enable HA
gcloud sql instances patch existing-db \
  --availability-type=REGIONAL
```

## Step 2: Configure Connection Pooling with PgBouncer

A connection pooler between your application and Cloud SQL absorbs connection disruptions during failover. PgBouncer is the most common choice for PostgreSQL.

```ini
; pgbouncer.ini - deployed on a GKE pod or Compute Engine VM
[databases]
; Connect to Cloud SQL via the private IP
myapp = host=CLOUD_SQL_PRIVATE_IP port=5432 dbname=myapp

[pgbouncer]
listen_port = 6432
listen_addr = 0.0.0.0
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

; Pool settings
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5

; Connection health checks
server_check_delay = 10
server_check_query = SELECT 1
server_connect_timeout = 5
server_idle_timeout = 300

; Handle failover gracefully
server_reset_query = DISCARD ALL
server_reset_query_always = 1

; DNS resolution settings - important for failover
dns_max_ttl = 15
dns_zone_check_period = 5

; Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
```

Deploy PgBouncer on GKE:

```yaml
# pgbouncer-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pgbouncer
spec:
  replicas: 2
  selector:
    matchLabels:
      app: pgbouncer
  template:
    metadata:
      labels:
        app: pgbouncer
    spec:
      containers:
        - name: pgbouncer
          image: edoburu/pgbouncer:1.21.0
          ports:
            - containerPort: 6432
          volumeMounts:
            - name: config
              mountPath: /etc/pgbouncer
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "500m"
          livenessProbe:
            tcpSocket:
              port: 6432
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            exec:
              command:
                - sh
                - -c
                - "psql -h localhost -p 6432 -U pgbouncer pgbouncer -c 'SHOW POOLS'"
            initialDelaySeconds: 5
            periodSeconds: 5
      volumes:
        - name: config
          configMap:
            name: pgbouncer-config
```

## Step 3: Implement Application-Level Connection Handling

Your application code needs retry logic and connection validation to handle failover events.

```python
# Python example with SQLAlchemy
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError, DisconnectionError
import time
import logging

logger = logging.getLogger(__name__)

def create_resilient_engine(database_url):
    """Create a SQLAlchemy engine with failover-resilient settings."""
    engine = create_engine(
        database_url,
        # Pool configuration for failover handling
        pool_size=10,
        max_overflow=20,
        pool_timeout=30,
        pool_recycle=1800,      # Recycle connections every 30 minutes
        pool_pre_ping=True,     # Validate connections before use
        connect_args={
            "connect_timeout": 5,  # Connection timeout in seconds
            "options": "-c statement_timeout=30000",  # 30s query timeout
        },
    )

    # Register event listener to handle disconnections
    @event.listens_for(engine, "handle_error")
    def handle_error(context):
        """Handle connection errors during failover."""
        if context.is_disconnect:
            logger.warning(
                "Database disconnection detected. "
                "This may be a failover event."
            )

    @event.listens_for(engine, "checkout")
    def checkout_listener(dbapi_conn, connection_record, connection_proxy):
        """Validate connection on checkout from pool."""
        try:
            cursor = dbapi_conn.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
        except Exception:
            # Connection is stale, raise to force a new one
            raise DisconnectionError("Stale connection detected")

    return engine

def execute_with_retry(session_factory, operation, max_retries=5):
    """Execute a database operation with retry logic for failover."""
    last_error = None

    for attempt in range(max_retries):
        session = session_factory()
        try:
            result = operation(session)
            session.commit()
            return result
        except OperationalError as e:
            session.rollback()
            last_error = e
            logger.warning(
                f"Database operation failed (attempt {attempt + 1}/{max_retries}): {e}"
            )

            # Exponential backoff with jitter
            wait_time = min(2 ** attempt + (time.time() % 1), 30)
            logger.info(f"Waiting {wait_time:.1f}s before retry...")
            time.sleep(wait_time)
        except Exception as e:
            session.rollback()
            raise
        finally:
            session.close()

    raise last_error

# Usage example
engine = create_resilient_engine(
    "postgresql://user:password@pgbouncer-ip:6432/myapp"
)
SessionFactory = sessionmaker(bind=engine)

def create_order(session):
    """Example database operation."""
    order = Order(customer_id=123, total=99.99)
    session.add(order)
    return order

# This will automatically retry if a failover occurs mid-transaction
result = execute_with_retry(SessionFactory, create_order)
```

## Step 4: Implement Connection Draining for Planned Maintenance

For planned maintenance or manual failovers, drain connections gracefully before initiating the failover.

```python
import psycopg2
from google.cloud import sqladmin_v1

class ConnectionDrainer:
    """Drain database connections before planned failover."""

    def __init__(self, project_id, instance_name):
        self.project_id = project_id
        self.instance_name = instance_name
        self.sql_client = sqladmin_v1.SqlInstancesServiceClient()

    def drain_and_failover(self, db_host, db_name):
        """Gracefully drain connections then trigger failover."""
        # Step 1: Set the instance to reject new connections
        print("Phase 1: Rejecting new connections...")
        self.set_max_connections(1)  # Allow only admin connections

        # Step 2: Wait for active queries to complete
        print("Phase 2: Waiting for active queries to complete...")
        self.wait_for_queries_to_complete(db_host, db_name, timeout=60)

        # Step 3: Terminate remaining idle connections
        print("Phase 3: Terminating idle connections...")
        self.terminate_idle_connections(db_host, db_name)

        # Step 4: Trigger the failover
        print("Phase 4: Triggering failover...")
        self.trigger_failover()

        # Step 5: Restore max connections after failover
        print("Phase 5: Restoring max connections...")
        time.sleep(60)  # Wait for failover to complete
        self.set_max_connections(500)  # Restore original setting

        print("Failover complete. Connections can resume.")

    def wait_for_queries_to_complete(self, db_host, db_name, timeout=60):
        """Wait for active queries to finish, up to a timeout."""
        conn = psycopg2.connect(
            host=db_host, dbname=db_name,
            user="postgres", password="PASSWORD"
        )
        conn.autocommit = True
        cursor = conn.cursor()

        start_time = time.time()
        while time.time() - start_time < timeout:
            cursor.execute("""
                SELECT count(*)
                FROM pg_stat_activity
                WHERE state = 'active'
                AND query NOT LIKE '%pg_stat_activity%'
                AND backend_type = 'client backend'
            """)
            active_count = cursor.fetchone()[0]

            if active_count == 0:
                print("All active queries completed.")
                break

            print(f"Waiting for {active_count} active queries...")
            time.sleep(5)

        cursor.close()
        conn.close()

    def terminate_idle_connections(self, db_host, db_name):
        """Terminate idle client connections."""
        conn = psycopg2.connect(
            host=db_host, dbname=db_name,
            user="postgres", password="PASSWORD"
        )
        conn.autocommit = True
        cursor = conn.cursor()

        cursor.execute("""
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE state = 'idle'
            AND backend_type = 'client backend'
            AND pid != pg_backend_pid()
        """)

        terminated = cursor.rowcount
        print(f"Terminated {terminated} idle connections.")

        cursor.close()
        conn.close()

    def trigger_failover(self):
        """Trigger a Cloud SQL failover."""
        request = sqladmin_v1.SqlInstancesFailoverRequest(
            project=self.project_id,
            instance=self.instance_name,
            body=sqladmin_v1.InstancesFailoverRequest(
                failover_context=sqladmin_v1.FailoverContext(
                    settings_version=self.get_settings_version(),
                )
            ),
        )
        operation = self.sql_client.failover(request=request)
        print(f"Failover initiated: {operation.name}")
```

## Step 5: Use Cloud SQL Proxy for Automatic Reconnection

The Cloud SQL Auth Proxy handles connection management and can help during failovers.

```bash
# Run Cloud SQL Proxy with connection draining
cloud-sql-proxy \
  PROJECT_ID:us-central1:production-db \
  --port=5432 \
  --auto-iam-authn \
  --max-connections=100 \
  --max-sigterm-delay=30s
```

In Kubernetes, deploy the proxy as a sidecar:

```yaml
# Sidecar proxy configuration for GKE
containers:
  - name: cloud-sql-proxy
    image: gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.8.0
    args:
      - "PROJECT_ID:us-central1:production-db"
      - "--port=5432"
      - "--auto-iam-authn"
      - "--max-sigterm-delay=30s"
      - "--health-check"
      - "--http-port=8090"
    ports:
      - containerPort: 5432
      - containerPort: 8090
    resources:
      requests:
        memory: "128Mi"
        cpu: "100m"
    livenessProbe:
      httpGet:
        path: /liveness
        port: 8090
      initialDelaySeconds: 10
      periodSeconds: 10
    readinessProbe:
      httpGet:
        path: /readiness
        port: 8090
      initialDelaySeconds: 5
      periodSeconds: 5
```

## Step 6: Monitor Failover Events

Set up monitoring so you know when failovers happen and how long they take.

```bash
# Create alerts for Cloud SQL failover events
gcloud alpha monitoring policies create \
  --display-name="Cloud SQL Failover Alert" \
  --condition-display-name="Failover event detected" \
  --condition-filter='resource.type="cloudsql_database" AND metric.type="cloudsql.googleapis.com/database/available_for_failover"' \
  --condition-threshold-value=1 \
  --condition-threshold-comparison=COMPARISON_LT \
  --notification-channels="projects/PROJECT_ID/notificationChannels/CHANNEL_ID"
```

```sql
-- Query Cloud SQL operation logs for failover history
SELECT
  timestamp,
  protopayload_auditlog.methodName,
  protopayload_auditlog.resourceName,
  protopayload_auditlog.status.code AS status,
  protopayload_auditlog.authenticationInfo.principalEmail AS triggered_by
FROM `PROJECT_ID.audit_logs.cloudaudit_googleapis_com_activity_*`
WHERE protopayload_auditlog.methodName LIKE '%failover%'
OR protopayload_auditlog.methodName LIKE '%restart%'
ORDER BY timestamp DESC
LIMIT 20;
```

## Step 7: Test Your Failover Strategy

Regularly test failovers to make sure everything works as expected.

```bash
# Trigger a manual failover for testing
gcloud sql instances failover production-db

# Monitor the failover progress
watch -n 5 'gcloud sql instances describe production-db --format="value(state)"'
```

Connection draining and failover handling are not optional for production databases. The combination of connection pooling with PgBouncer, application-level retry logic, graceful connection draining for planned events, and comprehensive monitoring ensures that your application survives database failovers with minimal impact to users. Test your failover strategy regularly - the time to discover it does not work is not during a real outage.
