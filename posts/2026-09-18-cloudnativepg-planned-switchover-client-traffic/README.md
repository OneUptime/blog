# How to Perform a Planned PostgreSQL Operator Switchover Without Dropping Client Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudNativePG, PostgreSQL, Kubernetes, PgBouncer, High Availability

Description: Plan a CloudNativePG switchover with PgBouncer pause and resume, transaction draining, endpoint checks, and application-level verification.

---

A PostgreSQL primary change interrupts its server connections. No operator setting can move an open transaction to another server. The achievable goal is to keep application requests within their deadlines by draining work, briefly queuing traffic, and handling reconnects correctly.

This procedure uses CloudNativePG 1.30 and its managed PgBouncer `Pooler`. CloudNativePG documents a [pause, switchover, resume sequence](https://cloudnative-pg.io/docs/1.30/connection_pooling/#pausing-connections); it does not automatically perform the whole sequence for you. Rehearse with the actual driver, pool mode, and request deadlines before promising a disruption-free maintenance window.

## Establish the traffic contract

Inventory every writer. Web applications, workers, migration jobs, cron jobs, and administrator sessions must either use the controlled pooler or be paused separately. A direct connection to `orders-rw` bypasses PgBouncer's pause.

Choose a maintenance budget based on measured drain, shutdown, promotion, routing, and resume times. Check application connection acquisition timeouts and PgBouncer's `query_wait_timeout`. Queued requests can still fail if these deadlines expire.

Transaction pooling makes it possible to release backend connections between transactions. Session pooling can keep them assigned for the lifetime of a client session, so draining may require application cooperation. Review [PgBouncer's pooling and PAUSE semantics](https://www.pgbouncer.org/usage.html) for the deployed mode. Do not change pool mode during the operation: application compatibility needs its own testing.

## Check cluster and candidate health

The example uses `orders`, candidate `orders-2`, and Pooler `orders-pooler` in namespace `database`:

```bash
kubectl cnpg status orders -n database
kubectl get pooler orders-pooler -n database -o yaml
kubectl get pods -n database -l cnpg.io/cluster=orders -o wide
kubectl get endpointslices -n database \
  -l kubernetes.io/service-name=orders-rw -o yaml
```

Verify `orders-2` is a healthy replica, streaming normally, and has enough storage. Resolve existing archive failures, replay pauses, or rolling updates before adding another state transition. Record the current primary so you can distinguish success from a command merely being accepted.

On the primary, inspect long transactions through an authorized administrative connection:

```sql
SELECT pid, usename, application_name, state,
       clock_timestamp() - xact_start AS transaction_age
FROM pg_stat_activity
WHERE xact_start IS NOT NULL
ORDER BY xact_start;
```

PostgreSQL's [activity statistics](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-ACTIVITY-VIEW) provide the transaction start time, not a guarantee about how long finishing that transaction will take. Coordinate long work with its owner; blindly terminating it converts planned maintenance into an application error.

## Pause and prove the drain completed

Set the managed Pooler field:

```bash
kubectl patch pooler orders-pooler -n database --type=merge \
  -p '{"spec":{"pgbouncer":{"paused":true}}}'
```

A successful Kubernetes patch confirms desired state only. Inspect each PgBouncer instance through its administrative database. CloudNativePG's managed Pooler restricts this interface to local peer-authenticated connections as the `pgbouncer` operating-system user, as described in its [pooler security documentation](https://cloudnative-pg.io/docs/1.30/connection_pooling/#security). Use your approved per-pod local-socket access method and a client available in that image. In that admin connection, run:

```sql
SHOW DATABASES;
SHOW POOLS;
SHOW SERVERS;
```

Verify the affected database is paused on every pooler pod and server connections have drained. For separately managed PgBouncer installations that permit remote administration, a load-balanced Service checks only whichever pod handled that connection; it still does not verify every instance.

If draining exceeds the maintenance budget, stop before promotion and resume the Pooler. Investigate long transactions, session-mode clients, or an unhealthy pooler. Include the resume command in the runbook and assign responsibility for it so an interrupted operator terminal does not leave the application paused indefinitely.

## Promote and verify the new writer

Once the drain is confirmed, request the planned switchover:

```bash
kubectl cnpg promote orders orders-2 -n database
kubectl cnpg status orders -n database
kubectl get endpointslices -n database \
  -l kubernetes.io/service-name=orders-rw -o yaml
```

The [`promote` command](https://cloudnative-pg.io/docs/1.30/kubectl-plugin/#promote) initiates the operation. Wait until `orders-2` is the current primary, accepts connections, and the write Service targets it. From a direct administrative connection to the new primary, `SELECT pg_is_in_recovery();` should return false.

Do not shorten `switchoverDelay` impulsively when shutdown is slow. CloudNativePG explains the tradeoff between shutdown time and WAL preservation in its [failover documentation](https://cloudnative-pg.io/docs/1.30/failover/).

Resume the Pooler after the writable target is verified:

```bash
kubectl patch pooler orders-pooler -n database --type=merge \
  -p '{"spec":{"pgbouncer":{"paused":false}}}'
```

Confirm every pooler instance resumed, waiting clients decline, and application latency returns to baseline.

## Verify business traffic, not just readiness

Execute a small idempotent transaction through the normal application path, then read the resulting record. Check error rates and connection acquisition latency, including background workers. Verify the former primary rejoins as a standby before declaring redundancy restored.

A connection failure during `COMMIT` leaves the application uncertain whether the transaction committed. Retry using an idempotency key or query the operation's recorded outcome; replaying the request blindly can duplicate business actions.

Keep measured pause duration, maximum queue depth, time to the first successful write, and any expired requests. If those exceed your service objective, adjust request queuing or maintenance design and repeat the rehearsal. The evidence determines whether client traffic was preserved.
