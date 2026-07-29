# Why Does a Database Time Out During Traffic Spikes? Diagnosing Pool Exhaustion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Database, Connection Pooling, PostgreSQL, HikariCP, SQLAlchemy, Performance

Description: Diagnose traffic-correlated database timeouts by proving pool saturation, finding long connection hold times, and controlling concurrency before raising limits.

---

A database error that appears only during traffic spikes is often raised before a new query reaches the database. The application asks its connection pool for a connection, every permitted connection is checked out, and the pool's acquisition timer expires while the request waits in line.

This is connection-pool exhaustion. It is a capacity and queueing symptom, not a diagnosis by itself.

## Recognize the Pool Boundary

Pool timeout messages vary by implementation:

- HikariCP's `connectionTimeout` limits how long `getConnection()` waits for a pool connection.
- SQLAlchemy `QueuePool` exposes `pool_timeout`, the number of seconds a checkout waits before giving up.
- Psycopg 3's pool `timeout` limits how long a client waits to receive a connection.

All three are about borrowing a client-side resource. They are different from a driver's physical connect timeout and a database statement timeout.

Build a timeline for one failed request:

```text
request received
  -> pool checkout starts
  -> pool checkout fails after 500 ms
  -> no connection borrowed
  -> no SQL sent for this operation
```

If the trace has no database span after the pool wait, changing `statement_timeout` cannot fix that failure.

## Why a Traffic Spike Exposes It

A pool of 20 connections can serve far more than 20 requests per second when each request holds a connection briefly. What matters is concurrent connection occupancy.

A useful approximation is:

```text
required concurrent connections
  ~= database operations per second * average connection hold time in seconds
```

At 100 operations per second and a 50-millisecond hold time, the average occupancy is about five connections. If hold time rises to 400 milliseconds during a lock event, average occupancy rises to about 40. A 20-connection pool now has a queue even if incoming traffic did not change.

This approximation uses averages and does not size the pool safely on its own. Bursts, tail latency, transaction fan-out, and uneven work all matter. Its value is showing that pool pressure can come from either more arrivals or slower releases.

## Capture These Curves Together

At minimum, graph:

- pool connections in use;
- pool connections idle;
- pool connections being created, if available;
- threads, tasks, or requests waiting for a connection;
- pool checkout wait latency and timeout count;
- database operation duration;
- transaction duration or connection hold duration;
- request concurrency and request rate;
- database CPU, I/O, lock waits, and connection count;
- application-instance count and configured pool size per instance.

The most revealing pattern is often:

1. query or transaction latency rises;
2. active connections reach the pool maximum;
3. idle connections fall to zero;
4. checkout waiters accumulate;
5. acquisition timeouts rise;
6. retries and continued arrivals create more waiters.

Correlating only CPU with timeout count misses lock waits, slow storage, network stalls, and connections held while application code performs unrelated work.

## Find Who Holds Connections

Instrument both checkout and return. A query can finish quickly while the application keeps its connection checked out through serialization, an HTTP call, or CPU work.

Use lexical lifetime management so every path returns the resource:

```python
from sqlalchemy import create_engine, text

engine = create_engine(
    "postgresql+psycopg://app@db.example.internal/orders",
    pool_size=10,
    max_overflow=5,
    pool_timeout=0.5,
)


def load_order(order_id: str) -> dict:
    with engine.connect() as connection:
        row = connection.execute(
            text(
                """
                SELECT id, customer_id, total
                FROM orders
                WHERE id = :order_id
                """
            ),
            {"order_id": order_id},
        ).mappings().one()

    # The connection has returned to the pool before unrelated work.
    return dict(row)
```

For transactions, keep the transaction scope equally explicit:

```python
def mark_paid(order_id: str, payment_id: str) -> None:
    with engine.begin() as connection:
        connection.execute(
            text(
                """
                UPDATE orders
                SET payment_id = :payment_id, state = 'paid'
                WHERE id = :order_id AND state = 'pending'
                """
            ),
            {"order_id": order_id, "payment_id": payment_id},
        )
```

Do not depend on garbage collection to return a pooled connection. SQLAlchemy explicitly recommends calling `close()`, directly or through a context manager.

## Check the Database Side

If the pool is full, inspect what its checked-out sessions are doing. In PostgreSQL, `pg_stat_activity` exposes session state, query and transaction start times, plus wait event information:

```sql
SELECT
    pid,
    application_name,
    state,
    wait_event_type,
    wait_event,
    now() - xact_start AS transaction_age,
    now() - query_start AS query_age,
    query
FROM pg_stat_activity
WHERE datname = current_database()
ORDER BY xact_start NULLS LAST;
```

Use appropriate permissions and avoid exposing sensitive query text in broadly accessible dashboards.

Look for:

- long-running queries;
- sessions waiting on locks;
- sessions `idle in transaction`;
- many sessions from one deployment;
- a few query fingerprints consuming most hold time;
- connection creation failures;
- a database at its connection limit;
- sessions waiting for clients or I/O.

PostgreSQL's `state` and `wait_event` are independent. An active backend with a non-null wait event is executing but blocked at an identified wait point.

## Do Not Multiply Capacity by Accident

Pool size is usually configured per process or application instance. The database sees the sum:

```text
maximum possible sessions
  = replicas * worker processes per replica * pool maximum
```

Twenty replicas, each with two worker processes and a 20-connection pool, can attempt 800 database sessions. Include migration jobs, background workers, administrators, and other services in the database connection budget.

Autoscaling the application during a latency incident can therefore add database connections and make the bottleneck worse. Treat total connection capacity as a shared resource.

## Why Increasing the Pool Can Backfire

A larger pool helps only when the database has spare capacity and the previous limit was unnecessarily conservative. When the database is already saturated, more concurrent work can increase:

- CPU scheduling and memory overhead;
- buffer-cache churn;
- lock contention;
- storage queue depth;
- transaction conflicts;
- tail latency.

Longer queries then hold the larger pool for longer, recreating the same exhaustion at a higher resource cost.

HikariCP's pool-sizing guidance intentionally argues for a small pool based on database capacity, not one connection per frontend request. The correct value must be load tested against the actual database, query mix, and latency objective.

## Fixes in the Right Order

### 1. Stop leaks and oversized scopes

Return connections on success, exception, cancellation, and early return. Move network calls and CPU-heavy work outside the checkout scope.

### 2. Reduce hold time

Optimize high-volume slow queries, add appropriate indexes, shorten transactions, remove avoidable lock contention, and paginate oversized results.

### 3. Bound incoming concurrency

Reject, queue, or shed work before it occupies an application worker and waits on the database pool. A short bounded queue is safer than an unbounded pile of requests whose callers have already timed out.

### 4. Fail stale work

Propagate request cancellation and remaining deadlines. Do not begin a database operation that cannot finish before its caller leaves.

### 5. Remove multiplicative retries

A pool acquisition timeout during saturation is not a signal to retry immediately. Back off, add jitter, cap attempts, and ensure only one layer owns the retry policy.

### 6. Revisit pool size

After the above work, test a candidate size under representative steady load, bursts, slow queries, and failover. Verify the total across every replica stays within the database's safe session capacity.

## Distinguish Four Similar Incidents

| Observation | More likely boundary |
| --- | --- |
| Waiters high, active at max, idle zero | Pool exhaustion |
| Pool has room, new physical connections fail | Network, authentication, endpoint, or server connection cap |
| Connection acquired quickly, query reaches its limit | Statement execution or lock wait |
| Query completes server-side, client stalls reading | Driver, network, proxy, or client consumption |

These can cascade into one another. A network partition can make checked-out operations hang, filling the pool and producing acquisition timeouts for later requests. Preserve the first error and phase timing rather than treating every downstream symptom as the root cause.

## Incident Checklist

1. Confirm which timeout setting produced the exception.
2. Graph pool state and checkout latency around the first failure.
3. Calculate total configured connections across the deployment.
4. Inspect database session state and wait events.
5. Find the longest connection hold spans and their call stacks.
6. Check for a deploy, replica increase, traffic mix change, or retry change.
7. Apply admission control before increasing pool capacity.
8. Load test the fix and verify that timeout rate, queue depth, and database tail latency all improve.

A spike reveals the queue, but the durable fix is usually shorter ownership, bounded concurrency, and a pool sized for the database rather than for the number of callers.

## Official Documentation

- [HikariCP configuration and connectionTimeout](https://github.com/brettwooldridge/HikariCP#gear-configuration-knobs-baby)
- [HikariCP pool sizing guidance](https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing)
- [SQLAlchemy QueuePool configuration](https://docs.sqlalchemy.org/en/20/core/pooling.html#sqlalchemy.pool.QueuePool)
- [Psycopg 3 pool API](https://www.psycopg.org/psycopg3/docs/api/pool.html)
- [PostgreSQL monitoring statistics](https://www.postgresql.org/docs/current/monitoring-stats.html)
