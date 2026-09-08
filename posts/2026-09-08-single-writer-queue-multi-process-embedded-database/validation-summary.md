# Validation Summary: How to Build a Single-Writer Queue for an Embedded Database

## Status
validated

## Post Type
Technical implementation guide with SQL and JSON examples.

## Technologies Covered
- SQLite transactions, WAL, parameter binding, constraints, and durability
- LMDB concurrency, snapshots, syncing, and crash handling
- DuckDB native-file process boundaries
- IPC queues, idempotency, batching, backpressure, and observability
- File spool durability using rename and filesystem syncing

## Sources Consulted
- SQLite transactions: https://www.sqlite.org/lang_transaction.html
- SQLite WAL: https://www.sqlite.org/wal.html
- SQLite UPDATE: https://www.sqlite.org/lang_update.html
- SQLite conflict handling: https://www.sqlite.org/lang_conflict.html
- SQLite changed-row counts: https://www.sqlite.org/c3ref/changes.html
- SQLite parameters and expressions: https://www.sqlite.org/lang_expr.html
- SQLite synchronous settings: https://www.sqlite.org/pragma.html#pragma_synchronous
- DuckDB concurrency: https://duckdb.org/docs/current/connect/concurrency.html
- LMDB official API and design documentation: https://github.com/LMDB/lmdb/blob/mdb.master/libraries/liblmdb/lmdb.h
- Linux fsync manual: https://man7.org/linux/man-pages/man2/fsync.2.html
- Linux rename manual: https://man7.org/linux/man-pages/man2/rename.2.html
- AWS Builders' Library, idempotent APIs: https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/
- Author link checked: https://www.github.com/nawazdhandala

## Issues Found
1. The SQL stored no outcome despite promising replay of a stored response. Added an explicit fixed receipt stored atomically with the mutation.
2. Reusing a key with different request data could silently return success for the wrong operation. Added a stored request fingerprint and operation/payload comparison for both lookup and duplicate-conflict paths.
3. An UPDATE matching no invoice would still commit the idempotency record. Required the application to check for exactly one updated row and roll back otherwise. Clarified required schema constraints and separate parameterized statement execution with rollback on failure.
4. Commit acknowledgements lacked the durability qualification needed for power-loss recovery. Added SQLite WAL FULL syncing and the requirement to avoid weakened LMDB commit syncing when power-loss durability is promised.
5. At-least-once delivery with deduplication was called exactly-once delivery. Corrected this to exactly-once database effects and specified retention across the retry/replay window.
6. The startup recovery wording implied all covered engines replay journals or WAL. Distinguished LMDB copy-on-write recovery and stale reader cleanup from journal/WAL recovery.

## Review Notes
- The ownership pattern, engine read-access table, short transactions, bounded admission, batching constraints, explicit ordering, and snapshot visibility guidance are sound. Operational queue limits and alert thresholds are workload-dependent recommendations, not engine APIs.
- The JSON command envelope parses successfully. Its operation version and deadline fields are application-defined; the post does not depend on a particular SDK or CLI version.
- Executed the revised SQL statements with bound parameters against an in-memory SQLite database and a schema satisfying the documented constraints. Verified a successful payment, duplicate-key rollback without a second increment, missing-invoice rollback without a retained key, and the stored receipt. The initial test harness split a semicolon inside a SQL comment; stripping comments before statement splitting resolved that harness error.
- The SQL is an implementation sketch requiring host-language lookup, fingerprint comparison, row-count checks, and error handling. No complete queue implementation, multi-process benchmark, or power-failure test is provided or claimed.
- File and directory syncing guidance is consistent with the Linux manuals; actual guarantees remain dependent on the platform, filesystem, and storage device honoring sync operations.
- Existing documentation and author links resolve to the expected resources, including normal redirects. No deprecated SQL syntax was identified.
