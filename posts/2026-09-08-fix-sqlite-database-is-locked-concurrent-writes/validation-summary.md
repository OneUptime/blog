# Validation Summary: How to Fix SQLite “Database Is Locked” Errors Under Concurrent Writes

## Status
validated

## Post Type
Technical troubleshooting guide with Python, SQL, and shell examples.

## Technologies Covered
- SQLite transactions, locking, busy handlers, and extended result codes
- SQLite WAL, checkpoints, and durability settings
- Python sqlite3 connection and transaction APIs
- lsof process and open-file inspection
- Write queues, idempotency, and overload handling

## Sources Consulted
- SQLite transaction control: https://www.sqlite.org/lang_transaction.html
- SQLite WAL and WAL-reset fixed releases: https://www.sqlite.org/wal.html#walreset
- SQLite busy timeout: https://www.sqlite.org/pragma.html#pragma_busy_timeout
- SQLite synchronous settings: https://www.sqlite.org/pragma.html#pragma_synchronous
- SQLite checkpoint pragma: https://www.sqlite.org/pragma.html#pragma_wal_checkpoint
- SQLite result codes: https://www.sqlite.org/rescode.html
- SQLite busy-handler limitations: https://www.sqlite.org/c3ref/busy_handler.html
- Python sqlite3 API and transaction control: https://docs.python.org/3/library/sqlite3.html
- Official lsof manual: https://github.com/lsof-org/lsof/blob/master/Lsof.8
- Author profile link: https://github.com/nawazdhandala

## Issues Found
- The durability example promised verification but only assigned the setting. Added a query and the expected FULL value, 2.
- The waiting advice omitted cases where waiting cannot resolve contention. Clarified immediate BUSY returns for deadlock avoidance, LOCKED conflicts, and the need to restart a transaction with a stale WAL snapshot.
- The transaction helper's connection requirements were implicit. Clarified that it expects an idle connection from the preceding helper with current default legacy transaction control. Explained why an existing transaction or either explicit Python autocommit boolean changes the example's behavior.

## Review Notes
- Confirmed the cited WAL-reset fix versions (3.51.3, 3.50.7, and 3.44.6) against current SQLite documentation. The warning remains accurate as of the validation date.
- Checked single-writer behavior, deferred upgrades, IMMEDIATE/EXCLUSIVE semantics, statement lifetime, rollback handling, same-host WAL requirements, journal-mode persistence, and checkpoint behavior against official documentation.
- Python examples compiled and executed on Python 3.13.1 with SQLite 3.51.0 in a disposable database. Verified timeout initialization, a successful parameterized update, rollback after a constraint failure, WAL selection, FULL readback, and the three-column passive checkpoint result.
- The local SQLite runtime predates the WAL-reset fix. Smoke checks used one connection; no concurrent WAL race or crash testing was performed. These checks do not establish production concurrency or crash-recovery behavior.
- The lsof command correctly selects the named files. Missing sidecars can produce diagnostics, and process visibility depends on host permissions. The example paths are deployment placeholders.
- The journal-mode assignment returns the selected mode; callers must inspect that result. PASSIVE checkpoints can be incomplete without waiting, so compare log frames with checkpointed frames instead of treating a zero busy flag as proof of completion.
- The current Python default transaction mode is supported, but official documentation says that default will change in a future release. Review connection initialization when upgrading Python.
- Queue sizing, batching, retry deadlines, idempotency enforcement, and crash tests require application-specific implementation and production-representative testing. The post presents these as operational guidance rather than a complete implementation.
- Referenced documentation links resolve to the intended resources; the author URL redirects to the matching GitHub profile.
