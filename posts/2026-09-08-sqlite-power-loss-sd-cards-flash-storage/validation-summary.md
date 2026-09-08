# Validation Summary: How to Survive Sudden Power Loss When SQLite Runs on SD Cards or Flash Storage

## Status
validated

## Post Type
Technical guide with SQL configuration and transaction examples.

## Technologies Covered
- SQLite transactions, rollback journals, WAL, synchronous settings, and recovery
- SD cards, flash controllers, local filesystems, and power-loss durability
- SQL parameter binding, integrity checks, checkpoints, VACUUM, and backups
- Unix process termination and device power-cut testing

## Sources Consulted
- SQLite atomic commit: https://www.sqlite.org/atomiccommit.html
- SQLite synchronous and validation pragmas: https://www.sqlite.org/pragma.html#pragma_synchronous
- SQLite causes of corruption: https://www.sqlite.org/howtocorrupt.html
- SQLite WAL, including the WAL-reset fix: https://www.sqlite.org/wal.html
- SQLite temporary files and their locations: https://www.sqlite.org/tempfiles.html
- SQLite transaction syntax and locking: https://www.sqlite.org/lang_transaction.html
- SQLite parameter binding: https://www.sqlite.org/c3ref/bind_blob.html
- SQLite VACUUM: https://www.sqlite.org/lang_vacuum.html
- SQLite backup API: https://www.sqlite.org/backup.html
- Local `/bin/kill -l` output, confirming signal 9 is SIGKILL.

## Issues Found
1. **Temporary-file placement was unnecessarily restrictive.** The post required all temporary files to share the database filesystem. Corrected this to keep the journal or WAL beside the database while allowing other temporary files in a separate local temporary directory or memory, consistent with SQLite's documented behavior.
2. **WAL advice lacked a relevant corruption-fix prerequisite.** Added the documented WAL-reset fix versions: SQLite 3.51.3 or later, or a patched release such as 3.44.6 or 3.50.7. Unpatched releases can suffer rare corruption when multiple connections write or checkpoint concurrently. This qualification is relevant to the post's durability claims and checkpoint guidance.

## Review Notes
- Confirmed WAL/FULL commit synchronization, WAL/NORMAL's potential loss of acknowledged commits after power failure, and DELETE/EXTRA's directory synchronization. The settings used are not deprecated. WAL mode persists; synchronous settings must be configured on each connection as advised.
- Executed both configuration examples and the parameterized transaction against disposable file-backed databases using local SQLite 3.51.0. Both modes returned the expected settings; two bound inserts committed and survived closing and reopening. Integrity checks returned `ok`; foreign-key checks returned no rows. This single-connection syntax test does not qualify that older runtime for concurrent WAL production use.
- The transaction example assumes an existing `samples` table and application-provided values for each `?` parameter. BEGIN IMMEDIATE can return SQLITE_BUSY under contention; production code must handle errors and roll back as appropriate.
- Confirmed the distinct roles of integrity_check and foreign_key_check: structural checks do not establish application invariants or prove that acknowledged transactions survived.
- Journal preservation, compatible locking, local storage, checkpoint starvation, full VACUUM rewrites, and database-aware backups agree with SQLite documentation. The four official documentation links resolve to their intended resources; the author link has a plausible GitHub profile URL.
- Hardware selection, reserve capacity, hold-up power, replacement schedules, and repeated temperature/lifetime power-cut trials are qualification recommendations, not universal guarantees or a specified certification standard. No physical flash hardware or power-cut fixture was tested in this review.
- Independent acknowledgement logs establish a lower bound on known successful commits: a transaction may commit before its acknowledgement reaches the external recorder. Such additional recovered transactions are not by themselves corruption. Randomized cuts should cover writes, commits, and checkpoints.
- Process termination does not reproduce loss of power to the operating system and controller caches. The SQL smoke tests therefore establish syntax and ordinary behavior only, not power-loss durability.
