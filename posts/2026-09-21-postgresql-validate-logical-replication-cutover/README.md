# How to Validate PostgreSQL Publisher and Subscriber Data Before Cutover

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Replication, Migration, SQL

Description: Validate logical replication at a fixed write boundary using readiness checks, replicated markers, exact row exports, and separate sequence checks.

Zero-looking lag is not a data comparison. It cannot reveal a table omitted from a publication, rows changed locally on the subscriber, or an attachment payload that logical replication never carried. Before cutover, establish a stable boundary and compare the data the application will actually use.

This procedure targets PostgreSQL 18 and a migration subscription named `migration_sub`. The destination is not accepting application writes. Start rehearsing the checks while the source is live, but perform the final acceptance comparison after fencing source writers.

## Define the expected dataset

Inventory publication tables, row filters, and column lists on the publisher:

```sql
SELECT pubname, schemaname, tablename, attnames, rowfilter
FROM pg_publication_tables
WHERE pubname = 'migration_pub'
ORDER BY schemaname, tablename;
```

Write down intentional omissions and transformations. Comparing entire tables is invalid if only a tenant's rows or selected columns are published. Compare the expected projection on each side instead. Also check schema compatibility, constraints, extensions, and subscriber-only triggers before interpreting a difference as replication loss.

On the subscriber, confirm every expected relation is present and ready:

```sql
SELECT r.srrelid::regclass AS relation, r.srsubstate
FROM pg_subscription_rel AS r
JOIN pg_subscription AS s ON s.oid = r.srsubid
WHERE s.subname = 'migration_sub'
  AND s.subdbid = (SELECT oid FROM pg_database
                  WHERE datname = current_database())
ORDER BY r.srrelid::regclass::text;
```

The state `r` means ready. An empty result is not success: compare the relation list with the inventory. [Subscription relation catalog](https://www.postgresql.org/docs/18/catalog-pg-subscription-rel.html)

## Install a visible replication boundary

Before the cutover window, create this table on both databases and include it in the same publication and subscription as the migrated tables:

```sql
CREATE TABLE public.migration_barrier (
    token text PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
```

On the publisher, ensure the publication includes `insert` operations and add the table if it is not already included through `FOR ALL TABLES` or `FOR TABLES IN SCHEMA public`:

```sql
ALTER PUBLICATION migration_pub ADD TABLE public.migration_barrier;
```

On the subscriber, refresh outside a transaction block and wait for its ready state. This command assumes two-phase commit is not enabled for the subscription; if it is enabled, refreshing requires `WITH (copy_data = false)`, which is suitable here only if the new barrier table is still empty and no other newly subscribed tables need an initial copy:

```sql
ALTER SUBSCRIPTION migration_sub REFRESH PUBLICATION;
```

At cutover, fence every writer, including schedulers and background workers, and wait for in-flight write transactions to finish. Then commit a unique marker on the publisher:

```sql
INSERT INTO public.migration_barrier(token)
VALUES ('cutover-2026-09-21-01');
```

Wait until that exact token is visible on the subscriber in a fresh transaction. Within one subscription, transaction ordering makes this a useful boundary for preceding published work. With several subscriptions, use a separately published marker table for each and wait for all of them. This marker protocol is an operational design based on PostgreSQL's documented subscription consistency guarantee. [Logical replication ordering](https://www.postgresql.org/docs/18/logical-replication.html)

Keep writes fenced for the remaining comparison. Otherwise, the source can change after you see the marker and produce legitimate differences.

## Compare exact rows in bounded ranges

Start with counts and primary-key ranges to localize problems, but do not stop at matching counts. For an example `orders(id, customer_id, status, total_cents)` table, export an explicit column projection ordered by its primary key.

With secure libpq service definitions named `publisher` and `subscriber`, use roles with `SELECT` access to the projected columns and visibility of every row in the expected dataset. Row-level security must not silently hide rows from these exports. Run:

```bash
set -euo pipefail

psql 'service=publisher' -X -v ON_ERROR_STOP=1 \
  -c "COPY (SELECT id, customer_id, status, total_cents FROM public.orders WHERE id >= 1 AND id < 100001 ORDER BY id) TO STDOUT WITH (FORMAT csv, NULL '\\N')" \
  > orders-source.csv

psql 'service=subscriber' -X -v ON_ERROR_STOP=1 \
  -c "COPY (SELECT id, customer_id, status, total_cents FROM public.orders WHERE id >= 1 AND id < 100001 ORDER BY id) TO STDOUT WITH (FORMAT csv, NULL '\\N')" \
  > orders-target.csv

cmp orders-source.csv orders-target.csv
```

`cmp` exits with status zero only when these byte streams match. Check that both `psql` commands succeeded before trusting the files; empty failed exports must never pass validation. `COPY TO STDOUT` streams the result to the client, and CSV distinguishes a null marker from a quoted text value containing the same characters. [COPY reference](https://www.postgresql.org/docs/18/sql-copy.html)

Repeat across the full key range, including negative keys or composite keys if your schema uses them. Store the range inventory and command exit statuses. Bound each export to limit disk usage and make a mismatch easier to investigate.

For timestamps, floats, collations, or cross-version datatype changes, define common session settings and a canonical representation first. Matching application values need not have identical default text encodings. Protect exported customer data according to the migration's normal access and retention rules.

## Validate what logical replication omits

Check sequences independently before allowing destination inserts. Table rows containing generated IDs can arrive while their backing sequences remain behind. Also validate large objects separately and apply required schema changes explicitly; none of these are made complete by a successful row comparison. [Logical replication restrictions](https://www.postgresql.org/docs/18/logical-replication-restrictions.html)

Test representative application reads under the destination application role. Confirm expected permissions, row-security behavior, and execution plans after refreshing statistics where appropriate. Run business checks such as totals by account and orphan-reference queries in addition to the raw comparison.

## Stop on unexplained differences

For a mismatch, keep the source authoritative, find the first differing key, and classify it: publication filtering, incomplete copy, local writes, trigger transformations, or apply errors. Repair the cause and repeat the affected range plus its dependent business checks.

If the maintenance window expires, reopen the source deliberately and plan another final boundary. Do not cut over merely because the transport metrics look healthy. Approval should mean the expected tables and rows match at the recorded boundary and the destination can execute the application's next writes safely.
