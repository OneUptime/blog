# Deploy PostgreSQL DDL Safely with Logical Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Logical Replication, DDL, Schema Migration, Deployment, Zero Downtime

Description: Deploy PostgreSQL schema changes across publishers and subscribers without stopping apply workers or silently omitting data.

---

PostgreSQL logical replication copies table data changes, not schema definitions or DDL commands. An `ALTER TABLE` on the publisher does not alter the subscriber. If a later replicated row no longer fits the subscriber's table, the apply worker errors and retries until the subscriber schema is made compatible.

The safe default is therefore **expand the subscriber first, expand the publisher second, deploy writers last; contract the publisher first and the subscriber last**. That rule is a starting point, not a substitute for examining publication column lists, defaults, constraints, binary transfer, and mixed application versions.

## Know What Logical Replication Matches

Publisher and subscriber tables are matched by fully qualified name. Columns are matched by name, not ordinal position. In the normal text format their types do not have to be identical if the publisher's textual value can be converted to the subscriber's type. A subscription using `binary = true` has stricter type and cross-version requirements.

The subscriber may have extra columns that are not supplied by the publisher. PostgreSQL fills those columns from their subscriber-side defaults. This is useful during an additive rollout, but it also means a volatile or environment-specific default can create different data on the two systems.

Inventory the data contract before changing it. On the publisher:

```sql
SELECT pubname,
       schemaname,
       tablename,
       attnames,
       rowfilter
FROM pg_publication_tables
WHERE schemaname = 'public'
  AND tablename = 'orders'
ORDER BY pubname;
```

On every publisher and subscriber, compare the live columns rather than trusting migration history:

```sql
SELECT a.attnum,
       a.attname,
       format_type(a.atttypid, a.atttypmod) AS data_type,
       a.attnotnull,
       pg_get_expr(d.adbin, d.adrelid) AS column_default
FROM pg_attribute AS a
LEFT JOIN pg_attrdef AS d
  ON d.adrelid = a.attrelid
 AND d.adnum = a.attnum
WHERE a.attrelid = 'public.orders'::regclass
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY a.attnum;
```

Also record subscription options. In particular, find subscriptions using binary transfer and publications using explicit column lists:

```sql
SELECT subname, subenabled, subbinary, subpublications
FROM pg_subscription
WHERE subdbid = (
    SELECT oid FROM pg_database WHERE datname = current_database()
);
```

Run these queries on the server where each catalog lives. `pg_publication_tables` is publisher-side; `pg_subscription` is subscriber-side.

## Adding a Nullable Column

For a publication that sends all table columns, use this order:

1. Add a compatible nullable column on every subscriber.
2. Add the same column on the publisher.
3. Deploy publisher applications that write it.
4. Deploy readers that consume it.
5. Backfill and add stronger constraints only after all copies agree.

For example, first run on each subscriber:

```sql
ALTER TABLE public.orders
ADD COLUMN fulfillment_note text;
```

Then run the same DDL on the publisher. Until step 2, incoming rows omit the extra subscriber column and it remains `NULL`. After the publisher column exists, a publication without a column list includes it in future row changes.

Do not introduce the column as `NOT NULL` on the subscriber merely because the final design requires it. Old publisher messages cannot provide a value. Use a staged constraint:

```sql
ALTER TABLE public.orders
ADD CONSTRAINT orders_fulfillment_note_present
CHECK (fulfillment_note IS NOT NULL) NOT VALID;
```

Add that constraint only after the column exists everywhere and the backfill is complete, then validate it:

```sql
ALTER TABLE public.orders
VALIDATE CONSTRAINT orders_fulfillment_note_present;
```

Whether a particular `ALTER TABLE` rewrites a table or how strongly it blocks concurrent work depends on the exact release and expression. Test the precise migration against production-sized data; replication correctness does not remove DDL lock risk.

## Explicit Publication Column Lists Change the Rollout

An explicit column list is an allowlist. Adding a publisher column does not start replicating it until the publication is altered. Use this order:

1. Add the column to subscribers.
2. Add it to the publisher, while applications still leave it unused or write a safe default.
3. Add it to every relevant publication column list.
4. Deploy application writers.

The following command is safe as written only when `orders_pub` is a single-table publication:

```sql
ALTER PUBLICATION orders_pub
SET TABLE public.orders (
    id,
    customer_id,
    status,
    fulfillment_note,
    updated_at
);
```

`SET TABLE` replaces the publication's complete table membership. For a multi-table publication, restate every existing table, schema member, row filter, and column list in the command, or use an appropriate `ALTER PUBLICATION ... ADD/DROP/SET TABLE` sequence that preserves the intended membership. Inspect the effective publication after the change.

Publication changes are transactional. However, adding a column to the list does not retroactively copy values written while it was excluded. If writers used the column before step 3, explicitly backfill the subscriber or perform a controlled table resynchronization. Do not assume `ALTER SUBSCRIPTION ... REFRESH PUBLICATION` recopies an already subscribed table; refresh discovers publication membership changes, and its `copy_data` behavior applies to tables newly added during the refresh.

Column lists that publish `UPDATE` or `DELETE` must include the replica-identity columns. Check that invariant before committing the publication change.

## Dropping a Column

Contract changes reverse the dependency. With no publication column list, leave the old column on subscribers while the publisher stops sending it:

1. Deploy application code that no longer requires or writes the column.
2. Drop the column on the publisher.
3. Confirm replication still advances and subscriber data is no longer needed.
4. Drop the now-extra column on subscribers.

If a column list is in use, first remove the column from the publication while it still exists on both sides. Then stop writers, drop it on the publisher, and finally drop it on subscribers. This abbreviated example again assumes `orders_pub` contains only this table:

```sql
ALTER PUBLICATION orders_pub
SET TABLE public.orders (id, customer_id, status, updated_at);
```

For a multi-table publication, `SET TABLE` must restate every member and all per-table options. Omitting them removes them from the publication.

Never drop a still-published column from the subscriber first. The next relation mapping or row change that contains it can stop apply.

## Treat a Rename as Add, Migrate, and Drop

Because columns match by name, a direct rename on one side creates an incompatible contract. A direct rename performed separately on both sides also leaves a timing window in which one schema cannot consume the other's messages.

Use an expand-and-contract migration instead:

```sql
ALTER TABLE public.orders
ADD COLUMN delivery_instructions text;
```

Add the new column subscriber-first and publisher-second. Dual-write old and new columns on the publisher, backfill the publisher, let those updates replicate, switch readers to the new name, stop writing the old name, and then retire the old column using the drop sequence above.

Avoid subscriber-side dual-write triggers as an invisible bridge unless they are deliberately configured to fire for replica sessions and thoroughly tested. Logical apply runs with `session_replication_role = replica`, so ordinary triggers do not fire for ongoing apply. Initial table synchronization behaves like `COPY` and has different trigger behavior.

## Changing a Type

An in-place type change is safe only if the subscriber can decode both the old and new representations throughout the mixed-schema window. Widening `integer` to `bigint` illustrates a workable sequence:

```sql
-- Subscribers first
ALTER TABLE public.orders
ALTER COLUMN external_number TYPE bigint;

-- Publisher second
ALTER TABLE public.orders
ALTER COLUMN external_number TYPE bigint;
```

That direction works with normal text transfer because old integer text is valid input for `bigint`. The reverse direction can overflow. Changes involving enums, domains, collations, extension types, precision loss, or incompatible casts need a new-column migration instead of an assumed in-place bridge.

If `subbinary` is true, do not infer compatibility from a SQL cast or from text mode. PostgreSQL documents binary transfer as type-specific and less portable between versions. Rehearse the exact publisher/subscriber version pair, or temporarily rebuild the subscription design around text transfer through a planned procedure.

## Indexes and Constraints Need Their Own Order

Indexes, primary keys, foreign keys, defaults, generated expressions, policies, and replica identity are schema, so none arrives automatically.

For a new subscriber index, build it before traffic depends on it. On a busy table, a standalone index can often be built with:

```sql
CREATE INDEX CONCURRENTLY orders_updated_at_idx
ON public.orders (updated_at);
```

`CREATE INDEX CONCURRENTLY` cannot run inside a transaction block and has failure states that must be checked in `pg_index`. Follow the documentation for the PostgreSQL major version actually running.

Be more cautious with unique constraints. A new unique index on the subscriber can reveal pre-existing divergence and can later reject replicated rows even if the publisher lacks the same constraint. Compare duplicates first and make both sides enforce the same invariant.

For foreign keys or checks on large populated tables, a staged `NOT VALID` constraint followed by `VALIDATE CONSTRAINT` can reduce the lock held during the data scan. Apply the constraint in an order that never rejects rows the publisher can still produce.

Replica identity deserves separate coordination. If an application begins `UPDATE` or `DELETE` while a published table has no usable identity, the publisher operation fails. Establish and verify the key before publishing those operations or deploying the writer.

## A Deployment Gate That Catches Most Mistakes

Before each phase, record:

- publisher and subscriber major/minor versions;
- publication membership, row filters, column lists, and published operations;
- subscription `binary`, `streaming`, and enabled state;
- column names, types, defaults, generated expressions, and nullability;
- primary keys, unique constraints, replica identity, indexes, and foreign keys;
- expected old-application and new-application behavior in the mixed state.

Then make one representative insert, update, and delete on a canary row and verify it on every subscriber. Observe worker state rather than relying only on row counts:

```sql
SELECT subname,
       worker_type,
       pid,
       received_lsn,
       latest_end_lsn,
       last_msg_receipt_time
FROM pg_stat_subscription
ORDER BY subname, worker_type, pid;
```

Preserve the PostgreSQL logs. An enabled subscription with no apply worker, a rising apply error counter, or a table that never reaches `r` in `pg_subscription_rel` is a failed deployment even when the DDL command itself succeeded.

## Recovery From a Wrong-Order Change

If apply has stopped because the subscriber schema is incompatible:

1. Stop further application rollout and preserve the first apply error.
2. Determine the exact relation, column, and conversion that failed.
3. Make the subscriber schema compatible with both queued and future messages.
4. Let the same transaction retry; do not skip it merely to clear the alert.
5. Compare the affected rows after apply resumes.

Disabling a subscription can quiet retries, but its publisher slot can continue retaining WAL. If you disable it, monitor retained bytes and keep the maintenance window bounded:

```sql
ALTER SUBSCRIPTION orders_sub DISABLE;
-- apply the subscriber-side repair
ALTER SUBSCRIPTION orders_sub ENABLE;
```

Skipping a remote transaction discards every change in that transaction and is not a schema-migration technique.

## Official Documentation

- [PostgreSQL logical replication restrictions](https://www.postgresql.org/docs/current/logical-replication-restrictions.html)
- [PostgreSQL logical replication subscriptions](https://www.postgresql.org/docs/current/logical-replication-subscription.html)
- [PostgreSQL logical replication architecture and initial snapshot](https://www.postgresql.org/docs/current/logical-replication-architecture.html)
- [PostgreSQL `CREATE PUBLICATION`](https://www.postgresql.org/docs/current/sql-createpublication.html)
- [PostgreSQL `ALTER PUBLICATION`](https://www.postgresql.org/docs/current/sql-alterpublication.html)
- [PostgreSQL `ALTER TABLE`](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL logical replication monitoring](https://www.postgresql.org/docs/current/logical-replication-monitoring.html)

## Conclusion

Logical replication makes schema coordination an explicit deployment responsibility. Expand subscribers before publishers, delay writers until the replicated contract exists everywhere, and contract subscribers last. Adjust that order for publication column lists, type encoding, constraints, and mixed application versions, and verify each phase through catalog state, canary DML, worker progress, and server logs.
