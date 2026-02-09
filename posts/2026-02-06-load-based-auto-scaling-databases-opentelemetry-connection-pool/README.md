# How to Implement Load-Based Auto-Scaling for Databases Using OpenTelemetry Connection Pool Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Databases, Auto-Scaling, Connection Pools

Description: Instrument database connection pools with OpenTelemetry to drive read replica scaling and connection limit adjustments based on real demand.

Database connection pools are one of the most common bottlenecks in production systems, and they are often invisible until things break. When the pool is exhausted, requests start queuing up and latency spikes. When it is oversized, you hold open connections that waste database server memory and potentially hit max connection limits. OpenTelemetry lets you instrument the pool itself and use those metrics to make informed scaling decisions.

## Instrumenting the Connection Pool

Most connection pool libraries expose stats about active connections, idle connections, and wait times. You just need to bridge those stats into OpenTelemetry metrics. Here is how to do it with a typical Python setup using SQLAlchemy.

This code registers observable gauges that read pool stats on every collection cycle:

```python
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from sqlalchemy import create_engine, event
import time

# Standard OTel setup
exporter = OTLPMetricExporter(endpoint="http://otel-collector:4317")
reader = PeriodicExportingMetricReader(exporter, export_interval_millis=15000)
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter("db.pool.monitor", version="1.0.0")

# Create the database engine with pool configuration
engine = create_engine(
    "postgresql://user:pass@primary-db:5432/myapp",
    pool_size=20,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800
)

def observe_pool_stats(options):
    """Report current connection pool statistics."""
    pool = engine.pool
    yield metrics.Observation(
        value=pool.checkedout(),
        attributes={"pool": "primary", "state": "active"}
    )
    yield metrics.Observation(
        value=pool.checkedin(),
        attributes={"pool": "primary", "state": "idle"}
    )
    yield metrics.Observation(
        value=pool.overflow(),
        attributes={"pool": "primary", "state": "overflow"}
    )

meter.create_observable_gauge(
    name="db.pool.connections",
    callbacks=[observe_pool_stats],
    description="Database connection pool usage by state"
)

# Track connection wait time as a histogram
wait_time_histogram = meter.create_histogram(
    name="db.pool.wait_duration",
    description="Time spent waiting for a connection from the pool",
    unit="ms"
)

# Hook into SQLAlchemy pool events to measure wait time
@event.listens_for(engine, "checkout")
def on_checkout(dbapi_conn, connection_record, connection_proxy):
    connection_record.info["checkout_time"] = time.time()

@event.listens_for(engine, "checkin")
def on_checkin(dbapi_conn, connection_record):
    if "checkout_time" in connection_record.info:
        duration = (time.time() - connection_record.info["checkout_time"]) * 1000
        wait_time_histogram.record(duration, {"pool": "primary"})
```

## Tracking Query Throughput by Type

Connection pool metrics tell you about resource contention, but you also need to know the read/write ratio to make smart scaling decisions. If 80% of your queries are reads, adding a read replica is more effective than scaling up the primary.

This instrumentation categorizes queries and tracks their throughput:

```python
from opentelemetry import metrics

meter = metrics.get_meter("db.queries", version="1.0.0")

query_counter = meter.create_counter(
    name="db.queries.total",
    description="Total database queries by type"
)

query_duration = meter.create_histogram(
    name="db.query.duration",
    description="Query execution time",
    unit="ms"
)

def execute_query(conn, sql, params=None):
    """Wrapper that instruments database queries."""
    # Determine query type from the SQL statement
    query_type = "read" if sql.strip().upper().startswith("SELECT") else "write"

    start = time.time()
    result = conn.execute(sql, params)
    elapsed_ms = (time.time() - start) * 1000

    query_counter.add(1, {
        "pool": "primary",
        "query_type": query_type
    })
    query_duration.record(elapsed_ms, {
        "pool": "primary",
        "query_type": query_type
    })
    return result
```

## Setting Up Scaling Rules

With the metrics flowing, you can define concrete scaling policies. The logic is: when pool utilization is consistently high AND the read/write ratio favors reads, add a read replica. When pool utilization is low, reduce replicas.

These PromQL expressions calculate the key decision signals for database scaling:

```promql
# Pool utilization: active connections as a fraction of max pool size
# Values above 0.8 indicate pool pressure
(
  sum(db_pool_connections{state="active", pool="primary"})
  /
  (sum(db_pool_connections{state="active", pool="primary"})
   + sum(db_pool_connections{state="idle", pool="primary"})
   + 10)  # max_overflow
)

# P95 connection wait time - anything above 100ms is a problem
histogram_quantile(0.95, rate(db_pool_wait_duration_bucket{pool="primary"}[5m]))

# Read/write ratio over the last hour
sum(rate(db_queries_total{query_type="read"}[1h]))
/
sum(rate(db_queries_total[1h]))
```

## Automating Read Replica Scaling

If you run your databases on a cloud provider that supports API-driven replica management, you can automate the scaling. Here is a simplified example using AWS RDS.

This script checks pool pressure and read ratio, then adjusts the number of read replicas:

```python
import boto3
import requests

PROM_URL = "http://prometheus:9090"
rds_client = boto3.client("rds", region_name="us-east-1")

def get_metric(query):
    """Query Prometheus for a single scalar value."""
    resp = requests.get(f"{PROM_URL}/api/v1/query", params={"query": query})
    results = resp.json()["data"]["result"]
    if results:
        return float(results[0]["value"][1])
    return None

def get_current_replica_count():
    """Count existing read replicas for our primary instance."""
    response = rds_client.describe_db_instances(
        Filters=[{"Name": "db-cluster-id", "Values": ["myapp-cluster"]}]
    )
    replicas = [db for db in response["DBInstances"] if db.get("ReadReplicaSourceDBInstanceIdentifier")]
    return len(replicas)

def scale_read_replicas():
    pool_utilization = get_metric(
        'sum(db_pool_connections{state="active"}) / '
        '(sum(db_pool_connections{state="active"}) + sum(db_pool_connections{state="idle"}) + 10)'
    )
    read_ratio = get_metric(
        'sum(rate(db_queries_total{query_type="read"}[1h])) / sum(rate(db_queries_total[1h]))'
    )
    wait_p95 = get_metric(
        'histogram_quantile(0.95, rate(db_pool_wait_duration_bucket[5m]))'
    )

    current_replicas = get_current_replica_count()
    desired_replicas = current_replicas

    # Scale up: high pool pressure AND mostly read traffic
    if pool_utilization > 0.80 and read_ratio > 0.60 and wait_p95 > 100:
        desired_replicas = min(current_replicas + 1, 5)  # Cap at 5 replicas

    # Scale down: low pool pressure for a sustained period
    elif pool_utilization < 0.30 and current_replicas > 1:
        desired_replicas = current_replicas - 1

    if desired_replicas != current_replicas:
        print(f"Scaling replicas from {current_replicas} to {desired_replicas}")
        print(f"  Pool utilization: {pool_utilization:.1%}")
        print(f"  Read ratio: {read_ratio:.1%}")
        print(f"  Wait P95: {wait_p95:.0f}ms")
        # Trigger the actual scaling (implementation depends on your DB provider)
        adjust_replicas(desired_replicas)

scale_read_replicas()
```

## Alerting on Pool Exhaustion Risk

Even with auto-scaling in place, you want alerts for situations where the pool is close to exhaustion. This catches cases where scaling has not kicked in yet or the problem is on the write path where read replicas do not help.

These alert rules catch both immediate pool exhaustion and the slower trend of growing wait times:

```yaml
# db-pool-alerts.yaml
groups:
  - name: database_pool
    rules:
      - alert: ConnectionPoolNearExhaustion
        expr: |
          (sum by (pool) (db_pool_connections{state="active"})
          + sum by (pool) (db_pool_connections{state="overflow"}))
          /
          30  # total pool capacity (pool_size + max_overflow)
          > 0.85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Connection pool {{ $labels.pool }} is {{ $value | humanizePercentage }} full"

      - alert: ConnectionPoolWaitTimeHigh
        expr: |
          histogram_quantile(0.95, rate(db_pool_wait_duration_bucket[5m])) > 500
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "P95 connection pool wait time exceeds 500ms"
```

The real value of this approach is that you are scaling based on the actual bottleneck - connection availability - rather than proxies like CPU or memory. Database connection exhaustion is one of those failure modes that CPU metrics completely miss, because the server can be at 10% CPU and still be unable to serve requests if every connection is tied up.
