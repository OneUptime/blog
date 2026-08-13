# Why a PostgreSQL DEFAULT Partition Can Block New Partition Creation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Default Partitions, Database Locks, Partition Management, ATTACH PARTITION, Reliability

Description: Add a PostgreSQL partition without a surprise default-table outage by relocating conflicting rows, validating a check that excludes the new range, and monitoring the exclusive lock.

---

A PostgreSQL <code>DEFAULT</code> partition means “all partition-key values not accepted by another partition.” When a new explicit partition is added, that definition shrinks. PostgreSQL must prove the default table contains no row that belongs in the new bound.

Without a usable constraint proving exclusion, PostgreSQL scans the default partition while holding <code>ACCESS EXCLUSIVE</code> on it. That lock blocks reads and writes to the default. Worse, a long query already reading the default can delay the DDL, and later sessions can queue behind the waiting lock. A routine monthly partition job can become an application incident.

## Reproduce the Reason

Consider a parent with July and a catch-all:

~~~sql
CREATE TABLE events (
    event_id bigint NOT NULL,
    occurred_at timestamptz NOT NULL,
    payload jsonb NOT NULL
) PARTITION BY RANGE (occurred_at);

CREATE TABLE events_2026_07 PARTITION OF events
FOR VALUES FROM ('2026-07-01 00:00:00+00')
         TO   ('2026-08-01 00:00:00+00');

CREATE TABLE events_default PARTITION OF events DEFAULT;

INSERT INTO events (event_id, occurred_at, payload)
VALUES (
    1,
    TIMESTAMPTZ '2026-08-15 00:00:00+00',
    '{}'::jsonb
);
~~~

The August row routes to <code>events_default</code>. Adding August:

~~~sql
CREATE TABLE events_2026_08 PARTITION OF events
FOR VALUES FROM ('2026-08-01 00:00:00+00')
         TO   ('2026-09-01 00:00:00+00');
~~~

would make that existing row violate the new partition map. PostgreSQL cannot silently move it. It checks that the default contains none. The same issue applies when attaching a prepared August table.

## Find Rows That Conflict

Before DDL:

~~~sql
SELECT count(*) AS conflicting_rows,
       min(occurred_at) AS earliest,
       max(occurred_at) AS latest
FROM events_default
WHERE occurred_at >= TIMESTAMPTZ '2026-08-01 00:00:00+00'
  AND occurred_at <  TIMESTAMPTZ '2026-09-01 00:00:00+00';
~~~

Run a bounded sample if you need to diagnose origin:

~~~sql
SELECT event_id, occurred_at
FROM events_default
WHERE occurred_at >= TIMESTAMPTZ '2026-08-01 00:00:00+00'
  AND occurred_at <  TIMESTAMPTZ '2026-09-01 00:00:00+00'
ORDER BY occurred_at
LIMIT 100;
~~~

An empty result at one instant does not protect against a concurrent insert one millisecond later. The cleanup, check constraint, and attach need a concurrency protocol.

## Prepare a Standalone Target

Create August outside the tree. Including indexes also prebuilds equivalents of the parent's indexes so that <code>ATTACH PARTITION</code> does not create missing indexes while holding cutover locks:

~~~sql
CREATE TABLE events_2026_08_staging
    (LIKE events
        INCLUDING DEFAULTS
        INCLUDING CONSTRAINTS
        INCLUDING INDEXES);

ALTER TABLE events_2026_08_staging
ADD CONSTRAINT events_2026_08_bound
CHECK (
    occurred_at >= TIMESTAMPTZ '2026-08-01 00:00:00+00'
    AND occurred_at <  TIMESTAMPTZ '2026-09-01 00:00:00+00'
);
~~~

Copy conflicting rows and reconcile them:

~~~sql
INSERT INTO events_2026_08_staging
SELECT *
FROM events_default
WHERE occurred_at >= TIMESTAMPTZ '2026-08-01 00:00:00+00'
  AND occurred_at <  TIMESTAMPTZ '2026-09-01 00:00:00+00';
~~~

Do not immediately delete source rows and declare success. Concurrent updates, deletes, or inserts can make the copy stale or duplicate. Use a maintenance write fence, an ordered change-capture workflow, or a short transaction with explicit locks appropriate to the acceptable outage. The exact protocol depends on keys, triggers, and write volume.

## Give PostgreSQL a Proof About DEFAULT

Before adding the constraint, activate the maintenance fence for August writes if rejected writes are unacceptable, and finish the final reconciliation. Then add a <code>CHECK</code> constraint that excludes August with a bounded lock wait:

~~~sql
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE events_default
ADD CONSTRAINT events_default_excludes_2026_08
CHECK (
    occurred_at <  TIMESTAMPTZ '2026-08-01 00:00:00+00'
    OR occurred_at >= TIMESTAMPTZ '2026-09-01 00:00:00+00'
) NOT VALID;

COMMIT;
~~~

<code>NOT VALID</code> skips the initial table scan, but <code>ADD CONSTRAINT</code> still takes <code>ACCESS EXCLUSIVE</code> on the default partition. The local timeout limits each individual wait to acquire a lock; it does not limit execution after a lock is acquired. If it fires, roll back and retry from a known state.

Because the check exists, new rows violating it are rejected even while it is not valid for old rows. After all conflicting old rows have been moved or removed, validate it:

~~~sql
ALTER TABLE events_default
VALIDATE CONSTRAINT events_default_excludes_2026_08;
~~~

Validation scans the default under <code>SHARE UPDATE EXCLUSIVE</code>, allowing ordinary reads and nonviolating writes to continue. This moves the scan out of the attach's <code>ACCESS EXCLUSIVE</code> lock window. Confirm:

~~~sql
SELECT conname, convalidated, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'events_default'::regclass
  AND conname = 'events_default_excludes_2026_08';
~~~

Once valid, the check proves that the default cannot overlap August.

There is a deliberate behavioral consequence: until the August partition is attached, a new August row routed toward the default fails its explicit check. Keep the fence in place through the attach; if rejected writes are acceptable instead, keep that interval short and make callers handle the error. The constraint prevents recontamination; it does not reroute rows to a standalone table.

## Attach with a Bounded Lock Wait

~~~sql
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE events
ATTACH PARTITION events_2026_08_staging
FOR VALUES FROM ('2026-08-01 00:00:00+00')
         TO   ('2026-09-01 00:00:00+00');

COMMIT;
~~~

The validated bound on the staging table avoids scanning it, while the validated check on the default avoids scanning that table. PostgreSQL still takes <code>SHARE UPDATE EXCLUSIVE</code> on the parent and <code>ACCESS EXCLUSIVE</code> on both the staging table and the default partition. The proof shortens those exclusive lock holds; it does not remove them. <code>lock_timeout</code> applies separately to each lock acquisition, so five seconds is not a bound on total statement or transaction time. On a timeout, roll back and have automation inspect catalog state before retrying idempotently.

After attach, verify routing:

~~~sql
SELECT tableoid::regclass AS physical_table, count(*)
FROM events
WHERE occurred_at >= TIMESTAMPTZ '2026-08-01 00:00:00+00'
  AND occurred_at <  TIMESTAMPTZ '2026-09-01 00:00:00+00'
GROUP BY tableoid;
~~~

PostgreSQL's internal partition constraint for the default now excludes August. The explicit check is redundant for that interval and may be dropped after review. The candidate's matching bound check is also redundant after attachment.

## Monitor the Lock Chain

If DDL waits:

~~~sql
SELECT pid,
       state,
       wait_event_type,
       wait_event,
       pg_blocking_pids(pid) AS blockers,
       query_start,
       query
FROM pg_stat_activity
WHERE datname = current_database()
ORDER BY query_start;
~~~

Then inspect relation locks:

~~~sql
SELECT l.pid,
       l.mode,
       l.granted,
       l.relation::regclass
FROM pg_locks AS l
WHERE l.database = (
    SELECT oid
    FROM pg_database
    WHERE datname = current_database()
)
  AND l.relation IN (
    'events'::regclass,
    'events_default'::regclass,
    'events_2026_08_staging'::regclass
)
ORDER BY l.granted, l.pid;
~~~

Use <code>pg_blocking_pids()</code> to identify actual blockers. Do not terminate sessions automatically without understanding the transaction and the user's operational authority.

## Default Subpartitions Multiply Work

If <code>events_default</code> is itself partitioned, PostgreSQL recursively checks its children. The official partitioning documentation says the partitions are recursively checked in the same manner. A constraint at the wrong level or one PostgreSQL cannot use may leave many leaf scans and locks.

List the tree:

~~~sql
SELECT relid::regclass, parentrelid::regclass, isleaf, level
FROM pg_partition_tree('events_default'::regclass)
ORDER BY level, relid::text;
~~~

Validate checks that prove exclusion throughout the relevant hierarchy and rehearse at the final leaf count.

## Prefer Prevention

The least disruptive default-partition workflow is usually not to route expected values there:

- pre-create time partitions before the earliest accepted future timestamp;
- alert on any row inserted into the default;
- reject absurdly future or late timestamps at the application boundary when the domain permits;
- create partitions from one typed boundary generator;
- make provisioning idempotent;
- keep a tested runbook for late-arriving rows.

A default partition can be a safety net for unexpected data, but it should not replace partition scheduling. If it continuously receives normal traffic, every new bound becomes a data-migration event.

## Other Operational Restrictions

Current PostgreSQL <code>ALTER TABLE</code> documentation states that <code>DETACH PARTITION ... CONCURRENTLY</code> is not allowed when the partitioned table contains a default partition. This matters for retention design: adding a default to avoid insert failures can remove a lower-blocking detach option.

Also distinguish <code>CREATE TABLE ... PARTITION OF</code> from attaching a prepared table. Direct creation requires a stronger parent lock, while attach can use <code>SHARE UPDATE EXCLUSIVE</code> on the parent. Both still need the default-overlap proof when a new explicit bound is introduced.

## A Safe Monthly Runbook

1. Create the standalone next partition, exact bound check, and equivalent parent indexes.
2. Find and bulk-copy matching rows from default.
3. Fence matching writes and finish the source/target reconciliation.
4. Add a <code>NOT VALID</code> check to default with a bounded lock wait.
5. Validate the check before the cutover.
6. Attach with session-local lock timeout.
7. Release the fence and verify <code>tableoid</code> routing.
8. Drop redundant checks in a separately bounded DDL step if desired.
9. Alert if default receives expected-range rows again.
10. Pre-create the following partition earlier.

## Official Documentation

- [PostgreSQL: Declarative Partitioning and DEFAULT Checks](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITIONING-DECLARATIVE)
- [PostgreSQL: ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL: CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html)
- [PostgreSQL: Check Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-CHECK-CONSTRAINTS)
- [PostgreSQL: Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [PostgreSQL: pg_locks](https://www.postgresql.org/docs/current/view-pg-locks.html)
- [PostgreSQL: pg_stat_activity](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-ACTIVITY-VIEW)
- [PostgreSQL: Partition Information Functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-INFO-PARTITION)

## Conclusion

Adding a partition changes the meaning of <code>DEFAULT</code>, so PostgreSQL must rule out overlapping rows. Move conflicts through a concurrency-safe process, add and validate a precise check that excludes the new range, and attach the prepared target with a bounded lock wait. The proof removes the long exclusive scan, not all locks. Better still, pre-create expected ranges and monitor the default as an exception path rather than a normal landing zone.
