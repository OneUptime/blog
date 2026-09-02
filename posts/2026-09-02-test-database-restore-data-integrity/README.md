# How to Test Database Restores for Data Integrity, Not Just Startup Success

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Database, Backup, Disaster Recovery, Data Integrity, Testing

Description: Validate restored databases at artifact, physical, logical, relational, and business levels before declaring recovery.

---

A database can start, accept a connection, and still be unfit for service. Missing tables, corrupt indexes, broken constraints, incompatible extensions, a partial transaction set, or a recovery point outside RPO can survive a shallow health check.

Validate in layers, from backup artifact to business invariant, inside an isolated target.

## Define Integrity Before Restoring

Create a versioned validation manifest for each protected database:

~~~yaml
database: orders
engine: PostgreSQL
supported_restore_major: 17
critical_schemas: [orders, ledger, outbox]
required_extensions: [pgcrypto]
minimum_schema_version: 2026090201
source_watermark_query: SELECT max(commit_sequence) FROM recovery_watermark
physical_check: pg_amcheck --all
invariants:
  - every_order_has_ledger_entries
  - captured_amount_equals_ledger_amount
  - outbox_sequence_is_contiguous
sentinels:
  - order_id: dr-sentinel-2026-08
~~~

Expected counts should usually be ranges or source snapshots tied to the selected recovery point. A hard-coded row count becomes stale and can produce false failures or false confidence.

## Restore into a Clean Target

Provision a version-compatible, isolated database with no application traffic. Record:

- backup, snapshot, base, incremental, and log identifiers;
- requested and actual recovery point;
- failure or isolation time used for the RPO comparison;
- engine, restore tool, extension, and operating-system versions;
- encryption key version;
- target parameters, collation, locale, and time zone;
- start and completion timestamps;
- every warning and skipped object.

Keep external side effects blocked when an application later connects. Use a read-only validation identity first.

## Validate in Six Layers

### 1. Artifact and chain integrity

Verify manifests, object presence, stored hashes, encryption access, and the complete full/incremental/log chain. This finds transfer and retention failures before database startup.

For PostgreSQL base backups, pg_verifybackup compares files with the backup manifest and checks required WAL where configured. PostgreSQL explicitly states that verification is not a substitute for test restores.

### 2. Physical and storage-engine integrity

Use the vendor-supported tool appropriate to the restored engine and version:

- PostgreSQL's amcheck or pg_amcheck checks selected relation structures; database checksums, when enabled, serve a different purpose and coverage.
- SQL Server's DBCC CHECKDB checks logical and physical integrity. RESTORE VERIFYONLY performs useful backup checks but is not a restored-database integrity test.
- MongoDB's `validate` command checks collection data and indexes and obtains an exclusive collection lock; `full: true` performs a slower, more thorough check. Run it on the isolated restored target, not a live primary.
- MySQL's `CHECK TABLE` supports several engines and returns per-table status, warnings, and errors. For InnoDB, it can block other threads and some detected corruption paths can mark an index or table unusable or cause the server to exit, which is another reason to use an isolated target and the deployed version's usage notes.

Do not use repair options in the primary validation pass. A repair can discard or alter data and hide whether the backup met its recovery contract.

### 3. Catalog and schema integrity

Compare:

- schemas, tables, partitions, views, sequences, functions, triggers, and procedures;
- constraints and indexes, including uniqueness and validity;
- roles and grants required by the application;
- collation, encoding, locale, time zone, and engine parameters;
- extension and plugin versions;
- migration history and application compatibility.

An object-count match is not enough; compare definitions or stable hashes of normalized definitions.

### 4. Data completeness and recovery point

Find the latest continuous business commit sequence in the restored target. Compare its commit time with the declared failure or isolation time for the conventional RPO clock, and compare it with the source cutoff to quantify acknowledged writes that were lost:

~~~text
recovery point age = failure_or_isolation_time - recovered_cutoff_time
acknowledged-write loss span = max(0, source_cutoff_time - recovered_cutoff_time)
~~~

The source cutoff must be the newest acknowledged durable write before failure or isolation, and both cutoffs must refer to the same pre-failure history. Sequence subtraction yields a lost-write count only if both cutoffs use the same gap-free monotonic sequence and loss is a suffix. Otherwise, reconcile explicit business IDs. Check gaps, duplicates, nullability, referential relationships, partition boundaries, and representative row hashes. Full table checksums can be expensive and can differ for benign physical reasons; use logical, canonicalized checksums where they are required and feasible.

### 5. Business invariants

Write queries that express truths the application depends on:

~~~sql
-- Example invariant: no order lacks its balancing ledger entries.
SELECT o.id
FROM orders o
LEFT JOIN ledger_entries l ON l.order_id = o.id
GROUP BY o.id, o.captured_amount
HAVING COUNT(l.order_id) = 0
   OR COALESCE(SUM(l.amount), 0) <> o.captured_amount;
~~~

The expected result is zero rows. Other useful invariants include:

- inventory cannot be negative unless the business model permits it;
- every acknowledged event has a contiguous sequence or a documented gap;
- child rows have parents;
- object references resolve;
- totals reconcile across shards, tenants, currencies, or reporting periods;
- sentinels before and after recent migrations are readable.

### 6. Application transaction

Start a compatible application against the restored database with side effects redirected to sinks. Through its normal API:

1. authenticate as a test user;
2. read a known sentinel;
3. create a uniquely tagged synthetic transaction;
4. read it back through a separate connection;
5. verify database, outbox, cache, and sink effects;
6. roll back or retain it according to the isolated-test policy.

This catches prepared statements, permissions, schema expectations, connection TLS, and transaction behavior that database-native checks cannot.

## Validate Multi-Store Consistency

When a transaction spans a database, queue, object store, or second database, validate a common business ID or ordered outbox. A separate successful restore of each store can still combine incompatible points.

Prefer application consistency mechanisms documented by the vendor. If only crash-consistent recovery is available, test application recovery behavior and reconciliation at that boundary. State the limitation rather than claiming transaction consistency.

## Automate the Result

~~~json
{
  "backup_id": "backup-4812",
  "restore_completed": true,
  "physical_integrity": "pass",
  "schema_manifest": "pass",
  "business_invariants": {"passed": 18, "failed": 0},
  "recovery_point_age_seconds": 42,
  "acknowledged_write_loss_reported": true,
  "synthetic_transaction": "pass",
  "warnings": [],
  "result": "pass"
}
~~~

Fail closed on unknown warnings, skipped databases, invalid indexes, unverified partitions, or validation timeouts. Preserve raw outputs, not only the summary.

## Acceptance Criteria

A database restore is proven usable when:

- artifact and recovery-chain checks pass;
- the engine opens at a supported version and selected recovery point;
- vendor physical and structural checks pass without repair;
- catalog definitions, roles, extensions, and schema version match the manifest;
- recovery-point age meets the RPO contract, acknowledged-write loss is reported, and commit sequences contain no unexplained gaps;
- relational and business invariants return no violations;
- cross-store data reconciles at compatible points;
- a compatible application completes a durable synthetic transaction;
- total restore and validation time fits RTO;
- raw evidence identifies every tool and input version.

Startup is the beginning of validation, not its conclusion.

## Official References

- [PostgreSQL: pg_verifybackup](https://www.postgresql.org/docs/current/app-pgverifybackup.html)
- [PostgreSQL: amcheck](https://www.postgresql.org/docs/current/amcheck.html)
- [Microsoft SQL Server: DBCC CHECKDB](https://learn.microsoft.com/en-us/sql/t-sql/database-console-commands/dbcc-checkdb-transact-sql)
- [Microsoft SQL Server: RESTORE VERIFYONLY](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-verifyonly-transact-sql)
- [MongoDB: validate command](https://www.mongodb.com/docs/manual/reference/command/validate/)
- [MySQL 8.4: CHECK TABLE statement](https://dev.mysql.com/doc/refman/8.4/en/check-table.html)
