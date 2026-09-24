# How to Set a Follower-Read Staleness Budget and Fall Back to the Leader

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Replication, Consistency, Performance

Description: Enforce a follower-read freshness budget with a replicated heartbeat, topology checks, bounded response time, and controlled leader fallback.

---

A replica returning queries successfully may still be too old for the application. Give each read path a freshness budget and a defined response when the replica cannot prove it meets that budget.

This example uses a PostgreSQL physical replica and an application-managed heartbeat. It provides a conservative freshness gate under stated clock and topology assumptions. It does not turn asynchronous replication into linearizable reads.

## Define what the budget covers

Suppose a catalog endpoint permits data up to five seconds behind the authoritative primary. Define the limit when the server sends the response, not just when a background health check ran. Reserve some of the budget for query execution and serialization. If the contract applies when the client receives the response, also budget a defensible delivery bound or have the client reject an expired response; a server-only check cannot bound an arbitrary network delay.

Other endpoints may require read-your-writes or current authorization decisions. Read-your-writes needs a session replication barrier or a fresh snapshot on the leader. Current authorization decisions need a fresh authoritative read; a session barrier alone does not cover changes made by other sessions. A generic five-second age limit is insufficient.

Maintain an authoritative topology identity outside the replica being evaluated. If a failover changes the primary's history, stop using cached eligibility until the routing layer establishes that the replica follows the accepted history. A disconnected old primary must not authenticate its own authority.

## Replicate a heartbeat from the current primary

Create an ordinary WAL-logged table:

```sql
CREATE TABLE replication_heartbeat (
    id integer PRIMARY KEY CHECK (id = 1),
    observed_at timestamptz NOT NULL
);

INSERT INTO replication_heartbeat VALUES (1, clock_timestamp());
```

Have one supervised writer update it, for example once per second in a short autocommit transaction:

```sql
UPDATE replication_heartbeat
SET observed_at = clock_timestamp()
WHERE id = 1;
```

The timestamp is taken before the heartbeat commits. Delayed commit or delayed replay therefore makes the heartbeat look older, which is conservative for the gate. Clock error can work in the opposite direction, so maintain a measured maximum clock-error allowance and fail closed when time synchronization is unhealthy.

The heartbeat must come from the currently accepted primary and travel through the same physical replication stream as the application tables. Do not use a separately replicated monitoring store as evidence that this database has caught up.

## Evaluate freshness in the read's snapshot

Read the heartbeat and the requested rows in the same fresh statement snapshot. A previous pooled session's old repeatable-read snapshot must not be reused. PostgreSQL's [transaction isolation documentation](https://www.postgresql.org/docs/18/transaction-iso.html) describes statement snapshots under Read Committed.

For example, this query always produces a heartbeat gate row and an array of matching orders:

```sql
SELECT pg_is_in_recovery() AS is_replica,
       h.observed_at,
       clock_timestamp() AS checked_at,
       COALESCE(
         (SELECT jsonb_agg(to_jsonb(o))
          FROM orders AS o
          WHERE o.customer_id = 42),
         '[]'::jsonb
       ) AS orders
FROM (VALUES (1)) AS expected(id)
LEFT JOIN replication_heartbeat AS h USING (id);
```

Use a parameterized customer ID in application code. A missing heartbeat stays visible as `NULL`; it must trigger fallback instead of becoming a successful empty result. Large result sets need their own pagination and response-size limits.

At the application, combine the reported age with measured clock uncertainty and elapsed response time. `maximum_clock_error` must bound the relative error between the primary and replica clocks, for example the sum of their individual maximum offset bounds. Measure `total_request_elapsed` with a monotonic clock. A conservative decision can use:

```text
upper_age = max(0, checked_at - observed_at)
            + maximum_clock_error
            + total_request_elapsed
```

Using the entire request duration overcounts some time but avoids depending on the exact instant `checked_at` was evaluated. Check the budget immediately before sending the buffered response. Reject missing or non-finite values, implausible future heartbeats, unhealthy clocks, topology mismatches, and exhausted deadlines. An absent heartbeat writer will eventually force fallback even if replication is healthy; alert on that separately.

## Distinguish age from a replication position

PostgreSQL exposes receive and replay positions through its [administration functions](https://www.postgresql.org/docs/18/functions-admin.html). A WAL barrier can establish that a replica has replayed a particular committed write, provided the topology and history are valid. It does not directly express an age in seconds.

Similarly, time since the last replayed transaction grows on an idle database even when the replica is caught up. The explicit heartbeat keeps producing observable progress. The [replication statistics reference](https://www.postgresql.org/docs/18/monitoring-stats.html#MONITORING-PG-STAT-REPLICATION-VIEW) also cautions against treating lag measurements as catch-up predictions.

## Make fallback a bounded operation

If the gate fails, discard the replica result and retry this read-only operation once against the authoritative leader within the remaining deadline. Use a fresh snapshot and bound its age through response sending by the same freshness budget; a slow leader query can also outlive that budget. Apply a concurrency limit so an entire replica pool falling behind cannot overwhelm the primary.

If the leader is unavailable or the fallback budget is exhausted, return the endpoint's documented error or explicitly stale response policy. Do not silently relax a required freshness limit. Never replay a write through this read-fallback path.

Test paused WAL replay, a missing heartbeat row, clock skew, a slow query, an idle primary, and a failover to a new history. Record freshness rejection rates and fallback latency separately from replica availability. Those measurements show whether the read policy is protecting users or merely moving load back to the leader.
