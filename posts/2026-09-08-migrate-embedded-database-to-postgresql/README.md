# How to Migrate an Embedded Database to PostgreSQL Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, SQLite, Database Migration, Data Migration, Schema Migration

Description: Audit SQLite types and assumptions, bulk-load PostgreSQL, validate semantics, and cut over writes with a rollback boundary.

---

Moving from SQLite to PostgreSQL is not just copying SQL rows. SQLite uses dynamic value typing unless tables are `STRICT`, represents booleans and timestamps through other storage classes, and serializes writes to one file. PostgreSQL uses rigid column types and a multi-version concurrency model with different transaction and locking behavior.

A safe migration inventories those differences before export, transforms into a deliberate target schema, and validates both data and concurrent application behavior.

## Profile the values actually stored

A declared SQLite type is an affinity, not necessarily the storage class of every value. Audit each important column with `typeof()`:

```sql
SELECT typeof(total_cents), count(*)
FROM invoice
GROUP BY typeof(total_cents);

SELECT id, created_at
FROM invoice
WHERE created_at IS NOT NULL
  AND datetime(created_at) IS NULL
LIMIT 100;
```

Look for numeric text, floating values in intended integer columns, booleans outside `0` and `1`, mixed timestamp formats, invalid UTF-8 handling in application bindings, embedded NULs, and blobs stored as text. Decide how every exceptional value will be corrected, rejected, or quarantined.

Run SQLite structural and relational checks before export:

```sql
PRAGMA integrity_check;
PRAGMA foreign_key_check;
```

Migration should not silently make existing corruption look like a PostgreSQL import error.

## Design the PostgreSQL schema explicitly

Do not mechanically replay SQLite DDL. Map meanings:

| SQLite pattern | PostgreSQL target decision |
| --- | --- |
| `INTEGER PRIMARY KEY` | `bigint GENERATED ... AS IDENTITY` or preserve external IDs |
| integer `0` and `1` | `boolean` after validating the domain |
| ISO timestamp text | `timestamp with time zone` or `timestamp without time zone` by meaning |
| Unix epoch integer | Convert with explicit unit and time zone |
| `REAL` money | Exact `numeric(p,s)` or integer minor units |
| `BLOB` | `bytea` |
| arbitrary JSON text | `jsonb` only after validating every value |

Choose `NOT NULL`, `CHECK`, `UNIQUE`, and foreign-key constraints from business rules. PostgreSQL does not automatically create an index on the referencing side of a foreign key, so add child-key indexes where delete and update patterns need them.

Prefer identity columns to the older `serial` shorthand for new designs. If existing IDs are loaded, reset each identity sequence beyond the maximum imported value and test the next generated insert.

## Normalize SQL and application assumptions

Audit queries for SQLite-specific behavior:

- placeholder syntax and binding types;
- `INSERT OR REPLACE` versus PostgreSQL `INSERT ... ON CONFLICT`;
- scalar date and string functions;
- permissive `GROUP BY` or typing assumptions;
- ASCII-only `NOCASE` collation expectations;
- quoted identifier case;
- rowid use;
- `last_insert_rowid()`;
- `PRAGMA` statements;
- comparisons between text and numbers.

Run the full test suite against PostgreSQL. Avoid an abstraction layer that sends identical SQL to both engines without acknowledging semantic differences.

## Revisit transaction behavior

PostgreSQL's default Read Committed level gives each statement a snapshot of rows committed before that statement begins. Two statements in one transaction can therefore observe different committed data. Concurrent updates can wait, deadlock, or produce a result different from code tested only under SQLite's serialized writer.

Replace check-then-insert logic with unique constraints and `ON CONFLICT`. Lock rows explicitly when a business transition requires it, and acquire locks in a consistent order. Make complete transactions retryable for deadlock or serialization failures where applicable. Keep external service calls outside database transactions.

Load-test with the production connection count. PostgreSQL supports concurrent sessions, but an oversized application pool can exhaust server memory or increase lock contention.

## Build a repeatable transformation pipeline

Export a consistent SQLite snapshot using its online backup API or a maintenance pause. Read from that immutable snapshot, transform each table into a typed staging format, and record:

- source schema version and snapshot timestamp;
- exported row count and canonical checksum per table or key range;
- rejected rows with reasons;
- transformation code version;
- target load count and checksum.

Load into PostgreSQL staging tables with `COPY`, then transform into final tables with explicit casts and validation. Server-side `COPY` reads paths visible to the database server and requires appropriate privileges; client-side `\copy` in `psql` reads from the client. Choose deliberately and protect exported data.

Build secondary indexes after a large bulk load when tests show that is faster. Add or validate constraints before accepting production writes. Analyze loaded tables so the planner has statistics.

## Validate data and behavior

Compare more than total row counts:

- counts per tenant, date, and status;
- minimum and maximum IDs and timestamps;
- null counts and type domains;
- monetary and ledger totals;
- foreign-key anti-joins;
- canonical checksums by stable primary-key range;
- representative query results and ordering.

Different engines can serialize text, floating-point values, and unordered query results differently. Canonicalize values and define `ORDER BY` before hashing. Investigate every mismatch rather than accepting a percentage threshold for critical data.

Test backups, restores, connection loss, transaction retries, and role permissions on PostgreSQL before cutover.

## Choose a cutover method

The simplest reliable cutover is a bounded write pause:

1. complete a rehearsal and measure duration;
2. stop new writes and drain jobs;
3. take the final consistent SQLite snapshot;
4. export and load the final delta or full dataset;
5. run automated validation gates;
6. point one application slice at PostgreSQL;
7. run smoke tests, then release the fleet;
8. keep SQLite read-only until the rollback deadline.

For a smaller pause, capture ordered changes after the base snapshot and replay them idempotently. SQLite does not provide a built-in logical replication stream equivalent to PostgreSQL, so the application must own and test that change log.

Avoid uncoordinated dual writes. A request can commit to one database and fail on the other, producing a reconciliation incident.

## Define rollback before cutover

Rollback is easy only before PostgreSQL accepts unique new writes. After that point, returning to the old SQLite file requires a tested reverse data path or loss of those writes. Set a clear go or no-go gate and a short observation window. Archive the source snapshot and manifests, but never let two systems independently become authoritative.

## Conclusion

Migrate meanings, constraints, and transaction behavior, not just rows. Profile SQLite's actual storage classes, design rigid PostgreSQL types, transform through staging tables, and validate canonical data and concurrent workflows. Cut over at one explicit write boundary and keep a rollback plan that acknowledges where new authoritative writes exist.

## Official Documentation

- [SQLite data types and affinity](https://www.sqlite.org/datatype3.html)
- [SQLite isolation](https://www.sqlite.org/isolation.html)
- [PostgreSQL data types](https://www.postgresql.org/docs/current/datatype.html)
- [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [PostgreSQL COPY](https://www.postgresql.org/docs/current/sql-copy.html)
