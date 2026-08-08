# Fix No Replica Identity Errors in PostgreSQL Logical Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Logical Replication, Replica Identity, Primary Key, Unique Index, Troubleshooting

Description: Choose a safe replica identity for PostgreSQL updates and deletes, then deploy it without hiding data-model problems or creating slow apply.

---

A PostgreSQL publication can send an `INSERT` without a replica identity because the new row is self-contained. An `UPDATE` or `DELETE` is different: logical replication must include enough of the old row to identify the corresponding subscriber row. If the published table has no usable identity, PostgreSQL rejects the write on the publisher with an error such as:

```text
ERROR:  cannot update table "orders" because it does not have a replica identity and publishes updates
HINT:  To enable updating the table, set REPLICA IDENTITY using ALTER TABLE.
```

The durable fix is usually a primary key. A qualifying unique index is appropriate when another stable business key identifies the row. `REPLICA IDENTITY FULL` is a fallback for a table that genuinely has no key, not a harmless switch to apply everywhere.

## Confirm the Failing Contract

Start on the publisher. Inspect the table's identity mode and the publications that can emit updates or deletes:

```sql
SELECT n.nspname AS schema_name,
       c.relname AS table_name,
       c.relreplident,
       CASE c.relreplident
           WHEN 'd' THEN 'default'
           WHEN 'n' THEN 'nothing'
           WHEN 'f' THEN 'full'
           WHEN 'i' THEN 'index'
       END AS replica_identity
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE c.oid = 'public.orders'::regclass;
```

```sql
SELECT p.pubname,
       p.pubinsert,
       p.pubupdate,
       p.pubdelete,
       p.pubtruncate
FROM pg_publication AS p
JOIN pg_publication_rel AS pr ON pr.prpubid = p.oid
WHERE pr.prrelid = 'public.orders'::regclass
UNION ALL
SELECT p.pubname,
       p.pubinsert,
       p.pubupdate,
       p.pubdelete,
       p.pubtruncate
FROM pg_publication AS p
WHERE p.puballtables;
```

Schema-level publications and partition ancestry can make membership broader than a direct `pg_publication_rel` row. On PostgreSQL 15 and later, inspect `pg_publication_tables` to see each publication's expanded relation mapping, column list, and row filter. The exact-name filter below checks only `public.orders`; for a partition tree, repeat it for the relevant root and leaf names because the view reports leaves by default and the effective published ancestor when `publish_via_partition_root` is enabled:

```sql
SELECT pubname, schemaname, tablename, attnames, rowfilter
FROM pg_publication_tables
WHERE schemaname = 'public'
  AND tablename = 'orders';
```

The catalog code `d` means `DEFAULT`, which uses the primary key. If no primary key exists, `DEFAULT` behaves as `NOTHING`. The code `i` is only useful while its chosen index still exists. Dropping that index makes the behavior equivalent to `NOTHING`.

## Inventory Candidate Keys Before Choosing One

List primary, unique, immediately enforced, partial, expression, and nullable indexes, plus indexes explicitly selected as replica identity:

```sql
SELECT i.indexrelid::regclass AS index_name,
       i.indisprimary,
       i.indisunique,
       i.indimmediate AS uniqueness_is_immediate,
       i.indisvalid,
       i.indisready,
       i.indisreplident,
       i.indpred IS NOT NULL AS is_partial,
       i.indexprs IS NOT NULL AS has_expressions,
       NOT EXISTS (
           SELECT 1
           FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
           LEFT JOIN pg_attribute AS a
             ON a.attrelid = i.indrelid
            AND a.attnum = k.attnum
           WHERE k.ord <= i.indnkeyatts
             AND (k.attnum = 0 OR a.attnotnull IS NOT TRUE)
       ) AS key_columns_marked_not_null,
       pg_get_indexdef(i.indexrelid) AS definition
FROM pg_index AS i
WHERE i.indrelid = 'public.orders'::regclass
ORDER BY i.indisprimary DESC, i.indisunique DESC, i.indexrelid::regclass::text;
```

A replica-identity index named by `USING INDEX` must be unique, non-partial, non-deferrable, and have only simple key columns marked `NOT NULL`. Do not choose a key merely because its current values happen to be unique. It must continue to identify rows uniquely as changes are applied; prefer a semantically stable key.

Useful questions are:

- Can the value change during an update?
- Can external systems reuse it?
- Does it include tenant scope where uniqueness is tenant-local?
- Are nullable values or partial uniqueness part of its semantics?
- Is the same key and compatible identity available on every subscriber?

## Option 1: Add a Primary Key

A primary key communicates the data model clearly, supplies the default replica identity, enforces uniqueness and non-nullness, and provides the normal target for foreign keys. Prefer it when the table truly has a canonical key.

For a large active table, first prove the data is eligible:

```sql
SELECT id, count(*)
FROM public.orders
GROUP BY id
HAVING count(*) > 1
LIMIT 20;

SELECT count(*) AS null_ids
FROM public.orders
WHERE id IS NULL;
```

If the column is already `NOT NULL`, build the unique index without blocking ordinary writes for the entire scan:

```sql
CREATE UNIQUE INDEX CONCURRENTLY orders_id_uq
ON public.orders (id);
```

Verify that the concurrent build completed successfully:

```sql
SELECT indexrelid::regclass AS index_name,
       indisvalid,
       indisready
FROM pg_index
WHERE indexrelid = 'public.orders_id_uq'::regclass;
```

Then attach it as the primary key and explicitly select `DEFAULT`. Adding a primary key does not replace an existing `NOTHING`, `FULL`, or `USING INDEX` setting:

```sql
ALTER TABLE public.orders
ADD CONSTRAINT orders_pkey PRIMARY KEY USING INDEX orders_id_uq;

ALTER TABLE public.orders
REPLICA IDENTITY DEFAULT;
```

If `id` is nullable, changing it to `NOT NULL` requires validation. PostgreSQL can sometimes prove null absence from an existing valid constraint, but the exact locking and scan behavior depends on the migration and release. Rehearse it with production-sized data.

The concurrent index examples in Options 1 and 2 are for non-partitioned tables. On a partitioned parent, `CREATE INDEX CONCURRENTLY` and `ADD CONSTRAINT ... USING INDEX` are not supported; build and attach indexes per partition, and ensure that any parent primary key or unique constraint includes every partition-key column.

A compatible replica identity must exist on the subscriber before incoming changes rely on it; it need not be declared as a primary key. PostgreSQL's logical replication documentation requires a subscriber replica identity with the same or fewer columns when the publisher identity is not `FULL`. Keep constraints aligned so apply does not accept a row shape that the publisher rejects, or reject one the publisher accepts.

## Option 2: Select a Unique Index

Use an existing stable business key without promoting it to primary key:

```sql
ALTER TABLE public.orders
REPLICA IDENTITY USING INDEX orders_tenant_external_id_uq;
```

A suitable definition might be:

```sql
CREATE UNIQUE INDEX CONCURRENTLY orders_tenant_external_id_uq
ON public.orders (tenant_id, external_id);
```

Both columns must be `NOT NULL` before PostgreSQL accepts that index as replica identity. A partial unique index such as `WHERE deleted_at IS NULL` is not eligible, because rows outside its predicate would have no identity. A deferrable unique constraint is not eligible either.

Selecting an index as replica identity does not create a primary key or add a new uniqueness rule. It changes which old key values PostgreSQL records in WAL for logical decoding and can make published updates and deletes permissible. Keep the index protected in schema migrations: if it is dropped, published updates and deletes fail again.

Apply the compatible index and identity on subscribers as part of the same controlled rollout. Check the result on each node:

```sql
SELECT i.indexrelid::regclass AS replica_identity_index
FROM pg_index AS i
WHERE i.indrelid = 'public.orders'::regclass
  AND i.indisreplident;
```

## Option 3: Use `REPLICA IDENTITY FULL`

If the table has no defensible key, PostgreSQL can log the old values of all columns:

```sql
ALTER TABLE public.orders
REPLICA IDENTITY FULL;
```

This lets logical replication represent updates and deletes, but it does not make the row unique and it does not add a constraint. It has three operational costs:

- WAL records can be larger because all old column values are available as the identity.
- Subscriber row lookup can be more expensive than a narrow key lookup.
- Duplicate rows or datatypes without suitable equality support can make matching difficult or unsupported.

Current PostgreSQL can use eligible B-tree or hash indexes on the subscriber to help search when the publisher uses `FULL`. If none is suitable, apply can be very inefficient. The logical replication restrictions also warn that `UPDATE` and `DELETE` cannot be applied for `FULL` tables containing attributes whose datatypes lack a default B-tree or hash operator class. A primary key or explicit replica identity avoids that limitation.

Use `FULL` deliberately for small, low-change, keyless tables, or as a time-bounded bridge while a real key is introduced. Measure WAL generation and apply throughput before and after:

```sql
SELECT pg_current_wal_lsn();
```

Capture this over a representative interval and compare with `pg_wal_lsn_diff()`. A single point does not give a rate.

## Why `NOTHING` Is Sometimes Correct

An append-only table in an insert-only publication does not need an identity:

```sql
CREATE PUBLICATION audit_insert_pub
FOR TABLE public.audit_events
WITH (publish = 'insert');
```

The publication's `publish` option controls ongoing DML, not the initial data copy. If any other effective publication includes the same table and publishes updates or deletes, the table still needs an identity for those operations.

Do not change a shared publication to insert-only during an incident without checking every table and subscriber that uses it. That can silently stop sending legitimate update and delete changes. Fix the identity or separate publication responsibilities instead.

## Coordinate Publisher and Subscriber Definitions

Logical replication does not copy the `ALTER TABLE` command. Deploy the key and compatible identity to subscribers, then publisher, and only then release the writer that performs updates or deletes. For a new primary key or unique constraint, first reconcile duplicates independently on each side.

If publications use column lists, every column in the replica identity must be published for `UPDATE` and `DELETE`. If they use row filters, columns referenced by those filters must also satisfy the documented replica-identity rules for the published operation.

Partitioned tables need topology-aware testing. By default, changes are published using leaf partition identity and schema. A publication with `publish_via_partition_root = true` uses the identity and schema of the topmost partitioned ancestor included in the publication instead. Inspect the effective publication and every relevant root and leaf rather than changing only the table named in application SQL.

## Verify the Repair

Make one canary row exercise each published operation. Run and commit each statement separately, waiting for the subscriber to catch up before continuing:

```sql
INSERT INTO public.orders (id, tenant_id, external_id, status)
VALUES (900000001, 42, 'replica-identity-canary', 'created');

UPDATE public.orders
SET status = 'verified'
WHERE id = 900000001;

DELETE FROM public.orders
WHERE id = 900000001;
```

Use a collision-free test key whose values satisfy any row filters, and do this only where canary writes are acceptable. After the `INSERT`, verify the `created` row on the subscriber; after the `UPDATE`, verify the `verified` status; after the `DELETE`, verify its absence. On PostgreSQL 17 and later, also inspect worker activity:

```sql
SELECT subname,
       worker_type,
       pid,
       received_lsn,
       latest_end_lsn,
       last_msg_receipt_time
FROM pg_stat_subscription
ORDER BY subname, worker_type;
```

An apply worker can fail for subscriber-side uniqueness, permissions, triggers configured to fire in replica mode, or schema drift even after the publisher identity error is fixed. Preserve the first error instead of treating worker presence alone as proof of correctness.

## Decision Guide

| Choice | Use when | Avoid when |
| --- | --- | --- |
| Primary key | One canonical, immutable row key exists | The proposed values are not truly unique or stable |
| Unique index identity | A different non-null business key is the replication contract | The index is partial, deferrable, nullable, or likely to be dropped |
| `FULL` | A keyless table must publish updates or deletes | The table is wide, frequently changed, large, duplicated, or uses unsupported equality types |
| `NOTHING` | All effective publications are genuinely insert-only | Any update or delete must be published |

The smallest key that faithfully represents row identity usually produces the clearest model and most efficient apply.

## Official Documentation

- [PostgreSQL publications and replica identity](https://www.postgresql.org/docs/current/logical-replication-publication.html)
- [PostgreSQL `ALTER TABLE` replica identity forms](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL logical replication restrictions](https://www.postgresql.org/docs/current/logical-replication-restrictions.html)
- [PostgreSQL `CREATE PUBLICATION`](https://www.postgresql.org/docs/current/sql-createpublication.html)
- [PostgreSQL logical replication column lists](https://www.postgresql.org/docs/current/logical-replication-col-lists.html)
- [PostgreSQL logical replication row filters](https://www.postgresql.org/docs/current/logical-replication-row-filter.html)

## Conclusion

A no-replica-identity error is PostgreSQL protecting the subscriber from an unidentifiable change. Add a primary key when the data has a canonical key, select a qualifying unique index when another stable key is intentional, and reserve `REPLICA IDENTITY FULL` for measured keyless cases. Coordinate the identity on both sides and validate real insert, update, and delete flow before declaring the repair complete.
