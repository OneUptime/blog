# How to Resynchronize One PostgreSQL Logical Replication Table After a Lost Subscription

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Logical Replication, Troubleshooting, Disaster Recovery

Description: Rebuild one PostgreSQL logical replication table through a dedicated subscription while keeping the recovery scope and change-stream continuity explicit.

A lost subscription does not make the subscriber's remaining rows a valid seed. They may be missing inserts, retaining deleted rows, or holding old values. Recreating a subscription with `copy_data = false` over those rows preserves that uncertainty.

For one independently replicated table, the simplest repair is a fresh initial copy into an empty target, using a dedicated publication and subscription. PostgreSQL coordinates that copy with changes occurring during the load. The [initial synchronization architecture](https://www.postgresql.org/docs/18/logical-replication-architecture.html) explains how its table worker hands the synchronized table back to normal apply.

This procedure targets PostgreSQL 18 and a one-table subscription for `public.inventory`. It assumes the publisher is authoritative, the target has no local writers, and the table has no dependencies requiring a wider rebuild.

## Establish whether one table is enough

First inventory the remaining subscriber state:

```sql
SELECT s.subname, s.subenabled, s.subslotname,
       r.srrelid::regclass AS table_name, r.srsubstate
FROM pg_subscription AS s
LEFT JOIN pg_subscription_rel AS r ON r.srsubid = s.oid
WHERE s.subdbid = (
    SELECT oid FROM pg_database WHERE datname = current_database()
)
ORDER BY s.subname, table_name;
```

If an invalid or deleted slot served ten tables, all ten tables may have missed changes. A one-table rebuild cannot repair the other nine. Recover the whole affected subscription, or establish a separate proven recovery boundary for every table.

Similarly, do not start a second subscription writing `inventory` while an older subscription still writes it. If the old subscription is healthy and serves other tables, first design a controlled detachment of `inventory` from all publications feeding that subscription. Publication edits affect other subscribers too. The [subscription documentation](https://www.postgresql.org/docs/18/logical-replication-subscription.html) describes overlapping subscription concerns.

For the commands below, the old `inventory_sub` is already absent or it contains only this table. Retain its definition, source slot name, and logs before removing it.

## Remove unusable subscription metadata

When a broken subscription still exists, disable it and wait for its workers to exit:

```sql
ALTER SUBSCRIPTION inventory_sub DISABLE;

SELECT pid, relid::regclass
FROM pg_stat_subscription
WHERE subname = 'inventory_sub' AND pid IS NOT NULL;
```

Normally, `DROP SUBSCRIPTION inventory_sub;` also removes the remote slot. If that fails specifically because the slot is already missing, disassociate it and retry:

```sql
ALTER SUBSCRIPTION inventory_sub SET (slot_name = NONE);
DROP SUBSCRIPTION inventory_sub;
```

These are separate top-level commands. Check for leftover table-synchronization slots as well as the main slot, and remove only confirmed abandoned resources. [DROP SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-dropsubscription.html) documents the failure path and remote cleanup caveats.

Do not update `pg_subscription_rel` manually or advance a replication origin to manufacture a ready state. Those operations cannot reconstruct missing data.

## Preserve the old rows, then prepare an empty target

Take an incident copy before clearing the subscriber:

```bash
pg_dump \
  --dbname='host=subscriber.example.internal dbname=app user=app_admin' \
  --table=public.inventory \
  --format=custom \
  --file=inventory-before-resync.dump
```

Check the command succeeds and preserve the dump securely. It is evidence and a fallback copy, not a consistent continuation of the publisher's current stream.

Compare publisher and subscriber columns, types, primary keys, replica identity, and intentional subscriber-only constraints. For this example, both tables have:

```sql
CREATE TABLE public.inventory (
    sku text PRIMARY KEY,
    available integer NOT NULL,
    revision bigint NOT NULL
);
```

Use the DDL only when the table is absent. Otherwise preserve the compatible existing table and, after the backup and worker checks, clear it **on the subscriber only**:

```sql
TRUNCATE TABLE public.inventory;
```

If foreign keys prevent that operation, stop and plan the dependent dataset's recovery. Do not add `CASCADE` merely to get past the error. A fresh copy is not a merge and does not delete stale target rows for you.

## Create a fresh stream and let PostgreSQL copy

On the publisher, create a dedicated publication with a new name:

```sql
CREATE PUBLICATION inventory_reseed_pub
    FOR TABLE public.inventory;

GRANT USAGE ON SCHEMA public TO logical_replicator;
GRANT SELECT ON public.inventory TO logical_replicator;
```

On the subscriber:

```sql
CREATE SUBSCRIPTION inventory_reseed_sub
    CONNECTION 'host=publisher.example.internal dbname=app user=logical_replicator sslmode=verify-full'
    PUBLICATION inventory_reseed_pub
    WITH (copy_data = true);
```

Use the established replication role and credentials, with capacity for the main slot and synchronization worker. [CREATE SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-createsubscription.html) defines the initial-copy controls. Application writes on the publisher may continue during the managed initial copy; prohibit DDL changes and local target writes.

## Prove the table is usable again

Inspect the new subscription's relation state:

```sql
SELECT r.srrelid::regclass, r.srsubstate
FROM pg_subscription_rel AS r
JOIN pg_subscription AS s ON s.oid = r.srsubid
WHERE s.subname = 'inventory_reseed_sub';
```

Wait for `r`, meaning ready, as defined in [pg_subscription_rel](https://www.postgresql.org/docs/18/catalog-pg-subscription-rel.html). Verify a controlled insert, update, and delete from the publisher, then compare the table under a brief write fence before restoring dependent reads.

If the initial copy errors, inspect subscriber logs for permissions, constraints, or incompatible data. Correct the cause and allow the synchronization worker to retry; do not repeatedly clear a table while its workers run. Keep the dedicated subscription as the ongoing replication owner unless a separately rehearsed handoff preserves continuity. The recovery is complete when the table matches its source and future changes arrive through one unambiguous stream.
