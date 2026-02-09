# How to Debug Connection Pool Exhaustion by Correlating OpenTelemetry Pool Metrics with Slow Spans

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Connection Pool, Metrics, Performance, Database

Description: Diagnose connection pool exhaustion by correlating OpenTelemetry pool usage metrics with slow database span durations.

Connection pool exhaustion is a sneaky failure mode. Your application has a fixed pool of database connections, and when they are all checked out, new requests have to wait. If the pool never recovers, requests start timing out in a cascade. The tricky part is that the symptoms look like a slow database, when the real problem is that your application is holding connections too long. By correlating OpenTelemetry pool metrics with span timing, you can pinpoint exactly what is draining the pool.

## Instrumenting the Connection Pool

Most database libraries do not expose pool metrics by default. You need to add instrumentation that records pool state as OpenTelemetry metrics:

```python
from opentelemetry import metrics
import time
import threading

meter = metrics.get_meter("connection-pool-monitor")

# Create gauges for pool state
pool_active = meter.create_up_down_counter(
    name="db.pool.connections.active",
    description="Number of connections currently checked out",
    unit="connections",
)

pool_idle = meter.create_up_down_counter(
    name="db.pool.connections.idle",
    description="Number of connections sitting idle in the pool",
    unit="connections",
)

pool_wait_time = meter.create_histogram(
    name="db.pool.wait_time",
    description="Time spent waiting to acquire a connection from the pool",
    unit="ms",
)

pool_max = meter.create_up_down_counter(
    name="db.pool.connections.max",
    description="Maximum pool size",
    unit="connections",
)


class InstrumentedConnectionPool:
    def __init__(self, pool, pool_name="default"):
        self.pool = pool
        self.pool_name = pool_name
        self.attrs = {"db.pool.name": pool_name}

    def acquire(self):
        """Acquire a connection, recording wait time and pool state."""
        start = time.monotonic()

        connection = self.pool.getconn()  # This blocks if pool is exhausted

        wait_ms = (time.monotonic() - start) * 1000
        pool_wait_time.record(wait_ms, attributes=self.attrs)
        pool_active.add(1, attributes=self.attrs)
        pool_idle.add(-1, attributes=self.attrs)

        return connection

    def release(self, connection):
        """Return a connection to the pool."""
        self.pool.putconn(connection)
        pool_active.add(-1, attributes=self.attrs)
        pool_idle.add(1, attributes=self.attrs)
```

## Correlating Pool Metrics with Span Duration

The key insight is that when pool wait time spikes, span durations also spike - but the extra time is not in the database. It is in the wait for a connection. Here is how to record both in a single span:

```python
from opentelemetry import trace

tracer = trace.get_tracer("order-service")

async def get_user_orders(user_id):
    with tracer.start_as_current_span("db.get_user_orders") as span:
        span.set_attribute("db.system", "postgresql")
        span.set_attribute("db.operation", "SELECT")

        # Record pool state BEFORE acquiring
        span.set_attribute("db.pool.active_before", pool.pool.active_count)
        span.set_attribute("db.pool.idle_before", pool.pool.idle_count)

        # Time the connection acquisition separately
        acquire_start = time.monotonic()
        conn = pool.acquire()
        acquire_ms = (time.monotonic() - acquire_start) * 1000
        span.set_attribute("db.pool.acquire_time_ms", acquire_ms)

        try:
            # Time the actual query execution
            query_start = time.monotonic()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM orders WHERE user_id = %s ORDER BY created_at DESC",
                (user_id,),
            )
            results = cursor.fetchall()
            query_ms = (time.monotonic() - query_start) * 1000
            span.set_attribute("db.query_time_ms", query_ms)
            span.set_attribute("db.row_count", len(results))

            return results
        finally:
            pool.release(conn)
```

## Building the Diagnostic Query

Now you can query for spans where the pool acquisition time dominates the total span duration:

```python
def find_pool_exhaustion_incidents(spans):
    """
    Find spans where waiting for a connection took longer
    than actually executing the query.
    """
    incidents = []

    for span in spans:
        attrs = span.get("attributes", {})
        acquire_time = attrs.get("db.pool.acquire_time_ms", 0)
        query_time = attrs.get("db.query_time_ms", 0)
        active_before = attrs.get("db.pool.active_before", 0)

        total_duration = (span["endTime"] - span["startTime"]) / 1_000_000

        if acquire_time > 100 and acquire_time > query_time:
            incidents.append({
                "span_name": span["name"],
                "trace_id": span["traceId"],
                "total_ms": round(total_duration, 2),
                "acquire_ms": round(acquire_time, 2),
                "query_ms": round(query_time, 2),
                "pool_active": active_before,
                "acquire_pct": round(acquire_time / total_duration * 100, 1),
            })

    incidents.sort(key=lambda x: x["acquire_ms"], reverse=True)
    return incidents
```

## Finding the Connection Hogs

Once you confirm pool exhaustion, the next question is: what is holding the connections? Query for the longest-running database spans that overlap with the exhaustion window:

```python
def find_connection_hogs(spans, exhaustion_start, exhaustion_end):
    """
    Find database spans that held connections during the
    pool exhaustion window.
    """
    hogs = []

    for span in spans:
        if span.get("attributes", {}).get("db.system") is None:
            continue

        span_start = span["startTime"]
        span_end = span["endTime"]

        # Check if this span overlaps with the exhaustion window
        if span_start < exhaustion_end and span_end > exhaustion_start:
            hold_duration = (span_end - span_start) / 1_000_000
            hogs.append({
                "span_name": span["name"],
                "trace_id": span["traceId"],
                "duration_ms": round(hold_duration, 2),
                "query": span.get("attributes", {}).get("db.statement", ""),
            })

    hogs.sort(key=lambda x: x["duration_ms"], reverse=True)
    return hogs[:20]  # Top 20 longest holders
```

## Setting Up Alerts

Create alerts that fire before full exhaustion occurs:

```yaml
# Alert when pool utilization exceeds 80%
- alert: ConnectionPoolNearExhaustion
  expr: |
    db_pool_connections_active /
    db_pool_connections_max > 0.8
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "Connection pool {{ $labels.db_pool_name }} is {{ $value | humanizePercentage }} utilized"
```

## Summary

Connection pool exhaustion masquerades as database slowness, but the real culprit is usually long-running queries or connection leaks in your application code. By instrumenting your pool with OpenTelemetry metrics and recording acquisition time as span attributes, you can instantly tell whether a slow database span is actually slow because of the query or because it spent most of its time waiting for a connection. Find the connection hogs, fix the slow queries or leaks, and the pool recovers.
