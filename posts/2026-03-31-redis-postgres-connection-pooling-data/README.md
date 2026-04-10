# How to Use Redis for PostgreSQL Connection Pooling Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, PostgreSQL, Connection Pool, Monitoring, PgBouncer

Description: Learn how to use Redis to store and expose PostgreSQL connection pool metrics from PgBouncer so dashboards and alerting systems can query pool health in real time.

---

PostgreSQL connection pools (PgBouncer, pgpool-II) have their own internal state, but accessing pool metrics programmatically requires parsing SHOW commands. Storing pool stats in Redis makes them available to dashboards, alerting systems, and auto-scaling logic without repeated admin queries.

## Architecture

```text
PgBouncer --> Stats Collector Script --> Redis Hash --> Dashboard / Alert System
```

## Collecting PgBouncer Stats into Redis

```python
import redis
import psycopg2
import time
import threading

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def get_pgbouncer_stats() -> dict:
    """Connect to PgBouncer admin interface and fetch pool stats."""
    conn = psycopg2.connect(
        host="localhost",
        port=6432,  # PgBouncer port
        user="pgbouncer",
        password="pgbouncer_pass",
        database="pgbouncer"
    )
    conn.autocommit = True
    cursor = conn.cursor()

    cursor.execute("SHOW POOLS;")
    cols = [desc[0] for desc in cursor.description]
    pools = [dict(zip(cols, row)) for row in cursor.fetchall()]

    cursor.execute("SHOW STATS;")
    cols = [desc[0] for desc in cursor.description]
    stats = [dict(zip(cols, row)) for row in cursor.fetchall()]

    cursor.close()
    conn.close()

    return {"pools": pools, "stats": stats, "collected_at": time.time()}

def store_pool_stats():
    """Periodically collect and store stats in Redis."""
    while True:
        try:
            data = get_pgbouncer_stats()

            # Store pool data per database
            for pool in data["pools"]:
                key = f"pgpool:{pool['database']}"
                r.hset(key, mapping={
                    "cl_active":   str(pool.get("cl_active", 0)),
                    "cl_waiting":  str(pool.get("cl_waiting", 0)),
                    "sv_active":   str(pool.get("sv_active", 0)),
                    "sv_idle":     str(pool.get("sv_idle", 0)),
                    "sv_used":     str(pool.get("sv_used", 0)),
                    "maxwait":     str(pool.get("maxwait", 0)),
                    "collected_at": str(time.time())
                })
                r.expire(key, 120)  # Auto-expire if collector stops

        except Exception as e:
            print(f"Stats collection failed: {e}")

        time.sleep(10)

# Start background collector
threading.Thread(target=store_pool_stats, daemon=True).start()
```

## Reading Pool Metrics

```python
def get_pool_health(database: str = "myapp") -> dict:
    key = f"pgpool:{database}"
    data = r.hgetall(key)
    if not data:
        return {"status": "unknown", "error": "No data in Redis"}

    cl_waiting = int(data.get("cl_waiting", 0))
    maxwait = int(data.get("maxwait", 0))

    status = "healthy"
    if cl_waiting > 10:
        status = "degraded"
    if cl_waiting > 50 or maxwait > 5:
        status = "critical"

    return {**data, "status": status}
```

## Alerting on Pool Saturation

```python
def check_pool_alerts(database: str = "myapp") -> list:
    health = get_pool_health(database)
    alerts = []

    cl_waiting = int(health.get("cl_waiting", 0))
    maxwait = int(health.get("maxwait", 0))

    if cl_waiting > 25:
        alerts.append(f"High client wait queue: {cl_waiting} clients waiting")
    if maxwait > 3:
        alerts.append(f"High max wait time: {maxwait}s")

    return alerts
```

## Querying via Redis CLI

```bash
# View pool stats for a database
redis-cli HGETALL pgpool:myapp

# Check waiting clients
redis-cli HGET pgpool:myapp cl_waiting

# Watch pool in real time
watch -n 5 redis-cli HGETALL pgpool:myapp
```

## Exposing as a Metrics Endpoint

```python
from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/metrics/pgpool/<database>")
def pool_metrics(database):
    return jsonify(get_pool_health(database))
```

## Summary

Storing PgBouncer connection pool metrics in Redis makes pool health available to any consumer without repeated admin database connections. A background collector writes pool stats to a Redis Hash every 10 seconds with a TTL, and a health check function evaluates saturation thresholds. This approach enables real-time alerting and autoscaling based on connection pool pressure.

