# How to Handle PostgreSQL TRUNCATE Replication with Foreign Keys

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Replication, Database, SQL

Description: Keep foreign-key-related tables in one subscription so replicated TRUNCATE operations apply as a complete group.

A maintenance job truncates a parent table with `CASCADE`. The publisher succeeds, but a subscriber stops applying changes because its child table belongs to another subscription. Publishing both tables is insufficient: they must arrive through the same subscription for that truncate operation to be applied together.

This guide uses PostgreSQL 18 and assumes native logical replication between separate clusters. Rehearse destructive operations against disposable data before changing the production maintenance job.

## Understand the boundary

A subscription can consume multiple publications. For a replicated truncate, PostgreSQL takes the publisher's affected table group and removes tables outside that subscription. A foreign-key dependency on an excluded subscriber table can then make the remaining operation fail. The documentation explicitly identifies keeping all affected tables in one subscription as the working configuration. [PostgreSQL 18 logical replication restrictions](https://www.postgresql.org/docs/18/logical-replication-restrictions.html)

That matters even if ordinary inserts currently work. Logical apply normally suppresses ordinary triggers, including foreign-key checks, but `TRUNCATE` has its own dependency checks. Do not interpret successful insert replication as proof that the truncate topology is valid.

## Reproduce the intended grouping

For an empty demonstration database, create this schema on both publisher and subscriber:

```sql
CREATE TABLE public.accounts (
    id bigint PRIMARY KEY,
    name text NOT NULL
);

CREATE TABLE public.account_events (
    id bigint PRIMARY KEY,
    account_id bigint NOT NULL REFERENCES public.accounts(id),
    message text NOT NULL
);
```

Create two publications on the publisher:

```sql
CREATE PUBLICATION accounts_pub FOR TABLE public.accounts;
CREATE PUBLICATION events_pub FOR TABLE public.account_events;
```

On the subscriber, consume both through one subscription. Replace the connection details with your provisioned replication account and credentials:

```sql
CREATE SUBSCRIPTION account_domain_sub
CONNECTION 'host=publisher.example.com dbname=app user=logical_replicator sslmode=verify-full'
PUBLICATION accounts_pub, events_pub;
```

This password-free connection string assumes a superuser-owned subscription with an already configured server-side credential source. If a non-superuser owns the subscription, the default `password_required = true` requires password authentication and a password specified in the connection string; a server-side password file alone does not satisfy that requirement. Supply that password through secure provisioning rather than copying a secret into a shared runbook. [CREATE SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-createsubscription.html)

Wait for both tables to reach ready state before exercising the maintenance operation:

```sql
SELECT s.subname, r.srrelid::regclass AS relation, r.srsubstate
FROM pg_subscription AS s
JOIN pg_subscription_rel AS r ON r.srsubid = s.oid
WHERE s.subname = 'account_domain_sub';
```

The ready state is `r`; initial copying is a separate phase with its own workers. [Subscription table states](https://www.postgresql.org/docs/18/catalog-pg-subscription-rel.html)

## Inspect the complete subscriber dependency graph

Run this on the subscriber to list foreign keys touching the two example tables:

```sql
SELECT conrelid::regclass AS child_table,
       confrelid::regclass AS parent_table,
       conname
FROM pg_constraint
WHERE contype = 'f'
  AND (conrelid IN ('public.accounts'::regclass,
                   'public.account_events'::regclass)
       OR confrelid IN ('public.accounts'::regclass,
                       'public.account_events'::regclass));
```

Repeat the investigation for every newly discovered referencing table until the affected group is understood. Subscriber-only reporting tables can introduce dependencies that do not exist on the publisher. Record those explicitly; a publisher catalog alone cannot reveal them.

Prefer an explicit reviewed table list for scheduled cleanup:

```sql
-- Publisher, during the approved maintenance window.
BEGIN;
TRUNCATE public.account_events, public.accounts;
COMMIT;
```

`TRUNCATE` takes `ACCESS EXCLUSIVE` locks and refuses to truncate referenced tables unless the referencing tables are included or `CASCADE` expands the operation. Explicit lists make unintended expansion easier to catch during review. Avoid adding `RESTART IDENTITY` unless resetting sequences is independently intended. [TRUNCATE reference](https://www.postgresql.org/docs/18/sql-truncate.html)

## Verify behavior and recover failures

In the rehearsal, insert one account and one event on the publisher, wait until both are visible on the subscriber, and execute the truncate. Confirm both tables are empty and then insert another account/event pair. The second pair must replicate too; empty tables alone do not prove that the worker continued.

Check subscriber logs for the exact relation blocking truncate and inspect its subscription membership. If the source operation has already committed, repeatedly restarting the worker does not repair an invalid grouping. Keep downstream consumers fenced while choosing a repair.

For a disposable reporting target, rebuilding the affected subscription from a fresh copy with the complete dependency group is often the clearest recovery. For a target containing local data, first preserve that data and design a reconciliation procedure. Moving tables between live subscriptions requires a coordinated handoff of replication position and existing rows; simply adding a second subscription can duplicate delivery.

Excluding `truncate` from a publication prevents future truncate messages from that publication, but does not synchronize the resulting deletions and does not automatically remove a failing transaction already being applied. If the application truly needs selective removal, a reviewed `DELETE` workflow may better express its semantics, with different locking and resource costs.

The acceptance condition is concrete: every intended table is cleared, subscriber-only data remains correct, and subsequent transactions continue applying without errors.
