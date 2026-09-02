# Validation Summary: How to Test Database Restores for Data Integrity, Not Just Startup Success

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- PostgreSQL 17 base-backup verification, `amcheck`, `pg_amcheck`, WAL, and data checksums
- Microsoft SQL Server `DBCC CHECKDB`, `RESTORE VERIFYONLY`, and transaction durability
- MongoDB collection and index validation
- MySQL 8.4 `CHECK TABLE` and InnoDB integrity behavior
- YAML validation manifests, SQL business-invariant queries, and JSON validation reports
- Database backup and restore testing, RPO, RTO, point-in-time recovery, and acknowledged-write reconciliation
- Application-level synthetic transactions, outbox validation, and multi-store consistency

## Sources Consulted

- [PostgreSQL 17: `pg_verifybackup`](https://www.postgresql.org/docs/17/app-pgverifybackup.html)
- [PostgreSQL 17: `pg_combinebackup`](https://www.postgresql.org/docs/17/app-pgcombinebackup.html)
- [PostgreSQL 17: `pg_amcheck`](https://www.postgresql.org/docs/17/app-pgamcheck.html)
- [PostgreSQL 17: `amcheck`](https://www.postgresql.org/docs/17/amcheck.html)
- [PostgreSQL 17: Data Checksums](https://www.postgresql.org/docs/17/checksums.html)
- [PostgreSQL 17: Continuous Archiving and Point-in-Time Recovery](https://www.postgresql.org/docs/17/continuous-archiving.html)
- [PostgreSQL 17: Transactions](https://www.postgresql.org/docs/17/tutorial-transactions.html)
- [PostgreSQL 17: Asynchronous Commit](https://www.postgresql.org/docs/17/wal-async-commit.html)
- [PostgreSQL 17: Aggregate Functions](https://www.postgresql.org/docs/17/functions-aggregate.html)
- [PostgreSQL 17: Table Expressions](https://www.postgresql.org/docs/17/queries-table-expressions.html)
- [Microsoft SQL Server: `DBCC CHECKDB`](https://learn.microsoft.com/en-us/sql/t-sql/database-console-commands/dbcc-checkdb-transact-sql?view=sql-server-ver17)
- [Microsoft SQL Server: `RESTORE VERIFYONLY`](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-verifyonly-transact-sql?view=sql-server-ver17)
- [Microsoft SQL Server: Control Transaction Durability](https://learn.microsoft.com/en-us/sql/relational-databases/logs/control-transaction-durability?view=sql-server-ver17)
- [MongoDB: `validate` command](https://www.mongodb.com/docs/manual/reference/command/validate/)
- [MongoDB: Write Concern](https://www.mongodb.com/docs/manual/reference/write-concern/)
- [MySQL 8.4: `CHECK TABLE` Statement](https://dev.mysql.com/doc/refman/8.4/en/check-table.html)
- [MySQL 8.4: Optimizing InnoDB Transaction Management](https://dev.mysql.com/doc/refman/8.4/en/optimizing-innodb-transaction-management.html)
- [NIST SP 800-34 Rev. 1: Contingency Planning Guide for Federal Information Systems](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final)
- [YAML 1.2.2 Specification](https://yaml.org/spec/1.2.2/)
- [RFC 8259: The JavaScript Object Notation (JSON) Data Interchange Format](https://www.rfc-editor.org/rfc/rfc8259.html)

## Issues Found

- The validation manifest labeled `pg_amcheck --all` as a physical check. PostgreSQL describes `amcheck` as checking the logical and structural consistency of supported relations, and it can inspect pages already present in shared buffers rather than forcing a disk read. Renamed the manifest field from `physical_check` to `structural_check`; the post already correctly distinguishes this coverage from data checksums.
- The `pg_verifybackup` description applied too broadly to PostgreSQL base backups and did not state its format, manifest, WAL, point-in-time recovery, or version boundaries. Narrowed it to `pg_basebackup` backups with a manifest in plain format, or tar backups after extraction; clarified that WAL parsing can be disabled, extra archived WAL for a later recovery target is not checked, and the WAL-verification tool version must match the backup. The PostgreSQL reference links were pinned to version 17 to match the sample manifest.
- The application transaction procedure said to create a synthetic transaction, read it through a separate connection, and then roll it back. Under normal transaction isolation, another connection cannot see the open transaction's changes; after the transaction is committed and visible, that same transaction cannot be rolled back. It also did not explicitly require the database's durable commit policy, even though PostgreSQL asynchronous commit, SQL Server delayed durability, and comparable engine settings can acknowledge a commit before it is durable. Changed the procedure to commit the synthetic transaction under the required durability policy and to clean it up in a new transaction or retain it under the isolated-test policy.

## Review Notes

- The YAML manifest and JSON result examples parse successfully, and the SQL invariant correctly returns orders with no ledger entries or a mismatched ledger sum in representative execution tests.
- For PostgreSQL 17 incremental backups, `pg_combinebackup` verifies that supplied backups form a legal dependency chain but does not verify each artifact's integrity; each backup still requires `pg_verifybackup`. This is consistent with the post's separate requirements to verify both artifacts and chains.
- `pg_amcheck --all` is valid in PostgreSQL 17. Its coverage is intentionally limited: PostgreSQL documents support for ordinary and TOAST tables, materialized views, sequences, and B-tree indexes, while other relation types are silently skipped. `amcheck` can establish that corruption is present, not prove its absence. It also requires the `amcheck` extension in each checked database; `--install-missing` is available but requires a suitably privileged identity and changes the target, so validation environments should provision the extension before the read-only pass.
- `DBCC CHECKDB` does not validate the data in memory-optimized tables or disabled indexes, and some advanced logical checks require `WITH EXTENDED_LOGICAL_CHECKS`. These are coverage caveats rather than contradictions of the post's documented use of vendor-appropriate checks.
- MongoDB `validate` can update count and data-size statistics even without `repair: true`, and full WiredTiger oplog validation has an exception to the more thorough scan. MySQL documents that `CHECK TABLE` does not detect every possible InnoDB corruption. These limitations reinforce the post's layered validation approach.
- Timestamp-based RPO calculations require a common time basis and sufficiently synchronized clocks. The post's separate warning that sequence subtraction is valid only for a shared, gap-free monotonic sequence with suffix-only loss is correct.
- All external links in the post returned successful HTTP responses during validation. PostgreSQL-specific claims and links were checked against version 17, the major version named by the sample manifest.
