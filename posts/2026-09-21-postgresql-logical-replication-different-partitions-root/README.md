# How to Replicate PostgreSQL Partitions with publish_via_partition_root

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Logical Replication, Partitioning, Database

Description: Replicate a PostgreSQL range-partitioned table into a different subscriber layout by publishing the root identity and validating row routing.

A reporting database may need a different partition layout from the application database. PostgreSQL can replicate changes using a partitioned table's root identity, allowing the subscriber to route incoming rows into its own partitions instead of reproducing the publisher's leaf names.

This guide uses PostgreSQL 18 on both sides. The publisher partitions events by date; the subscriber partitions the same logical table by a hash of `event_id`. The example starts a new subscription, which avoids changing the relation mapping of a live stream during the demonstration.

## Create the publisher's range layout

On the publisher:

```sql
CREATE TABLE public.events (
    event_date date NOT NULL,
    event_id bigint NOT NULL,
    payload text NOT NULL,
    PRIMARY KEY (event_date, event_id)
) PARTITION BY RANGE (event_date);

CREATE TABLE public.events_2026_09
    PARTITION OF public.events
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

CREATE TABLE public.events_2026_10
    PARTITION OF public.events
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
```

The primary key includes the date partition key. PostgreSQL requires partitioned-table primary and unique constraints to include partition-key columns so uniqueness can be enforced across the layout. The [partitioning documentation](https://www.postgresql.org/docs/18/ddl-partitioning.html) explains that restriction.

Publish through the root:

```sql
CREATE PUBLICATION events_pub
    FOR TABLE public.events
    WITH (
        publish = 'insert, update, delete',
        publish_via_partition_root = true
    );
```

With this setting, the published relation identity and schema come from `public.events`. Without it, changes normally identify the individual publisher leaf table. [CREATE PUBLICATION](https://www.postgresql.org/docs/18/sql-createpublication.html) documents the option and its effect on row filters and column lists.

## Create an independent subscriber layout

On the subscriber:

```sql
CREATE TABLE public.events (
    event_date date NOT NULL,
    event_id bigint NOT NULL,
    payload text NOT NULL,
    PRIMARY KEY (event_date, event_id)
) PARTITION BY HASH (event_id);

CREATE TABLE public.events_bucket_0
    PARTITION OF public.events
    FOR VALUES WITH (MODULUS 2, REMAINDER 0);

CREATE TABLE public.events_bucket_1
    PARTITION OF public.events
    FOR VALUES WITH (MODULUS 2, REMAINDER 1);
```

Both hash remainders are covered. The subscriber key includes `event_id`, its own partition key, and matches the publisher's identity. There is no need to create `events_2026_09` or `events_2026_10` on the subscriber.

A nonpartitioned `public.events` would also be a valid target when its schema and identity are compatible. The [logical replication restrictions](https://www.postgresql.org/docs/18/logical-replication-restrictions.html) describe root-based replication into alternative layouts.

Before starting the copy, keep the subscriber table empty and prohibit local writes. Create all required extensions and compatible types yourself; partition DDL and other schema changes do not travel through logical replication.

## Start the initial copy

This assumes the publisher has `wal_level = logical` and both servers have sufficient replication slots, senders, and worker capacity as described in the [configuration requirements](https://www.postgresql.org/docs/18/logical-replication-config.html). The connection role needs `LOGIN`, `REPLICATION`, and access to the publisher database through `pg_hba.conf`.

On the publisher, grant the established connection role access to the root for this root-publishing setup:

```sql
GRANT USAGE ON SCHEMA public TO logical_replicator;
GRANT SELECT ON public.events TO logical_replicator;
```

Then create the subscription on the subscriber, outside a transaction block, using a role with `pg_create_subscription` and database `CREATE` privileges that can `SET ROLE` to the target table owner. Replace the connection placeholders below. With the default `password_required = true`, a subscription owned by a non-superuser requires a password in the connection string. The subscriber server must also trust the publisher's TLS certificate, whose hostname must match, for `sslmode=verify-full` to work.

```sql
CREATE SUBSCRIPTION events_sub
    CONNECTION 'host=publisher.example.internal dbname=app user=logical_replicator password=REPLACE_WITH_PASSWORD sslmode=verify-full'
    PUBLICATION events_pub
    WITH (copy_data = true);
```

Check relation state:

```sql
SELECT r.srrelid::regclass, r.srsubstate
FROM pg_subscription_rel AS r
JOIN pg_subscription AS s ON s.oid = r.srsubid
WHERE s.subname = 'events_sub';
```

Wait for the root table to reach `r`, or ready, using the meanings in [pg_subscription_rel](https://www.postgresql.org/docs/18/catalog-pg-subscription-rel.html). The table synchronization worker handles the consistent initial snapshot and subsequent catch-up.

## Test routing and identity changes

Insert source rows spanning both date partitions:

```sql
INSERT INTO public.events VALUES
    ('2026-09-15', 101, 'created in September'),
    ('2026-10-03', 202, 'created in October');
```

After committing the publisher inserts, run the following query on the subscriber until both rows appear; replication is asynchronous in this setup. Inspect physical placement:

```sql
SELECT tableoid::regclass AS physical_table,
       event_date, event_id, payload
FROM public.events
ORDER BY event_id;
```

The rows should be present under subscriber hash partitions. Do not predict a bucket from the numeric identifier's parity: PostgreSQL hashes the value before selecting a remainder.

Now move a publisher row across its date boundary:

```sql
UPDATE public.events
SET event_date = '2026-10-15', payload = 'moved to October'
WHERE event_date = '2026-09-15' AND event_id = 101;

DELETE FROM public.events
WHERE event_date = '2026-10-03' AND event_id = 202;
```

After committing the publisher changes, repeat the subscriber query until one updated row remains. The earlier `r` state means initial synchronization is complete, not that every later write has already been applied. These checks exercise root mapping and replica identity, not merely successful initial copying. The [publication identity rules](https://www.postgresql.org/docs/18/logical-replication-publication.html) explain why a usable key is needed for updates and deletes.

## Treat partition maintenance as a separate migration

New subscriber ranges or hash layouts must be deployed before arriving rows require them. If routing fails because no partition accepts a row, create the intended partition and allow apply to retry. Do not skip the transaction to make lag disappear.

Attaching a populated publisher table as a partition does not automatically copy its existing rows merely because the root is published. Plan historical backfill or a coordinated reseed; test it before using partition attachment as a bulk-loading method.

Root publishing also has a specific `TRUNCATE` caveat: truncating a leaf directly is not replicated through `publish_via_partition_root`. This example excludes truncation entirely. For retention policies, design explicit subscriber cleanup or a rehearsed root-level operation with the intended scope.

When converting an existing subscription to root publishing, drain and fence writes, inspect old leaf mappings, and plan target data reconciliation. Simply toggling the option on a busy pipeline does not prove that the new root target contains the old leaf history.
