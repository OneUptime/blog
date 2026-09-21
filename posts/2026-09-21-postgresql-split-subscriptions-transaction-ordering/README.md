# How to Split PostgreSQL Logical Replication Across Subscriptions Without Assuming Shared Ordering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Replication, Database, SQL

Description: Split logical replication only across independent data domains and use per-subscription progress checks instead of assuming global commit ordering.

Splitting a busy logical replication feed into several subscriptions can isolate workloads and provide more independent apply capacity. It also changes the consistency boundary visible to downstream readers. A transaction touching two subscriptions can become visible in two separate steps.

PostgreSQL guarantees transactional consistency for publications within a single subscription. That guarantee does not create a shared commit barrier across separate subscriptions. Plan the split around application invariants before planning worker counts. This guide targets PostgreSQL 18. [Logical replication consistency](https://www.postgresql.org/docs/18/logical-replication.html)

## Define independent data domains

Consider a transaction that inserts a customer and an order referencing that customer. If `customers` and `orders` travel through different subscriptions, the order can become visible before the customer. A join may temporarily hide it; a subscriber trigger might fail when it cannot find the parent.

Keep tables together when their consumers require transactionally consistent joins, trigger side effects, or coordinated truncation. Separate a truly independent telemetry domain from commerce data instead:

```sql
-- Publisher: these tables already exist.
CREATE PUBLICATION commerce_pub
FOR TABLE public.customers, public.orders, public.order_items;

CREATE PUBLICATION telemetry_pub
FOR TABLE public.device_events;
```

On a new subscriber with matching empty tables:

```sql
CREATE SUBSCRIPTION commerce_sub
CONNECTION 'host=publisher.example.com dbname=app user=logical_replicator sslmode=verify-full'
PUBLICATION commerce_pub;

CREATE SUBSCRIPTION telemetry_sub
CONNECTION 'host=publisher.example.com dbname=app user=logical_replicator sslmode=verify-full'
PUBLICATION telemetry_pub;
```

These commands assume a subscription administrator and already provisioned server-side credentials. Non-superuser owners must satisfy the documented password authentication requirements. Create the subscriptions outside an explicit transaction block when they create their slots. [CREATE SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-createsubscription.html)

Do not subscribe to the same table through both connections. PostgreSQL documents nonoverlapping publication objects as a requirement to consider when using multiple subscriptions between the same pair of databases. [Subscription architecture](https://www.postgresql.org/docs/18/logical-replication-subscription.html)

## Prove the table assignment

On the publisher, check overlapping membership between the publications:

```sql
SELECT schemaname, tablename, count(DISTINCT pubname) AS publications
FROM pg_publication_tables
WHERE pubname IN ('commerce_pub', 'telemetry_pub')
GROUP BY schemaname, tablename
HAVING count(DISTINCT pubname) > 1;
```

For this design, expect no rows. Repeat after migrations add tables, partitions, or schema-wide publications. Also review downstream dependencies that the publisher does not know about.

On the subscriber, inspect the actual subscribed relation set:

```sql
SELECT s.subname, r.srrelid::regclass AS relation, r.srsubstate
FROM pg_subscription AS s
JOIN pg_subscription_rel AS r ON r.srsubid = s.oid
WHERE s.subdbid = (SELECT oid FROM pg_database
                  WHERE datname = current_database())
ORDER BY s.subname, r.srrelid::regclass::text;
```

Wait for every expected table to reach ready state before exposing the new target. Initial copies across tables and subscriptions should not be treated as an application-consistent snapshot during initialization. [Subscription relation states](https://www.postgresql.org/docs/18/catalog-pg-subscription-rel.html)

## Demonstrate the missing global barrier

In staging, disable `telemetry_sub`, leave `commerce_sub` running, and commit one publisher transaction that modifies both domains. Observe that the commerce change can appear while the telemetry change remains absent. Re-enable telemetry and confirm eventual convergence.

This is a useful acceptance test because it forces consumers to handle the exact consistency window the topology permits. A passing steady-state benchmark may never expose it.

```sql
-- Subscriber, staging only.
ALTER SUBSCRIPTION telemetry_sub DISABLE;

-- After the cross-domain test and inspection:
ALTER SUBSCRIPTION telemetry_sub ENABLE;
```

Do not use one subscription's `received_lsn` to declare both domains synchronized. Monitor each subscription and its errors independently. More slots and workers also increase publisher WAL-retention exposure during an outage, so size and alert on each feed's retention needs. [Logical replication configuration](https://www.postgresql.org/docs/18/logical-replication-config.html)

## Coordinate consumers and cutover

If a reporting job must read a stable combined dataset, use a deliberate boundary: fence source writers, drain transactions, and wait for an application marker carried by each subscription. Create a separate marker table per subscription so the feeds remain nonoverlapping. Insert the final markers after all earlier writers have completed.

Only run the report when all required markers are visible and all tables are ready. Reading both marker tables in one subscriber transaction gives the report a consistent local snapshot once the source is quiescent. This protocol is an application design built on each subscription's ordering guarantee; PostgreSQL does not create it automatically.

For continuously writable sources, define weaker consumer behavior explicitly. A consumer can tolerate missing joins, retry processing, or wait for domain-specific completeness records. If the business invariant cannot tolerate such a window, retain one subscription for those tables and investigate parallel apply or source transaction size before splitting them.

## Handle existing subscriptions conservatively

The creation example is for a new target. Moving a populated table from an old subscription to a new one requires a coordinated replication position and initial-data strategy. Disabling the old subscription and creating the new one with `copy_data = false` does not by itself establish that boundary.

A practical migration can use a fresh target, complete its independent subscriptions, validate data under a write fence, and switch consumers together. If a split behaves incorrectly in rehearsal, keep the original target serving readers while fixing the design. Do not remove the old slots until the replacement has been validated and its rollback window has closed.
