# Why PostgreSQL ATTACH PARTITION Scans and Locks Despite a CHECK Constraint

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, ATTACH PARTITION, Check Constraints, Database Locks, Table Partitioning, Zero Downtime

Description: Prevent long PostgreSQL partition-attach validation scans by using a valid provable bound constraint, validating it ahead of time, and checking default partitions and lock waits.

---

For a regular table, <code>ALTER TABLE ... ATTACH PARTITION</code> must prove that every existing row in the table being attached satisfies the new partition bound. If PostgreSQL cannot derive that proof from valid constraints, it scans the table while holding an <code>ACCESS EXCLUSIVE</code> lock on the candidate partition. A partitioned candidate is validated recursively; PostgreSQL does not verify the rows of a foreign-table candidate.

A constraint that looks similar to a human may still be unusable for that proof. It may be unvalidated, use a different expression, have different type or time-zone semantics, or fail to imply the complete bound. The parent lock is lighter than many teams expect, but the candidate and any default partition can still create a significant blocking event.

## Know the Documented Lock Shape

Current PostgreSQL documentation contrasts two creation paths:

- <code>CREATE TABLE ... PARTITION OF</code> requires an <code>ACCESS EXCLUSIVE</code> lock on the partitioned parent.
- Attaching a prepared table requires only <code>SHARE UPDATE EXCLUSIVE</code> on the partitioned parent.

During <code>ATTACH PARTITION</code>, PostgreSQL takes <code>ACCESS EXCLUSIVE</code> on the table being attached and on the existing default partition, if any, whether or not it needs a validation scan. Those locks are held until the transaction ends. That mode blocks reads and writes to the locked table. A usable proof avoids the scan and can therefore greatly shorten the lock hold.

The parent lock still conflicts with some maintenance and DDL. It is more concurrency-friendly than <code>ACCESS EXCLUSIVE</code>, not lock-free.

## Create a Constraint That Implies the Bound

For an August partition on a <code>timestamptz</code> key:

~~~sql
CREATE TABLE events_2026_08_staging
    (LIKE events INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING GENERATED);

ALTER TABLE events_2026_08_staging
ADD CONSTRAINT events_2026_08_bound
CHECK (
    occurred_at IS NOT NULL
    AND occurred_at >= TIMESTAMPTZ '2026-08-01 00:00:00+00'
    AND occurred_at <  TIMESTAMPTZ '2026-09-01 00:00:00+00'
);
~~~

Load and transform data, then attach with the same half-open bounds:

~~~sql
ALTER TABLE events
ATTACH PARTITION events_2026_08_staging
FOR VALUES FROM ('2026-08-01 00:00:00+00')
         TO   ('2026-09-01 00:00:00+00');
~~~

Because the valid check constraint proves the implicit partition constraint, PostgreSQL can avoid scanning the candidate for bound validation. The documentation recommends dropping the now-redundant check after attachment:

~~~sql
ALTER TABLE events_2026_08_staging
DROP CONSTRAINT events_2026_08_bound;
~~~

Dropping it is optional from a data-correctness perspective once the table is attached, but avoids carrying duplicate constraint metadata. Use the actual post-attach relation name if your naming changes.

## Why a CHECK May Not Count

### It is NOT VALID

This constraint applies to new writes but says nothing about old rows:

~~~sql
ALTER TABLE events_2026_08_staging
ADD CONSTRAINT events_2026_08_bound
CHECK (...) NOT VALID;
~~~

Validate it before the attach:

~~~sql
-- Commit the ADD CONSTRAINT transaction before validating.
ALTER TABLE events_2026_08_staging
VALIDATE CONSTRAINT events_2026_08_bound;
~~~

PostgreSQL's <code>ALTER TABLE</code> documentation describes <code>NOT VALID</code> followed by <code>VALIDATE CONSTRAINT</code> as a way to reduce the impact of adding check and foreign-key constraints. Validation still reads existing rows, but it can be scheduled before the attach and uses a less restrictive lock than adding and validating the constraint in one operation. Commit after adding the <code>NOT VALID</code> constraint before validating it: adding it still takes a brief <code>ACCESS EXCLUSIVE</code> lock, while validation in a later transaction takes <code>SHARE UPDATE EXCLUSIVE</code>. Confirm <code>pg_constraint.convalidated</code>:

~~~sql
SELECT conname, convalidated, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'events_2026_08_staging'::regclass;
~~~

### The predicate does not imply the complete range

This check proves only the lower bound:

~~~sql
CHECK (occurred_at >= TIMESTAMPTZ '2026-08-01 00:00:00+00')
~~~

Rows from September could exist, so a scan remains necessary. Both lower-inclusive and upper-exclusive conditions must be established for this range.

### The expression differs from the partition key

If the parent is partitioned on raw <code>occurred_at</code>, a check on <code>occurred_at::date</code> may have time-zone and expression semantics that do not establish the timestamp bound PostgreSQL needs. Use the partition-key expression and matching types.

If the parent is partitioned by an expression, use a constraint PostgreSQL can prove implies that expression's bound, including non-nullness of the expression when the partition does not accept null. Inspect the deployed definition with:

~~~sql
SELECT pg_get_partkeydef('events'::regclass);
~~~

### Null behavior is incomplete

An ordinary <code>CHECK</code> passes when its expression is true or null. A regular range partition does not accept a null key, so the proof must also establish non-nullness. For a simple key, use a <code>NOT NULL</code> constraint or include <code>occurred_at IS NOT NULL</code> in the valid check. For an expression key, prove that the expression itself is non-null.

### A cast or function changes semantics

Text comparisons, session-dependent time-zone conversion, and non-identical numeric types can prevent implication or validate the wrong business interval. Generate constraints from the same typed boundary inputs used for the attach DDL rather than maintaining two hand-written expressions.

## Validate Before the Maintenance Window

For a large candidate:

~~~sql
ALTER TABLE events_2026_08_staging
ADD CONSTRAINT events_2026_08_bound
CHECK (
    occurred_at IS NOT NULL
    AND occurred_at >= TIMESTAMPTZ '2026-08-01 00:00:00+00'
    AND occurred_at <  TIMESTAMPTZ '2026-09-01 00:00:00+00'
) NOT VALID;

-- Run validation after committing the ADD CONSTRAINT transaction.
ALTER TABLE events_2026_08_staging
VALIDATE CONSTRAINT events_2026_08_bound;
~~~

This moves the long scan before the attach. Writes concurrent with validation are still checked by the constraint, so after successful validation PostgreSQL has a trustworthy statement about all rows.

Also validate other required constraints and build indexes. For each parent partitioned index, PostgreSQL attaches an equivalent valid candidate index or creates the corresponding index during attachment. Build matching indexes beforehand to keep that work out of the attach. Inventory the exact parent schema and rehearse timing.

## Do Not Forget the DEFAULT Partition

Even when the candidate constraint is perfect, the parent may have a default partition. Adding the August partition narrows what “default” means, so PostgreSQL must prove that the default contains no August rows.

Without a valid constraint excluding August, PostgreSQL scans a regular-table default while holding <code>ACCESS EXCLUSIVE</code> on it. A partitioned default is checked recursively, while a foreign-table default is not scanned. This validation is separate from candidate validation; the root default lock is taken even when a constraint lets PostgreSQL skip the scan. A fast candidate check can therefore appear to be “ignored” when the actual work is on the default table.

Before attachment, add and validate an exclusion:

~~~sql
ALTER TABLE events_default
ADD CONSTRAINT events_default_excludes_2026_08
CHECK (
    occurred_at <  TIMESTAMPTZ '2026-08-01 00:00:00+00'
    OR occurred_at >= TIMESTAMPTZ '2026-09-01 00:00:00+00'
) NOT VALID;

ALTER TABLE events_default
VALIDATE CONSTRAINT events_default_excludes_2026_08;
~~~

If validation fails, move or correct conflicting rows under a concurrency-safe workflow. Do not delete them merely to make DDL pass without deciding where they belong.

## Partitioned Candidates Recurse

If the table being attached is itself partitioned, PostgreSQL takes <code>ACCESS EXCLUSIVE</code> locks on it and all its descendants. Constraint validation descends only when constraints at the current level do not prove the outer bound; scans occur at ordinary-table leaves that still lack a proof. A check on a high-level candidate may eliminate the scans, but not those candidate-subtree locks.

Inspect the hierarchy and check constraints:

~~~sql
SELECT p.relid::regclass,
       p.parentrelid::regclass,
       p.isleaf,
       c.conname,
       c.convalidated
FROM pg_partition_tree('events_2026_08_staging'::regclass) AS p
LEFT JOIN pg_constraint AS c
  ON c.conrelid = p.relid
 AND c.contype = 'c'
ORDER BY p.level, p.relid::text;
~~~

Rehearse with the final hierarchy size and shape. Recursive locking can expose a lock-table or wait problem that a single-table test misses.

## Diagnose the Blocker, Not Just Duration

While attach waits, inspect from another session:

~~~sql
SELECT pid,
       wait_event_type,
       wait_event,
       pg_blocking_pids(pid) AS blocking_pids,
       query
FROM pg_stat_activity
WHERE datname = current_database()
  AND state = 'active'
  AND pid <> pg_backend_pid()
  AND query ILIKE '%ATTACH PARTITION%';
~~~

Inspect relation locks for those PIDs through <code>pg_locks</code>. A long-running read on the candidate blocks <code>ACCESS EXCLUSIVE</code>; new sessions can then queue behind the attach, creating an apparent outage.

Use a deliberate session-local timeout:

~~~sql
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE ... ATTACH PARTITION ...;
COMMIT;
~~~

Choose a value and retry policy from the application objective. A timeout caps each lock-acquisition wait; it does not bound the total attach duration or reduce scan time after locks are acquired.

## Preflight Checklist

- Candidate has exactly the parent's columns with matching types, collations, and generated-column status and kind, and every inheritable parent <code>NOT NULL</code> and <code>CHECK</code> constraint. Matching checks have the same name and definition and cannot be <code>NOT VALID</code> when the parent check is valid.
- Bound check uses the exact partition-key semantics.
- <code>convalidated</code> is true.
- Candidate indexes and constraints match parent requirements.
- No overlapping partition already exists.
- Default partition has a validated exclusion.
- A nested candidate's outer bound is proved at its root or before validation reaches ordinary-table leaves.
- Lock timeout and retry are set for the DDL session.
- <code>pg_stat_activity</code> and <code>pg_locks</code> monitoring is ready.
- The operation has been rehearsed with production-scale rows and concurrency.

## Official Documentation

- [PostgreSQL: Attaching Partitions](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITIONING-DECLARATIVE)
- [PostgreSQL: ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL: Check Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-CHECK-CONSTRAINTS)
- [PostgreSQL: CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html)
- [PostgreSQL: Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [PostgreSQL: pg_locks](https://www.postgresql.org/docs/current/view-pg-locks.html)
- [PostgreSQL: Monitoring Database Activity](https://www.postgresql.org/docs/current/monitoring-stats.html)
- [PostgreSQL: Partition Information Functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-INFO-PARTITION)

## Conclusion

PostgreSQL scans a regular-table attach candidate when it lacks a valid constraint that proves every existing row fits the requested bound. Create an exact typed check, validate it before the maintenance window, and confirm <code>convalidated</code>. Then inspect the default partition and any nested hierarchy, because they can trigger separate exclusive locks and scans. A complete matching proof removes the candidate-bound validation scan; it does not make attachment lock-free.
