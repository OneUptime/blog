# How to Rename a PostgreSQL Table Without Dropping In-Flight Logical Replication Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Logical Replication, Migration, Database

Description: Rename a logically replicated PostgreSQL table using a write fence, a replicated barrier, and coordinated schema changes that preserve queued data.

A table rename is small DDL, but its timing matters to logical replication. The subscriber locates source tables by schema-qualified name, and PostgreSQL does not replicate the rename itself. Renaming one side while old changes are still queued can make apply fail or tempt an operator into skipping data.

A predictable procedure is to stop relevant writes, prove earlier changes have applied, disable replication, rename both sides, and resume. This guide targets PostgreSQL 18 and a short maintenance window. It keeps the existing table objects and subscription; no dump or replacement slot is required.

## Establish a barrier in the same subscription

Assume `public.orders` belongs to `sales_pub`, consumed by `sales_sub`. Prepare a small barrier table on both publisher and subscriber before the maintenance window:

```sql
CREATE TABLE public.replication_barrier (
    barrier_id text PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now()
);
```

Publish it on the source:

```sql
GRANT SELECT ON public.replication_barrier TO logical_replicator;
ALTER PUBLICATION sales_pub ADD TABLE public.replication_barrier;
```

Refresh `sales_sub` and wait until both tables are ready:

```sql
ALTER SUBSCRIPTION sales_sub
    REFRESH PUBLICATION WITH (copy_data = true);

SELECT r.srrelid::regclass, r.srsubstate
FROM pg_subscription_rel AS r
JOIN pg_subscription AS s ON s.oid = r.srsubid
WHERE s.subname = 'sales_sub';
```

The barrier must travel through the **same subscription** as the table being renamed. Separate subscriptions do not provide a shared apply-order fence. The [logical replication architecture](https://www.postgresql.org/docs/18/logical-replication-architecture.html) explains ordered apply within the stream; [subscription relation states](https://www.postgresql.org/docs/18/catalog-pg-subscription-rel.html) identify whether initial synchronization has finished.

For several subscribers, prepare and verify the barrier on every one. Inventory downstream subscriptions, application queries, views, and jobs that refer to `orders`; the replication steps are only one part of the rename rollout.

## Fence writers and drain earlier transactions

Stop application writes for the publication's tables and prevent new writer sessions from bypassing the maintenance gate. Wait for existing writer transactions, background jobs, and any prepared transactions affecting these tables to finish. A gate that stops only new HTTP requests does not cover an already running database transaction.

Then commit a uniquely named marker on the publisher:

```sql
INSERT INTO public.replication_barrier(barrier_id)
VALUES ('orders-rename-20260921');
```

On every subscriber, wait until this query returns the marker:

```sql
SELECT barrier_id
FROM public.replication_barrier
WHERE barrier_id = 'orders-rename-20260921';
```

Because all relevant earlier transactions finished before the marker committed, seeing it through the same ready subscription establishes the required apply boundary. Keep the write fence in place. A healthy connection, `received_lsn`, or a small byte-lag estimate alone is weaker evidence than observing the committed barrier in subscriber data.

If the marker does not arrive, diagnose that replication failure before attempting the rename. Do not advance the replication origin or skip a transaction to reach the maintenance step.

## Stop apply and rename the existing objects

On each subscriber:

```sql
ALTER SUBSCRIPTION sales_sub DISABLE;

SELECT pid, worker_type, relid::regclass
FROM pg_stat_subscription
WHERE subname = 'sales_sub' AND pid IS NOT NULL;
```

Wait until no worker remains. The disable command takes effect at transaction end, and [ALTER SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-altersubscription.html) documents that behavior.

On the publisher:

```sql
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.orders RENAME TO purchases;
COMMIT;
```

Apply the same transaction on every subscriber. The lock timeout makes a blocked rename fail promptly rather than holding the maintenance window open indefinitely. Investigate blockers before retrying.

A rename changes the table's name while preserving its object identity; it is different from dropping and recreating a table. PostgreSQL documents the operation under [ALTER TABLE](https://www.postgresql.org/docs/18/sql-altertable.html). Keep the existing publication membership and inspect it:

```sql
SELECT pubname, schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'sales_pub';
```

It should now identify `public.purchases`. Do not drop and add publication membership as a shortcut for renaming.

## Resume, refresh, and verify before releasing writers

On each subscriber, enable the existing subscription and refresh its membership without requesting a copy:

```sql
ALTER SUBSCRIPTION sales_sub ENABLE;
ALTER SUBSCRIPTION sales_sub
    REFRESH PUBLICATION WITH (copy_data = false);
```

Keep all writes fenced while confirming that the renamed table remains ready and the worker has no schema-mapping errors. Logical replication's [schema restrictions](https://www.postgresql.org/docs/18/logical-replication-restrictions.html) explain why both sides must be compatible before new DML arrives.

Through a controlled maintenance connection, insert a new marker and make an approved canary change to `purchases`. Confirm both on all subscribers, then deploy or enable application code using the new name and release the fence.

If one rename fails, leave writers fenced and replication disabled while restoring a consistent pair of names. If both names already match, repair the remaining permission or mapping problem rather than discarding the slot. The preserved slot and drained boundary let the operation resume without guessing which old changes were lost.
