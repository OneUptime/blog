# How to Add a Table to a PostgreSQL Publication and Start Its Initial Copy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Logical Replication, Database, Troubleshooting

Description: Add a PostgreSQL table to an existing publication, refresh each subscriber, and verify its initial copy without recopying established tables.

Adding a table to a PostgreSQL publication changes what the publisher offers. It does not create the subscriber's table or automatically update an existing subscription's table list. A complete rollout prepares the target, adds publication membership, refreshes the subscription, and verifies synchronization.

This guide uses PostgreSQL 18 with an existing `sales_pub` publication and `sales_sub` subscription. The new table is `public.invoice_lines`, and the example has no row filters, column lists, partitions, or foreign-key dependencies. Existing replicated tables remain under their current subscription.

## Prepare the table contract first

For illustration, the publisher table is:

```sql
CREATE TABLE public.invoice_lines (
    line_id bigint PRIMARY KEY,
    invoice_id bigint NOT NULL,
    amount_cents bigint NOT NULL
);
```

Create a compatible, empty table with the same schema-qualified name on every subscriber before changing publication membership. Do not run `CREATE TABLE` again if it already exists; inspect and reconcile it instead. Logical replication does not transport DDL, and matching table names matter. See [logical replication restrictions](https://www.postgresql.org/docs/18/logical-replication-restrictions.html).

The target may have intentional extra columns, but their defaults and constraints must accept incoming rows. Keep local application writes away from the target. Initial copy appends source rows; it is not an upsert or a cleanup operation for existing target data.

Check the publisher table's primary key or other replica identity. For this example, the primary key identifies rows for subsequent updates and deletes. An insert-only smoke test would not expose a missing identity.

## Confirm initial-copy access and capacity

On the publisher, grant the existing replication connection role access to the new table:

```sql
GRANT USAGE ON SCHEMA public TO logical_replicator;
GRANT SELECT ON public.invoice_lines TO logical_replicator;

SELECT has_table_privilege(
    'logical_replicator', 'public.invoice_lines', 'SELECT'
) AS can_copy;
```

The role already needs replication connectivity, but that does not replace `SELECT` for initial copying. [Logical replication security](https://www.postgresql.org/docs/18/logical-replication-security.html) documents this distinction. Review row-security behavior if the table uses RLS.

Allow disk space for the new data, its indexes, and WAL generated during the load. On a busy installation, check the available replication-slot, WAL-sender, and logical-worker capacity before starting another table copy. A table waiting for a worker is a different problem from a worker failing on a constraint.

## Add membership and refresh subscribers

On the publisher, as the publication owner with the required table ownership rights:

```sql
ALTER PUBLICATION sales_pub
    ADD TABLE public.invoice_lines;

SELECT pubname, schemaname, tablename, attnames, rowfilter
FROM pg_publication_tables
WHERE pubname = 'sales_pub'
  AND schemaname = 'public'
  AND tablename = 'invoice_lines';
```

Prefer `ADD TABLE` for this operation. `SET TABLE` replaces the publication's complete membership and could accidentally remove existing tables. The difference is documented in [ALTER PUBLICATION](https://www.postgresql.org/docs/18/sql-alterpublication.html).

On each subscriber, while the subscription is enabled, run this top-level command:

```sql
ALTER SUBSCRIPTION sales_sub
    REFRESH PUBLICATION WITH (copy_data = true);
```

Do not wrap it in `BEGIN`. The refresh starts synchronization for newly discovered tables; previously subscribed tables are not copied again. If two-phase commit is already enabled for the subscription, PostgreSQL restricts refresh with copying, so plan that case separately. See [ALTER SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-altersubscription.html).

A publication using `FOR ALL TABLES` or `FOR TABLES IN SCHEMA` may already include the table automatically. In that case, do not issue an unnecessary explicit add; the subscriber still needs a compatible target and a refresh to discover it.

## Observe the copy and prove change capture

On the subscriber:

```sql
SELECT r.srrelid::regclass AS table_name,
       r.srsubstate, r.srsublsn
FROM pg_subscription_rel AS r
JOIN pg_subscription AS s ON s.oid = r.srsubid
WHERE s.subname = 'sales_sub'
  AND r.srrelid = 'public.invoice_lines'::regclass;
```

The eventual state is `r`, meaning ready. Other states describe stages of initialization and catch-up; use the [subscription relation catalog](https://www.postgresql.org/docs/18/catalog-pg-subscription-rel.html) when interpreting them.

During a rehearsal, insert a row before refresh, update it during the copy, and insert a second row afterward. Verify the final values and a subsequent delete on the subscriber. PostgreSQL's synchronization worker copies a snapshot and catches up concurrent changes before normal apply takes ownership, as described in the [replication architecture](https://www.postgresql.org/docs/18/logical-replication-architecture.html).

## Recover from a failed rollout

A duplicate-key failure often means the target was not empty. Preserve any target-only data and decide which dataset is authoritative before clearing anything. Permission or type errors should be fixed at their cause; table workers can retry after correction.

If no catalog row appears, check the publication list in `pg_subscription`, confirm you refreshed the intended database, and inspect the effective publisher membership. If you accidentally used `copy_data = false`, another refresh with `true` will not recopy the now-known table. Perform a controlled table reseed instead of assuming the second command repairs historical data.

Keep rollout completion tied to a ready table, verified historical rows, and verified future DML. A successful `ALTER PUBLICATION` alone proves only that the publisher accepted the membership change.
