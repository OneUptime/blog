# How to Seed PostgreSQL Logical Replication from an Exported Snapshot Without Missing Writes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Logical Replication, Migration, Database

Description: Seed a PostgreSQL logical subscriber using the snapshot exported by its replication slot, then attach the subscription without skipping concurrent writes.

An ordinary dump followed by a newly created logical subscription leaves an uncertain boundary: writes can commit after the dump's snapshot but before the subscription's slot exists. A slot-exported snapshot supplies a consistent boundary between the copied rows and the later change stream.

This PostgreSQL 18 procedure seeds one ordinary table into an empty target. It assumes `wal_level = logical`, adequate replication slots and workers, authenticated connectivity, and administrative access on both databases. It deliberately excludes row filters, column lists, generated columns, DDL changes, and other concurrent consumers of the slot. Rehearse the exact schema before extending it.

## Prepare the schema and publication

Create the same table on the publisher and subscriber:

```sql
CREATE TABLE public.orders (
    order_id bigint PRIMARY KEY,
    customer_id bigint NOT NULL,
    total_cents bigint NOT NULL,
    status text NOT NULL
);
```

If the source table already exists, reproduce its compatible schema on the subscriber instead of recreating it. Keep the target empty and prevent local writers from using it.

On the publisher, create a dedicated publication before exporting the snapshot:

```sql
CREATE PUBLICATION orders_pub FOR TABLE public.orders;
GRANT USAGE ON SCHEMA public TO logical_replicator;
GRANT SELECT ON public.orders TO logical_replicator;
```

The connection role also needs `LOGIN`, `REPLICATION`, database access, and suitable authentication. Initial-copy access and replication permissions are separate requirements in the [logical replication security documentation](https://www.postgresql.org/docs/18/logical-replication-security.html).

Freeze relevant schema and publication changes during this operation. Application DML may continue.

## Export the slot's snapshot in a persistent session

Open **terminal A** with a replication-protocol connection to the publisher database:

```bash
psql -X 'host=publisher.example.internal dbname=app user=logical_replicator replication=database sslmode=verify-full'
```

At that prompt, issue:

```sql
CREATE_REPLICATION_SLOT orders_seed_slot
    LOGICAL pgoutput (SNAPSHOT 'export');
```

Record `slot_name`, `consistent_point`, and `snapshot_name` from the result. Leave terminal A open and do not execute another server command there. An exported replication snapshot remains available only until that connection closes or runs another command. This is a replication command, not `SELECT pg_create_logical_replication_slot(...)`; see the [streaming replication protocol](https://www.postgresql.org/docs/18/protocol-replication.html).

A slot-exported snapshot describes the database state immediately before the slot's change stream begins. Combining that snapshot with the stream avoids an arbitrary overlap or gap. The [logical decoding concepts](https://www.postgresql.org/docs/18/logicaldecoding-explanation.html) describe this handoff.

## Dump exactly that snapshot

In **terminal B**, use PostgreSQL 18 client tools. Replace the sample snapshot token with the value returned in terminal A:

```bash
pg_dump \
  --dbname='host=publisher.example.internal dbname=app user=logical_replicator sslmode=verify-full' \
  --data-only \
  --table=public.orders \
  --snapshot='00000003-0000001B-1' \
  --no-owner \
  --no-privileges \
  --file=orders-seed.sql
```

Wait for a successful exit. Keep terminal A open for the entire dump; this simple rule avoids racing snapshot import. The [pg_dump documentation](https://www.postgresql.org/docs/18/app-pgdump.html) defines `--snapshot` and table selection. Keep the dump protected because it contains application data.

After the dump completes, close terminal A with `\q`. The persistent slot survives. Do not consume it with debugging calls such as `pg_logical_slot_get_changes`, and do not advance it. A second consumer would move the very boundary the subscriber needs.

Restore into the empty subscriber table:

```bash
psql -X \
  'host=subscriber.example.internal dbname=app user=app_admin sslmode=verify-full' \
  --set=ON_ERROR_STOP=1 \
  --single-transaction \
  --file=orders-seed.sql
```

If restore fails, resolve the error and start again from a known empty target. Do not accept a partially loaded seed.

## Attach without copying again

On the subscriber, outside a transaction block:

```sql
CREATE SUBSCRIPTION orders_sub
    CONNECTION 'host=publisher.example.internal dbname=app user=logical_replicator sslmode=verify-full'
    PUBLICATION orders_pub
    WITH (
        create_slot = false,
        slot_name = 'orders_seed_slot',
        copy_data = false,
        enabled = false
    );

ALTER SUBSCRIPTION orders_sub ENABLE;
```

Configure the replication worker's credentials through your established secret mechanism. `create_slot = false` reuses the existing slot, while `copy_data = false` avoids a duplicate initial load. Creating the subscription disabled gives you a final inspection point before consumption. These options are documented in [CREATE SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-createsubscription.html).

Do not create a new slot after the dump or replace `orders_seed_slot` with an unrelated slot. Matching names cannot prove matching history.

## Verify the boundary, including concurrent changes

In rehearsal, insert one row before snapshot export, insert another while the dump is running, update a preexisting row, and delete another preexisting row. After catch-up, the subscriber must match all four outcomes. Checking only row counts would miss an update or an insert paired with a delete.

Inspect subscriber state:

```sql
SELECT r.srrelid::regclass, r.srsubstate
FROM pg_subscription_rel AS r
JOIN pg_subscription AS s ON s.oid = r.srsubid
WHERE s.subname = 'orders_sub';
```

The table should be ready (`r`), but readiness alone does not prove correctness of the imported dump. Compare rows under a controlled write pause and confirm a new source canary reaches the target.

Throughout dump, restore, and catch-up, monitor retained WAL and disk capacity. If the slot becomes invalid or the exported snapshot is lost before the dump imports it, abandon that seed and repeat with a new consistent slot/snapshot pair. Recovering by guessing an LSN defeats the reason for using this procedure.
