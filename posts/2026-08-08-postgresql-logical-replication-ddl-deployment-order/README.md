# Deploy PostgreSQL DDL Safely with Logical Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Logical Replication, DDL, Schema Migration, Deployment, Zero Downtime

Description: Deploy PostgreSQL schema changes across publishers and subscribers without stopping apply workers or silently omitting data.

---

PostgreSQL logical replication copies table data changes, not schema definitions or DDL commands. An `ALTER TABLE` on the publisher does not alter the subscriber. If a later replicated row no longer fits the subscriber's table, the apply worker errors and, by default, retries until the subscriber schema is made compatible. With `disable_on_error = true`, PostgreSQL disables the subscription after a worker error instead.

The safe default is therefore **expand the subscriber first, expand the publisher second, deploy writers last; contract the publisher first and the subscriber last**. That rule is a starting point, not a substitute for examining publication column lists, defaults, constraints, binary transfer, and mixed application versions.

## Know What Logical Replication Matches

Publisher and subscriber tables are matched by fully qualified name. Columns are matched by name, not ordinal position. In the normal text format their types do not have to be identical if the publisher's textual value can be converted to the subscriber's type. A subscription using `binary = true` has stricter type and cross-version requirements.

The subscriber may have extra columns that are not supplied by the publisher. PostgreSQL fills those columns from their subscriber-side defaults. This is useful during an additive rollout, but it also means a volatile or environment-specific default can create different data on the two systems.

Inventory the data contract before changing it. The publication catalog query below targets PostgreSQL 15 and later, the first release with publication row filters and column lists. On the publisher:

```sql
SELECT pt.pubname,
       pt.schemaname,
       pt.tablename,
       pt.attnames,
       pt.rowfilter,
       pr.prattrs IS NOT NULL AS has_pg_publication_rel_column_list
FROM pg_publication_tables AS pt
JOIN pg_publication AS p
  ON p.pubname = pt.pubname
LEFT JOIN pg_publication_rel AS pr
  ON pr.prpubid = p.oid
 AND pr.prrelid = 'public.orders'::regclass
WHERE pt.schemaname = 'public'
  AND pt.tablename = 'orders'
ORDER BY pt.pubname;
```

`attnames` shows the columns reported by the publication view, but it cannot distinguish an omitted list from an explicit list naming every current column. On PostgreSQL 15 through 17, an omitted list can also make it show stored generated columns even though those releases do not replicate generated-column values. A non-`NULL` `prattrs` shows that the matching `pg_publication_rel` row stores a column list, but it does not prove that `orders` was named separately because inheritance expansion can create child mappings. Inspect the ancestor publication definition as well when a partition or inheritance child is included through an ancestor.

On every publisher and subscriber, compare the live columns rather than trusting migration history:

```sql
SELECT a.attnum,
       a.attname,
       format_type(a.atttypid, a.atttypmod) AS data_type,
       a.attnotnull,
       a.attidentity,
       a.attgenerated,
       pg_get_expr(d.adbin, d.adrelid)
           AS default_or_generation_expression
FROM pg_attribute AS a
LEFT JOIN pg_attrdef AS d
  ON d.adrelid = a.attrelid
 AND d.adnum = a.attnum
WHERE a.attrelid = 'public.orders'::regclass
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY a.attnum;
```

Also record subscription options. On PostgreSQL 15 and later, this includes whether worker errors automatically disable the subscription:

```sql
SELECT subname,
       subenabled,
       subbinary,
       substream,
       subdisableonerr,
       subpublications
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
5. After every writer version produces valid values, backfill and add stronger constraints only after replication catches up.

For example, first run on each subscriber:

```sql
ALTER TABLE public.orders
ADD COLUMN fulfillment_note text;
```

Then run the same DDL on the publisher. Until step 2, incoming rows omit the extra subscriber column and it remains `NULL`. After the publisher column exists, a publication without a column list includes it in future row changes.

Do not introduce the column as `NOT NULL` on the subscriber merely because the final design requires it. Old publisher messages cannot provide a value. After all writer versions are compatible and the publisher backfill is complete, add and validate a staged constraint on the publisher first:

```sql
ALTER TABLE public.orders
ADD CONSTRAINT orders_fulfillment_note_present
CHECK (fulfillment_note IS NOT NULL) NOT VALID;

ALTER TABLE public.orders
VALIDATE CONSTRAINT orders_fulfillment_note_present;
```

`NOT VALID` skips the initial table scan, but it still rejects subsequent inserts or updates that violate the check. Wait until every subscriber has replayed through the publisher cutover, then run the same two statements on each subscriber. Adding this check on subscribers earlier could reject queued changes from old writers.

Whether a particular `ALTER TABLE` rewrites a table or how strongly it blocks concurrent work depends on the exact release and expression. Test the precise migration against production-sized data; replication correctness does not remove DDL lock risk.

## Explicit Publication Column Lists Change the Rollout

An explicit column list is an allowlist. Adding a publisher column does not start replicating it until the publication is altered. Use this order:

1. Add the column to subscribers.
2. In one publisher transaction, add the column and add it to every relevant explicit publication column list.
3. Commit that transaction while applications still leave the column unused or write a safe default.
4. Deploy application writers only after every subscriber is ready.

A subscription cannot combine publications that publish the same table with different column lists. Updating all affected definitions atomically also covers the case where one publication has no list: adding the table column automatically expands that publication, so a separately committed explicit-list change would create an unsupported mixed-list window.

The following command is safe as written only when `public.orders` is the publication's sole explicitly listed object, it has no row filter, and it is not a partitioned table unless `publish_via_partition_root = true`. The command must also preserve the existing `ONLY` or descendant-inclusion behavior. It is not safe as a replacement for `FOR ALL TABLES` or `TABLES IN SCHEMA` membership:

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

`SET TABLE` replaces the publication's complete table and schema membership. For a multi-object publication, restate every explicitly listed table with its `ONLY` or descendant behavior, row filter, and column list. A publication containing a column list cannot also contain `TABLES IN SCHEMA`; use a separate publication or replace the schema membership with explicit table entries. When `publish_via_partition_root = false`, put column lists on the leaf partitions rather than the partitioned root. Inspect the effective publication after the change.

Publication changes are transactional. However, adding a column to the list does not retroactively copy values written while it was excluded. If writers used the column before step 3, explicitly backfill the subscriber or perform a controlled table resynchronization. Subscribers older than PostgreSQL 15 ignore column lists during initial table synchronization and copy every publisher column, so account for that before resynchronizing. Do not assume `ALTER SUBSCRIPTION ... REFRESH PUBLICATION` recopies an already subscribed table; refresh discovers publication membership changes, and its `copy_data` behavior applies to tables newly added during the refresh.

Column lists that publish `UPDATE` or `DELETE` must include the replica-identity columns. With `REPLICA IDENTITY FULL`, however, any column list causes those operations to fail, even one that names every column; omit the list or establish a non-`FULL` identity. Check that invariant before committing the publication change.

## Dropping a Column

Contract changes reverse the dependency. With no publication column list, leave the old column on subscribers while the publisher stops sending it:

1. Deploy application code that no longer requires or writes the column.
2. Drop the column on the publisher.
3. Wait until every subscriber has replayed a post-change canary transaction; confirm replication still advances and subscriber data is no longer needed.
4. Drop the now-extra column on subscribers.

If a column list is in use, first deploy code that no longer requires or writes the column. Then, in one publisher transaction, remove the column from every relevant publication list and drop it from the publisher. Keeping those operations atomic avoids a mixed-list window when a subscription also receives the table from a publication without a list. After every subscriber has replayed a post-change canary transaction, drop the column on subscribers. This abbreviated example has the same assumptions as the earlier `SET TABLE` example:

```sql
BEGIN;
ALTER PUBLICATION orders_pub
SET TABLE public.orders (id, customer_id, status, updated_at);
ALTER TABLE public.orders
DROP COLUMN fulfillment_note;
COMMIT;
```

For a multi-object publication, `SET TABLE` must restate every explicitly listed table and all per-table options. It also removes existing schema memberships, which cannot coexist with a column list.

If the old column is referenced by a publication row filter, replace or remove that filter in the same transaction while preserving the other publication objects and options. A filter change does not reconcile rows already on the subscriber: explicitly backfill rows newly admitted by a broader filter and delete rows excluded by a narrower filter, or perform a controlled resynchronization. If the column belongs to the replica identity, establish a replacement identity first; a column list publishing `UPDATE` or `DELETE` must retain the active replica-identity columns.

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

An in-place type change is safe only if the subscriber can decode both the old and new representations throughout the mixed-schema window. PostgreSQL 15 through 18 reject `ALTER COLUMN ... TYPE` while that column is referenced by a publication column list or row filter. PostgreSQL 19 Beta 2 permits the change when the column is used only in a column list, but still rejects it when a row filter depends on the column. The following `integer`-to-`bigint` sequence assumes no blocking dependency for the release in use; otherwise, atomically remove and restore the affected publication definitions in a rehearsed procedure, or use a new-column migration:

```sql
-- Subscribers first
ALTER TABLE public.orders
ALTER COLUMN external_number TYPE bigint;

-- Publisher second
ALTER TABLE public.orders
ALTER COLUMN external_number TYPE bigint;
```

That direction works with normal text transfer because old integer text is valid input for `bigint`. The reverse direction can overflow. Enums, domains, collations, extension types, precision-changing casts, and other nontrivial conversions require case-by-case analysis; incompatible or lossy bridges need a new-column migration.

If `subbinary` is true, do not infer compatibility from a SQL cast or from text mode. PostgreSQL documents binary transfer as type-specific and less portable between versions. Rehearse the exact publisher/subscriber version pair, or temporarily switch the subscription to text transfer through a planned procedure.

## Indexes and Constraints Need Their Own Order

Indexes, primary keys, foreign keys, defaults, generated expressions, policies, and replica identity are schema, so none arrives automatically.

For a new subscriber index, build it before traffic depends on it. On a busy table, a standalone index can often be built with:

```sql
CREATE INDEX CONCURRENTLY orders_updated_at_idx
ON public.orders (updated_at);
```

`CREATE INDEX CONCURRENTLY` cannot run inside a transaction block and has failure states that must be checked in `pg_index`. Follow the documentation for the PostgreSQL major version actually running.

Be more cautious with unique constraints. A new unique index on the subscriber can reveal pre-existing divergence and can later reject replicated rows even if the publisher lacks the same constraint. Compare duplicates first and make both sides enforce the same invariant.

For foreign keys or checks on large populated tables, a staged `NOT VALID` constraint followed by `VALIDATE CONSTRAINT` can reduce the lock held during the data scan. Check constraints are enforced for replicated rows. Ordinary foreign-key triggers are not, because logical apply uses `session_replication_role = replica`; enforce the corresponding invariant on the publisher and validate subscriber foreign keys after catch-up unless their constraint triggers have deliberately been configured and tested to fire for replica sessions. Apply constraints that do run during apply in an order that never rejects rows the publisher can still produce.

Replica identity deserves separate coordination. If an application performs an `UPDATE` or `DELETE` that a publication is configured to publish while the table has no usable publisher identity, the publisher operation fails. Establish and verify that identity before publishing those operations or deploying the writer. When the publisher identity is not `FULL`, the subscriber must also have a replica identity comprising the same or fewer columns.

## A Deployment Gate That Catches Most Mistakes

Before each phase, record:

- publisher and subscriber major/minor versions;
- publication membership, row filters, column lists, published operations, and generated-column publication settings where supported;
- subscription `binary`, `streaming`, `disable_on_error`, and enabled state;
- column names, types, defaults, generated expressions, and nullability;
- primary keys, unique constraints, replica identity, indexes, and foreign keys;
- expected old-application and new-application behavior in the mixed state.

Then make one representative insert, update, and delete on a canary row and verify it on every subscriber. Observe worker state rather than relying only on row counts:

```sql
SELECT subname,
       pid,
       relid::regclass AS synchronization_table,
       received_lsn,
       latest_end_lsn,
       last_msg_receipt_time
FROM pg_stat_subscription
ORDER BY subname, pid;
```

Using `relid` keeps this query valid on PostgreSQL 14 through 18; on PostgreSQL 17 and later, add `worker_type` to distinguish apply, parallel-apply, and table-synchronization workers directly.

Preserve the PostgreSQL logs. An enabled subscription that persistently has no apply worker, a rising `pg_stat_subscription_stats.apply_error_count` on PostgreSQL 15 or later, or a table that never reaches `r` in `pg_subscription_rel` is a failed deployment even when the DDL command itself succeeded.

## Recovery From a Wrong-Order Change

If apply has stopped because the subscriber schema is incompatible:

1. Stop further application rollout and preserve the first apply error.
2. Determine the exact relation, column, and conversion that failed.
3. Make the subscriber schema compatible with both queued and future messages.
4. If the subscription was disabled manually or by `disable_on_error`, enable it after the repair; then let the same transaction retry rather than skipping it merely to clear the alert.
5. Compare the affected rows after apply resumes.

Disabling a subscription can quiet retries, but its publisher slot can continue retaining WAL. If you disable it, monitor retained bytes and keep the maintenance window bounded:

```sql
ALTER SUBSCRIPTION orders_sub DISABLE;
-- apply the subscriber-side repair
ALTER SUBSCRIPTION orders_sub ENABLE;
```

Skipping a remote transaction discards every replicated data-modification change in that transaction and does not affect transactions already prepared on the subscriber by two-phase replication. It is not a schema-migration technique.

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
