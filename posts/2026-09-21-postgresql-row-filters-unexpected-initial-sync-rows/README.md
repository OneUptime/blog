# How to Diagnose PostgreSQL Row Filters During Initial Replication Sync

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Logical Replication, Troubleshooting, Database

Description: Diagnose PostgreSQL initial-copy rows that appear outside a row filter by checking subscriber versions, overlapping publications, and operation-specific filters.

A row copied during PostgreSQL initial synchronization may be entirely consistent with the publication configuration even when later inserts with the same values would not replicate. Initial copying and ongoing DML use related but different rules. Diagnose the complete subscription before deleting the unexpected rows.

The examples target PostgreSQL 18. They focus on initial synchronization of an ordinary table, not row-level security or application queries against unrelated replicas.

## Start with evidence from both servers

On the subscriber, record the version and actual publication list:

```sql
SHOW server_version;

SELECT subname, subpublications, subenabled
FROM pg_subscription
WHERE subname = 'reporting_sub'
  AND subdbid = (SELECT oid FROM pg_database WHERE datname = current_database());
```

On the publisher, list every publication that includes the affected table:

```sql
SELECT p.pubname, p.pubinsert, p.pubupdate, p.pubdelete,
       p.pubtruncate, p.puballtables, p.pubviaroot,
       pt.schemaname, pt.tablename, pt.rowfilter
FROM pg_publication AS p
JOIN pg_publication_tables AS pt ON pt.pubname = p.pubname
WHERE pt.schemaname = 'public'
  AND pt.tablename = 'tenant_events'
ORDER BY p.pubname;
```

Compare these results with the subscriber's `subpublications`; unrelated publications do not explain its copy. The [publication table view](https://www.postgresql.org/docs/18/view-pg-publication-tables.html) exposes effective membership and row filters, including schema-wide publications.

Also establish whether the target was empty before copying. PostgreSQL does not purge preexisting target rows during initial synchronization. A row left by an earlier load is not evidence that the current filter copied it.

## Check the subscriber version first

A subscriber older than PostgreSQL 15 copies the entire table during initial synchronization even when its newer publisher has a row filter. Upgrading only the publisher is therefore insufficient for a filtered initial load. The version boundary is explicit in the [row-filter documentation](https://www.postgresql.org/docs/18/logical-replication-row-filter.html).

If an old subscriber is mandatory, use a carefully designed compatible seeding procedure or choose an architecture that does not depend on filtered initial copy. Do not assume `copy_data = false` repairs the problem; it merely opts out of copying and leaves you responsible for a consistent seed.

## Reproduce the operation mismatch

Consider this publisher setup:

```sql
CREATE TABLE public.tenant_events (
    tenant_id bigint NOT NULL,
    event_id bigint NOT NULL,
    payload text NOT NULL,
    PRIMARY KEY (tenant_id, event_id)
);

INSERT INTO public.tenant_events VALUES
    (42, 1,   'tenant 42 history'),
    (7,  100, 'other tenant history');

CREATE PUBLICATION tenant_inserts
    FOR TABLE public.tenant_events WHERE (tenant_id = 42)
    WITH (publish = 'insert');

CREATE PUBLICATION high_id_updates
    FOR TABLE public.tenant_events WHERE (event_id >= 100)
    WITH (publish = 'update');
```

Assume the publisher connection role is already provisioned with LOGIN, REPLICATION, database access, and the intended TLS authentication. Grant its initial-copy permissions on the publisher:

```sql
GRANT USAGE ON SCHEMA public TO logical_replicator;
GRANT SELECT ON public.tenant_events TO logical_replicator;
```

Create the identical empty table on the subscriber, then subscribe to both publications through an authorized subscription administrator with provisioned connection credentials:

```sql
CREATE SUBSCRIPTION reporting_sub
    CONNECTION 'host=publisher.example.internal dbname=app user=logical_replicator sslmode=verify-full'
    PUBLICATION tenant_inserts, high_id_updates
    WITH (copy_data = true);
```

Both historical rows are eligible for the initial copy. Initial synchronization does not use the publication's `publish` operations to decide which history to copy. With several publications, rows matching any applicable initial-copy filter are included. That behavior is documented in the [initial snapshot architecture](https://www.postgresql.org/docs/18/logical-replication-architecture.html).

Wait until initial synchronization of `tenant_events` finishes (`srsubstate = 'r'` for this table and subscription in the subscriber's [pg_subscription_rel catalog](https://www.postgresql.org/docs/18/catalog-pg-subscription-rel.html)), then insert `(7,101,'new other tenant')` on the publisher. That new insert does not match the insert publication; the update-only publication does not publish the insert. This explains why a historical row can arrive while a comparable new row does not.

The example intentionally illustrates a confusing contract. Prefer a publication design whose initial dataset and subsequent insert, update, and delete behavior describe the same intended materialized dataset.

## Find an unfiltered path

A subscription containing both a filtered publication and an unfiltered publication for the same table can copy every row. `FOR ALL TABLES` and applicable `FOR TABLES IN SCHEMA` memberships are common reasons an apparently narrow filter becomes redundant.

For ongoing DML, overlapping filters combine by OR for each operation. Do not read two publication filters as a conjunction. The [publication documentation](https://www.postgresql.org/docs/18/logical-replication-publication.html) explains operation selection, and the row-filter guide details combination behavior.

Partitioned tables add another dimension: `publish_via_partition_root` chooses whether root or leaf filters govern published changes. Inspect the effective definition for the relation actually being published, rather than only the DDL stored in a migration file.

## Repair history and future events separately

Once you identify the unwanted publication or filter, correct the intended publication list and definitions. Then determine whether the subscriber already contains out-of-scope rows or has missed in-scope changes.

Running this does not recopy a previously subscribed table:

```sql
ALTER SUBSCRIPTION reporting_sub
    REFRESH PUBLICATION WITH (copy_data = true);
```

[ALTER SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-altersubscription.html) explicitly limits copying to newly subscribed tables, even when a filter changed. A narrower filter also does not automatically remove historical rows that now fall outside it.

For a dedicated one-table subscriber, preserve evidence, stop local readers and writers, and perform a controlled empty-target reseed with a corrected publication. For a larger subscription, plan the table's detachment and continuity rather than dropping the whole subscription casually.

Finish with tests for historical rows, new inserts, updates entering and leaving the filter, and deletes. That test set proves the intended dataset over time instead of validating only the first snapshot.
