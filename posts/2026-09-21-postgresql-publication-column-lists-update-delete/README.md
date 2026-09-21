# How to Select PostgreSQL Publication Columns for UPDATE and DELETE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Logical Replication, Database, Migration

Description: Use PostgreSQL publication column lists with a compatible replica identity, matching subscriber schema, and verified update and delete behavior.

A publication column list can reduce the data copied to a reporting subscriber, but the selected columns still need to identify rows for later updates and deletes. Omitting a primary-key column can leave an apparently successful insert pipeline unable to maintain the dataset.

This PostgreSQL 18 example publishes a customer's identifier, display name, and status while excluding an internal note. Both publisher and subscriber use PostgreSQL 15 or later, which is necessary for column lists to govern the initial copy. Treat the list as a replication data contract, not as a security boundary.

## Begin with an identity that fits the selected data

On the publisher:

```sql
CREATE TABLE public.customers (
    customer_id bigint PRIMARY KEY,
    display_name text NOT NULL,
    status text NOT NULL,
    internal_note text
);

CREATE PUBLICATION customer_reporting_pub
    FOR TABLE public.customers (
        customer_id, display_name, status
    )
    WITH (publish = 'insert, update, delete');
```

`customer_id` is the default replica identity because it is the primary key. A publication sending updates or deletes must include the identity columns in its column list. The [column-list documentation](https://www.postgresql.org/docs/18/logical-replication-col-lists.html) defines this requirement and the PostgreSQL 15 initial-copy boundary.

Inspect an existing table before selecting its columns:

```sql
SELECT c.relreplident,
       i.indexrelid::regclass AS index_name,
       i.indisprimary, i.indisreplident,
       pg_get_indexdef(i.indexrelid) AS definition
FROM pg_class AS c
LEFT JOIN pg_index AS i
  ON i.indrelid = c.oid
 AND (i.indisprimary OR i.indisreplident)
WHERE c.oid = 'public.customers'::regclass;
```

Prefer a narrow explicit identity over switching to `REPLICA IDENTITY FULL` to bypass key design. In PostgreSQL 18, combining `FULL` with a publication column list is not a workable update/delete strategy; even a list naming every column still fails those operations. Use a suitable key or omit the column list. The general identity model is documented under [publications and replica identity](https://www.postgresql.org/docs/18/logical-replication-publication.html).

## Give the subscriber the published columns

On the subscriber:

```sql
CREATE TABLE public.customers (
    customer_id bigint PRIMARY KEY,
    display_name text NOT NULL,
    status text NOT NULL,
    report_source text NOT NULL DEFAULT 'publisher'
);
```

The subscriber contains every published column and a compatible primary key. The additional `report_source` column receives its local default for replicated inserts. Columns match by name; do not rely on their physical order. See the [subscription schema rules](https://www.postgresql.org/docs/18/logical-replication-subscription.html).

Grant the established replication role initial-copy access on the publisher:

```sql
GRANT USAGE ON SCHEMA public TO logical_replicator;
GRANT SELECT ON public.customers TO logical_replicator;
```

Create the subscription on the subscriber:

```sql
CREATE SUBSCRIPTION customer_reporting_sub
    CONNECTION 'host=publisher.example.internal dbname=app user=logical_replicator sslmode=verify-full'
    PUBLICATION customer_reporting_pub
    WITH (copy_data = true);
```

Keep the target empty before copying, and leave normal target writes disabled. PostgreSQL's [subscription creation reference](https://www.postgresql.org/docs/18/sql-createsubscription.html) documents connection and copy settings.

## Test the complete lifecycle

On the publisher, insert two test rows:

```sql
INSERT INTO public.customers VALUES
    (1001, 'Ada', 'active', 'support-only detail'),
    (1002, 'Lin', 'active', 'another internal note');
```

After catch-up, the subscriber should have both identifiers, names, and statuses, plus `report_source = 'publisher'`. It should have no `internal_note` column.

Now exercise both mutation types:

```sql
UPDATE public.customers
SET status = 'inactive'
WHERE customer_id = 1001;

DELETE FROM public.customers
WHERE customer_id = 1002;
```

The subscriber must show customer 1001 as inactive and no row for 1002. Also rehearse an identity-changing update if the application permits identifier changes. A dataset that passes only an insert test has not validated its identity contract.

Check the effective allowlist on the publisher:

```sql
SELECT pubname, schemaname, tablename, attnames
FROM pg_publication_tables
WHERE pubname = 'customer_reporting_pub';
```

## Evolve the contract deliberately

An explicit list does not automatically include columns added later. To publish a new field, create its compatible subscriber column first, then change the publisher's list while preserving every other publication member and option.

For this publication, whose sole table has no row filter, the change might be:

```sql
ALTER PUBLICATION customer_reporting_pub
    SET TABLE public.customers (
        customer_id, display_name, status, internal_note
    );
```

This deliberately adds `internal_note`; execute it only when that is the intended data contract. `SET TABLE` replaces complete membership, so a publication with additional tables needs their definitions restated. [ALTER PUBLICATION](https://www.postgresql.org/docs/18/sql-alterpublication.html) documents that replacement behavior.

Changing the list does not backfill historical values for the added column. Plan a controlled backfill or reseed and verify it independently. Also inspect all publications consumed by the subscription: combining different column lists for the same table is unsupported and can stop apply.

## Recover a failed change without discarding history

If an update fails on the publisher, check that the published list still includes the active identity. If apply fails on the subscriber, compare published column names, types, and subscriber constraints. For mismatched column lists across subscribed publications, first make the lists match on the publisher, then use `ALTER SUBSCRIPTION ... DROP PUBLICATION` and `ADD PUBLICATION` to remove and re-add an offending publication, as described in the [column-list warning](https://www.postgresql.org/docs/18/logical-replication-col-lists.html). Repair the contract and let replication continue from its preserved position; do not skip the failed transaction merely to clear the alert.

For sensitive data, restrict trusted replication credentials and source-side access. PostgreSQL explicitly cautions that column lists cannot contain a malicious subscriber. Review [logical replication security](https://www.postgresql.org/docs/18/logical-replication-security.html) before treating omitted columns as protected data.
