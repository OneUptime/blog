# How to Monitor Database Replication Lag with OpenTelemetry Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Replication, Database, Metrics, PostgreSQL, MySQL, MongoDB, Observability, High Availability

Description: Monitor database replication lag across PostgreSQL, MySQL, and MongoDB using OpenTelemetry metrics to detect replica drift, prevent stale reads, and maintain data consistency.

---

Replication lag is the delay between when a write happens on the primary database and when that write becomes visible on a replica. In a read-heavy application that routes queries to replicas, even a few seconds of lag can cause users to see stale data. Worse, if replication falls too far behind, a failover event could mean data loss. Monitoring replication lag is not optional for any production database running in a replicated configuration.

OpenTelemetry provides a unified framework for collecting replication lag metrics across different database engines. Instead of using separate monitoring tools for PostgreSQL, MySQL, and MongoDB, you can feed all replication metrics into a single pipeline and alert on them consistently. This guide covers how to collect, export, and alert on replication lag for the three most common database engines.

## Why Replication Lag Matters

Before diving into configuration, it helps to understand what causes replication lag and why it is dangerous.

Replication lag occurs when replicas cannot apply changes as fast as the primary produces them. Common causes include:

- Heavy write workloads on the primary that flood the replication stream
- Long-running queries on replicas that block the replay process
- Network latency between the primary and geographically distant replicas
- Disk I/O bottlenecks on the replica server
- Large transactions (like bulk imports or schema migrations) that take time to replay

The consequences range from annoying (a user creates a post but does not see it when the page reloads because the read hit a stale replica) to catastrophic (promoting a lagging replica during failover means losing minutes of committed transactions).

```mermaid
graph LR
    A[Application Write] --> B[Primary Database]
    B -->|WAL / Binlog / Oplog| C[Replication Stream]
    C --> D[Replica 1]
    C --> E[Replica 2]
    C --> F[Replica 3]
    D -.->|Lag: 0.5s| G[Read Queries]
    E -.->|Lag: 2.1s| G
    F -.->|Lag: 15.3s| G

    style F fill:#ff6b6b,color:#fff
    style E fill:#ffd93d,color:#333
    style D fill:#6bcb77,color:#fff
```

## Architecture for Replication Lag Monitoring

The monitoring setup uses a custom OpenTelemetry metrics exporter that runs alongside your database. It periodically checks the replication state and emits gauge metrics. These metrics flow through the OpenTelemetry Collector to your backend.

```mermaid
graph TD
    A[Lag Monitor Script] -->|Query Replication Status| B[Primary DB]
    A -->|Query Replication Status| C[Replica DBs]
    A -->|Push Metrics| D[OpenTelemetry Collector]
    D --> E[Batch Processor]
    E --> F[OTLP Exporter]
    F --> G[OneUptime / Backend]
    G --> H[Alert Rules]
    H -->|Lag > Threshold| I[PagerDuty / Slack]
```

## Monitoring PostgreSQL Replication Lag

PostgreSQL provides detailed replication information through system views. The `pg_stat_replication` view on the primary shows the state of each replica, including how far behind it is in bytes and time.

Here is a Python script that collects PostgreSQL replication lag and exports it as OpenTelemetry metrics.

```python
# pg_replication_monitor.py - Collect PostgreSQL replication lag metrics
import psycopg2
import time
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.resources import Resource

# Configure the OpenTelemetry metrics pipeline
resource = Resource.create({
    "service.name": "pg-replication-monitor",
    "db.system": "postgresql",
})

# Export metrics to the collector every 10 seconds
exporter = OTLPMetricExporter(endpoint="http://localhost:4317", insecure=True)
reader = PeriodicExportingMetricReader(exporter, export_interval_millis=10000)
provider = MeterProvider(resource=resource, metric_readers=[reader])
metrics.set_meter_provider(provider)

# Create a meter for database replication metrics
meter = metrics.get_meter("pg-replication", "1.0.0")

# Define gauges for replication lag - both bytes and seconds
lag_bytes_gauge = meter.create_gauge(
    name="db.replication.lag_bytes",
    description="Replication lag in bytes between primary and replica",
    unit="By",
)

lag_seconds_gauge = meter.create_gauge(
    name="db.replication.lag_seconds",
    description="Replication lag in seconds between primary and replica",
    unit="s",
)

# Track whether each replica's replication is active
replication_active_gauge = meter.create_gauge(
    name="db.replication.active",
    description="Whether replication is active (1) or stopped (0)",
    unit="1",
)


def collect_pg_replication_lag(conn_params):
    """Query the primary for replication status of all replicas."""
    conn = psycopg2.connect(**conn_params)
    conn.autocommit = True
    cursor = conn.cursor()

    # This query runs on the PRIMARY and returns info about each replica
    # pg_stat_replication shows connected standby servers
    cursor.execute("""
        SELECT
            client_addr,
            application_name,
            state,
            -- Calculate lag in bytes using WAL positions
            pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes,
            -- Calculate lag in seconds (available in PG 10+)
            EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))
                AS lag_seconds
        FROM pg_stat_replication
        ORDER BY client_addr;
    """)

    for row in cursor.fetchall():
        client_addr, app_name, state, lag_bytes, lag_seconds = row

        # Common attributes for all metrics from this replica
        attrs = {
            "db.replica.address": str(client_addr),
            "db.replica.name": app_name or "unknown",
            "db.replica.state": state,
            "db.system": "postgresql",
        }

        # Record the byte lag - useful for detecting replication stream issues
        if lag_bytes is not None:
            lag_bytes_gauge.set(float(lag_bytes), attrs)

        # Record the time lag - more intuitive for alerting
        if lag_seconds is not None:
            lag_seconds_gauge.set(float(lag_seconds), attrs)

        # Record whether replication is streaming (active)
        is_active = 1.0 if state == "streaming" else 0.0
        replication_active_gauge.set(is_active, attrs)

    cursor.close()
    conn.close()


# Main loop - collect metrics every 10 seconds
if __name__ == "__main__":
    conn_params = {
        "host": "pg-primary.internal",
        "port": 5432,
        "dbname": "postgres",
        "user": "replication_monitor",
        "password": "monitor-password",
    }

    print("Starting PostgreSQL replication lag monitor...")
    while True:
        try:
            collect_pg_replication_lag(conn_params)
        except Exception as e:
            print(f"Error collecting metrics: {e}")
        time.sleep(10)
```

Create the monitoring user on your PostgreSQL primary with the minimum required permissions.

```sql
-- Create a user for the replication monitor on the PRIMARY server
CREATE USER replication_monitor WITH PASSWORD 'monitor-password';

-- Grant access to replication statistics
GRANT pg_monitor TO replication_monitor;

-- This role allows reading pg_stat_replication without superuser access
```

## Monitoring MySQL / MariaDB Replication Lag

MySQL and MariaDB expose replication status through the `SHOW REPLICA STATUS` command (or `SHOW SLAVE STATUS` on older versions). The key metric is `Seconds_Behind_Source`, which estimates how far the replica lags behind the primary.

```python
# mysql_replication_monitor.py - Collect MySQL/MariaDB replication lag
import pymysql
import time
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.resources import Resource

# Configure metrics pipeline
resource = Resource.create({
    "service.name": "mysql-replication-monitor",
    "db.system": "mysql",
})

exporter = OTLPMetricExporter(endpoint="http://localhost:4317", insecure=True)
reader = PeriodicExportingMetricReader(exporter, export_interval_millis=10000)
provider = MeterProvider(resource=resource, metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter("mysql-replication", "1.0.0")

# Replication lag in seconds as reported by the replica
lag_seconds = meter.create_gauge(
    name="db.replication.lag_seconds",
    description="Seconds behind source as reported by SHOW REPLICA STATUS",
    unit="s",
)

# IO thread status - 1 if running, 0 if stopped
io_thread_running = meter.create_gauge(
    name="db.replication.io_thread_running",
    description="Whether the replication IO thread is running",
    unit="1",
)

# SQL thread status - 1 if running, 0 if stopped
sql_thread_running = meter.create_gauge(
    name="db.replication.sql_thread_running",
    description="Whether the replication SQL thread is running",
    unit="1",
)

# Relay log space - how much data is queued for replay
relay_log_space = meter.create_gauge(
    name="db.replication.relay_log_space_bytes",
    description="Total size of relay log files on the replica",
    unit="By",
)


def collect_mysql_replication_lag(replica_configs):
    """Connect to each replica and check its replication status."""
    for config in replica_configs:
        replica_name = config.pop("replica_name", "unknown")

        try:
            conn = pymysql.connect(**config)
            cursor = conn.cursor(pymysql.cursors.DictCursor)

            # SHOW REPLICA STATUS returns the replication state
            # Use SHOW SLAVE STATUS on MySQL < 8.0.22
            cursor.execute("SHOW REPLICA STATUS")
            status = cursor.fetchone()

            if status is None:
                # This server is not configured as a replica
                continue

            attrs = {
                "db.replica.name": replica_name,
                "db.replica.source_host": status.get("Source_Host", "unknown"),
                "db.system": "mysql",
            }

            # Seconds_Behind_Source can be NULL if replication is broken
            seconds_behind = status.get("Seconds_Behind_Source")
            if seconds_behind is not None:
                lag_seconds.set(float(seconds_behind), attrs)
            else:
                # NULL means replication is broken - set a high value to trigger alerts
                lag_seconds.set(float(999999), attrs)

            # Track thread status - both threads must be running for
            # healthy replication
            io_running = 1.0 if status.get("Replica_IO_Running") == "Yes" else 0.0
            sql_running = 1.0 if status.get("Replica_SQL_Running") == "Yes" else 0.0

            io_thread_running.set(io_running, attrs)
            sql_thread_running.set(sql_running, attrs)

            # Relay log space indicates queued but unapplied changes
            relay_space = status.get("Relay_Log_Space", 0)
            relay_log_space.set(float(relay_space), attrs)

            cursor.close()
            conn.close()

        except Exception as e:
            print(f"Error checking replica {replica_name}: {e}")
        finally:
            # Restore the replica_name for the next iteration
            config["replica_name"] = replica_name


# Configure your replicas
replica_configs = [
    {
        "replica_name": "mysql-replica-1",
        "host": "mysql-replica1.internal",
        "port": 3306,
        "user": "replication_monitor",
        "password": "monitor-password",
    },
    {
        "replica_name": "mysql-replica-2",
        "host": "mysql-replica2.internal",
        "port": 3306,
        "user": "replication_monitor",
        "password": "monitor-password",
    },
]

if __name__ == "__main__":
    print("Starting MySQL replication lag monitor...")
    while True:
        try:
            collect_mysql_replication_lag(replica_configs)
        except Exception as e:
            print(f"Error in collection loop: {e}")
        time.sleep(10)
```

## Monitoring MongoDB Replication Lag

MongoDB replica sets expose their status through the `rs.status()` command. Each member reports its `optimeDate`, which is the timestamp of the last operation it applied. The lag is the difference between the primary's optime and each secondary's optime.

```python
# mongo_replication_monitor.py - Collect MongoDB replica set lag metrics
from pymongo import MongoClient
import time
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.resources import Resource

# Set up the metrics pipeline
resource = Resource.create({
    "service.name": "mongo-replication-monitor",
    "db.system": "mongodb",
})

exporter = OTLPMetricExporter(endpoint="http://localhost:4317", insecure=True)
reader = PeriodicExportingMetricReader(exporter, export_interval_millis=10000)
provider = MeterProvider(resource=resource, metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter("mongo-replication", "1.0.0")

# Lag in seconds between primary and each secondary
lag_gauge = meter.create_gauge(
    name="db.replication.lag_seconds",
    description="Replication lag in seconds for MongoDB secondary members",
    unit="s",
)

# Member health status
member_health = meter.create_gauge(
    name="db.replication.member_health",
    description="Health status of replica set member (1=healthy, 0=unhealthy)",
    unit="1",
)

# Oplog window - how far back the oplog reaches
oplog_window = meter.create_gauge(
    name="db.replication.oplog_window_hours",
    description="Hours of oplog data available for catch-up replication",
    unit="h",
)


def collect_mongo_replication_lag(mongo_uri):
    """Connect to the replica set and check replication status."""
    client = MongoClient(mongo_uri)

    # Get replica set status - this works from any member
    rs_status = client.admin.command("replSetGetStatus")

    # Find the primary's optime to calculate lag for each secondary
    primary_optime = None
    for member in rs_status["members"]:
        if member["stateStr"] == "PRIMARY":
            primary_optime = member["optimeDate"]
            break

    if primary_optime is None:
        print("WARNING: No primary found in replica set")
        return

    # Calculate lag for each secondary member
    for member in rs_status["members"]:
        member_name = member["name"]
        member_state = member["stateStr"]

        attrs = {
            "db.replica.name": member_name,
            "db.replica.state": member_state,
            "db.system": "mongodb",
            "db.replica_set": rs_status.get("set", "unknown"),
        }

        # Report health status
        health = float(member.get("health", 0))
        member_health.set(health, attrs)

        # Calculate lag for secondary members
        if member_state == "SECONDARY":
            member_optime = member.get("optimeDate")
            if member_optime and primary_optime:
                # Lag is the difference between primary and secondary optime
                lag = (primary_optime - member_optime).total_seconds()
                lag_gauge.set(max(0.0, lag), attrs)

    # Calculate oplog window from the primary
    try:
        oplog = client.local.oplog.rs
        # Get the oldest and newest oplog entries
        oldest = oplog.find().sort("$natural", 1).limit(1).next()
        newest = oplog.find().sort("$natural", -1).limit(1).next()

        # Window in hours
        window_seconds = (newest["ts"].time - oldest["ts"].time)
        window_hours = window_seconds / 3600.0

        oplog_window.set(window_hours, {
            "db.system": "mongodb",
            "db.replica_set": rs_status.get("set", "unknown"),
        })
    except Exception as e:
        print(f"Error calculating oplog window: {e}")

    client.close()


if __name__ == "__main__":
    print("Starting MongoDB replication lag monitor...")
    mongo_uri = "mongodb://monitor:password@mongo1.internal:27017,mongo2.internal:27017,mongo3.internal:27017/?replicaSet=rs0"

    while True:
        try:
            collect_mongo_replication_lag(mongo_uri)
        except Exception as e:
            print(f"Error collecting metrics: {e}")
        time.sleep(10)
```

## Collector Configuration for All Database Engines

Set up the OpenTelemetry Collector to receive replication metrics from all three monitors and export them to your backend.

```yaml
# otel-collector-config.yaml - Unified replication lag monitoring
receivers:
  # Receive metrics from all database monitors via OTLP
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Batch metrics for efficient export
  batch:
    timeout: 10s
    send_batch_size: 200

  # Enrich all replication metrics with environment info
  resource:
    attributes:
      - key: deployment.environment
        value: "production"
        action: upsert
      - key: monitoring.type
        value: "replication"
        action: upsert

exporters:
  # Send to OneUptime for dashboards and alerting
  otlp/oneuptime:
    endpoint: "https://otlp.oneuptime.com:4317"
    headers:
      "x-oneuptime-token": "${ONEUPTIME_TOKEN}"

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp/oneuptime]
```

## Alerting on Replication Lag

The most important alert is straightforward: notify on-call when replication lag exceeds a threshold. But a single threshold is too simplistic for most environments. Here is a tiered approach:

| Threshold | Severity | Action |
|-----------|----------|--------|
| Lag > 5 seconds for 2 minutes | Warning | Post to Slack channel. Usually resolves on its own after a write burst. |
| Lag > 30 seconds for 5 minutes | Critical | Page on-call. The replica is falling behind significantly. |
| Lag > 300 seconds (5 minutes) | Emergency | Page on-call and DBA. The replica may need manual intervention. |
| IO/SQL thread stopped | Critical | Page immediately. Replication has broken and will not recover without intervention. |
| Oplog window < 2 hours (MongoDB) | Warning | The oplog is too small. If a secondary goes offline for longer than this window, it cannot catch up without a full resync. |

## Metric Naming Conventions

Stick to consistent metric names across all database engines. This lets you build a single dashboard that works for PostgreSQL, MySQL, and MongoDB.

```
db.replication.lag_seconds       - Time lag (all engines)
db.replication.lag_bytes         - Byte lag (PostgreSQL, MySQL)
db.replication.active            - Is replication running (1/0)
db.replication.io_thread_running - IO thread status (MySQL only)
db.replication.sql_thread_running - SQL thread status (MySQL only)
db.replication.member_health     - Member health (MongoDB only)
db.replication.oplog_window_hours - Oplog window (MongoDB only)
```

The `db.replica.name` attribute on every metric lets you filter and group by replica. The `db.system` attribute lets you filter by database engine.

## Common Troubleshooting Patterns

Once you have replication lag metrics flowing, you will start recognizing patterns:

**Periodic spikes during backups**: If lag spikes at the same time every day, a backup job on the replica is likely blocking replay. Move backups to a dedicated replica or use snapshot-based backups.

**Lag after deployments**: Schema migrations (ALTER TABLE) can cause temporary lag because they are replayed as single large operations. Consider using online schema change tools like `pt-online-schema-change` or `gh-ost`.

**Gradually increasing lag**: This means the replica's hardware cannot keep up with the primary's write rate. You need faster disks, more CPU, or to reduce the write volume.

**Sudden jump to a very high value**: A network partition or disk failure on the replica. Check the replication threads and error logs.

Replication lag monitoring is foundational for any database that uses read replicas. OpenTelemetry gives you a consistent way to collect this critical metric across database engines, feed it into a single pipeline, and alert on it before your users notice stale data.
