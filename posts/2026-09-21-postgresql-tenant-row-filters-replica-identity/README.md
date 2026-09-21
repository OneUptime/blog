# How to Replicate Tenant Rows with PostgreSQL Row Filters and a Matching Replica Identity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Logical Replication, Multi-Tenancy, Database

Description: Replicate a tenant-specific PostgreSQL dataset with row filters, an identity that includes tenant_id, and tests for rows entering or leaving the filter.

A tenant row filter must work for more than the first insert. When a row changes tenant or is deleted, PostgreSQL needs enough old-row identity to decide whether the subscriber should receive an insert, update, or delete. Including the filter column in the replica identity makes that decision possible.

This example targets PostgreSQL 18 on both sides. Row filters require PostgreSQL 15 or later for filtered initial copying as well as ongoing replication. The goal is a maintained tenant dataset for trusted replication infrastructure; publication filters are not a substitute for an authorization boundary.

## Design the key and filter together

Use a composite primary key on the publisher:

```sql
CREATE TABLE public.tenant_orders (
    tenant_id bigint NOT NULL,
    order_id bigint NOT NULL,
    status text NOT NULL,
    amount_cents bigint NOT NULL,
    PRIMARY KEY (tenant_id, order_id)
);

CREATE PUBLICATION tenant_42_pub
    FOR TABLE public.tenant_orders
    WHERE (tenant_id = 42)
    WITH (publish = 'insert, update, delete');
```

The default replica identity is the primary key, which includes `tenant_id`. A publication sending updates or deletes requires filter columns to be covered by replica identity. An insert-only publication can filter other columns because it does not need to evaluate an old row. See [CREATE PUBLICATION](https://www.postgresql.org/docs/18/sql-createpublication.html).

If your existing table has `PRIMARY KEY (order_id)`, the fact that `tenant_id` is indexed separately is insufficient. Plan a suitable unique, nonpartial identity index whose columns are all `NOT NULL`, then select it with `REPLICA IDENTITY USING INDEX`. Do not change keys casually: foreign keys, uniqueness semantics, and subscriber lookup performance all depend on them. The eligible index requirements are defined in [ALTER TABLE](https://www.postgresql.org/docs/18/sql-altertable.html).

The composite key is simple for this example because order identifiers are tenant-scoped. On a real application, decide first whether tenant reassignment is valid and how identifier collisions should behave.

## Create the subscriber and grant copy access

Create the same `tenant_orders` table on the subscriber, with the same primary key. Keep it empty and do not allow local application writes. On the publisher, grant the established replication role access:

```sql
GRANT USAGE ON SCHEMA public TO logical_replicator;
GRANT SELECT ON public.tenant_orders TO logical_replicator;
```

Then create the subscriber connection through your existing authentication and secret configuration:

```sql
CREATE SUBSCRIPTION tenant_42_sub
    CONNECTION 'host=publisher.example.internal dbname=app user=logical_replicator sslmode=verify-full'
    PUBLICATION tenant_42_pub
    WITH (copy_data = true);
```

Wait for the table's `pg_subscription_rel.srsubstate` to become `r`. PostgreSQL's [subscription options](https://www.postgresql.org/docs/18/sql-createsubscription.html) distinguish initial copying from ongoing consumption. A filtered publication does not create the target schema for you.

## Test movement across the filter boundary

Seed these rows on the publisher before subscription creation, or insert them afterward to test ongoing DML:

```sql
INSERT INTO public.tenant_orders VALUES
    (42, 1001, 'new', 2500),
    (7,  1002, 'new', 3100),
    (42, 1003, 'new', 4700);
```

The subscriber should initially contain orders 1001 and 1003 only. Next, run:

```sql
-- Remains within tenant 42: subscriber receives an update.
UPDATE public.tenant_orders
SET status = 'paid'
WHERE tenant_id = 42 AND order_id = 1001;

-- Enters tenant 42: subscriber needs a new row.
UPDATE public.tenant_orders
SET tenant_id = 42
WHERE tenant_id = 7 AND order_id = 1002;

-- Leaves tenant 42: subscriber must remove its old row.
UPDATE public.tenant_orders
SET tenant_id = 7
WHERE tenant_id = 42 AND order_id = 1003;
```

After catch-up, the subscriber should contain `(42,1001,'paid',2500)` and `(42,1002,'new',3100)`. Order 1003 must be absent. These transformations follow the documented [row-filter update rules](https://www.postgresql.org/docs/18/logical-replication-row-filter.html).

Finally, delete order 1002 on the publisher and confirm its removal on the subscriber. This catches a setup that copies rows correctly but cannot identify them for later deletion.

## Keep publication composition explicit

Inspect the subscriber's publication list and publisher definitions:

```sql
-- Subscriber
SELECT subname, subpublications
FROM pg_subscription
WHERE subname = 'tenant_42_sub';

-- Publisher
SELECT pubname, schemaname, tablename, rowfilter
FROM pg_publication_tables
WHERE schemaname = 'public'
  AND tablename = 'tenant_orders';
```

For the same operation, filters from multiple subscribed publications are combined with OR. Adding an unfiltered publication containing this table defeats the narrow result. Treat publication-list changes as data-contract changes and repeat the boundary tests afterward.

`TRUNCATE` is table-wide and is not constrained by the tenant filter. This example excludes it from the publication's `publish` setting. If source truncation is a required business operation, design its subscriber effect explicitly rather than assuming it behaves like tenant-scoped deletes.

## Recover and protect the boundary

If a filter or identity mistake stops DML, repair the identity and publication definition before retrying the application transaction. If rows were already omitted or leaked, fixing the definition affects future events; it does not reconstruct the subscriber's existing dataset. Use a controlled reseed or a verified reconciliation under a write fence.

Keep replication credentials inside trusted infrastructure. PostgreSQL documents that publications have no per-publication access privileges, so another publication can expose additional data to a connected subscriber. Review [logical replication security](https://www.postgresql.org/docs/18/logical-replication-security.html) before presenting a tenant publication as a security control.
