# Validation Summary: How to Test NFS and SMB Locking for an Embedded Database

## Status

validated

## Post Type

Technical guide with shell commands and SQLite SQL examples.

## Technologies Covered

- NFS and SMB network filesystems
- SQLite CLI, rollback journals, WAL, transactions, and VFS
- Filesystem locking, synchronization, crash recovery, and durability
- Linux mount inspection and GNU stat
- PostgreSQL and application-service alternatives

## Sources Consulted

- SQLite network-storage guidance: https://www.sqlite.org/useovernet.html
- SQLite WAL limitations: https://www.sqlite.org/wal.html
- SQLite locking and concurrency: https://www.sqlite.org/lockingv3.html
- SQLite corruption causes: https://www.sqlite.org/howtocorrupt.html
- SQLite transaction semantics: https://www.sqlite.org/lang_transaction.html
- SQLite CLI commands and error handling: https://www.sqlite.org/cli.html
- SQLite PRAGMAs, including busy_timeout, journal_mode, synchronous, integrity_check, and foreign_key_check: https://www.sqlite.org/pragma.html
- SQLite atomic commit and storage assumptions: https://www.sqlite.org/atomiccommit.html
- Python official monotonic-clock documentation: https://docs.python.org/3/library/time.html#time.monotonic
- GNU coreutils stat manual, reproduced on man7: https://man7.org/linux/man-pages/man1/stat.1.html
- util-linux mount manual: https://man7.org/linux/man-pages/man8/mount.8.html
- Author profile link verified: https://github.com/nawazdhandala
- Installed SQLite 3.51.0 CLI version and `.help` output.

## Issues Found

1. **Cross-host timing:** Monotonic timestamps have no common cross-host reference point. Replaced direct comparison with synchronized wall-clock timestamps and known clock-error bounds, while retaining monotonic clocks for local durations. Specified recording actual lock and commit events.
2. **Timeout interpretation:** A write started during the sleep can succeed legitimately if host A commits before the timeout expires. Clarified the required overlap and the expected SQLITE_BUSY result when the lock persists throughout the timeout.
3. **Script error handling:** The CLI defaults to continuing after errors. Added `.bail on` so a failed transaction setup cannot be followed by misleading later statements.
4. **Command portability:** `stat -f` has the intended filesystem-status meaning in GNU stat, but is not portable across the operating systems discussed. Scoped the inspection commands to Linux with GNU stat.
5. **Acknowledgment tracking:** Successful inserts inside an open transaction are not committed operations. Clarified that the external record tracks acknowledged commits, applies the chosen durability guarantees, and reconciles uncertain outcomes when acknowledgment is interrupted.
6. **Recovery guarantees:** The original recovery instruction did not explain that some synchronous settings permit corruption, rather than only transaction loss. Clarified DELETE-mode EXTRA durability, FULL filesystem-dependent durability, and the consistency risks of NORMAL and OFF. Required recording modes per connection and distinguished configuration failures from filesystem defects.
7. **Fault-test rejection criteria:** The conclusion treated every anomaly as grounds for rejection even though contention, full storage, and injected outages can produce expected errors. Restricted this to unexpected exclusion, integrity, or durability failures and explained that expected error returns alone do not establish unsafe locking.

## Review Notes

- Verified the rollback-journal exclusion model, cross-host WAL restriction, VFS coordination warning, and recommendation to keep database access beside storage against SQLite documentation.
- All four documentation links in the post resolved to the intended official resources; the author URL also resolved.
- Ran the revised SQL using two local SQLite CLI processes on a disposable temporary database, shortening the sleep to four seconds and adding a readiness marker for the test harness. The competing insert returned exit code 5 with a database-locked message after approximately 2.22 seconds. After host A committed, the retry succeeded, both expected rows were present, integrity_check returned ok, and foreign_key_check returned no violations.
- This local execution validates CLI syntax and ordinary process contention only. No separate-host NFS/SMB share, failover, remount, network interruption, or storage power-loss testing was performed. Publication validation does not certify a deployment.
- foreign_key_check is valid but has no constraints to check in the minimal events schema; it becomes useful for a representative application schema with foreign keys.
- No deprecated SQL or CLI features were identified. The article specifies no particular NFS/SMB protocol version or vendor configuration to certify.
- The GNU website could not be fetched; its published coreutils manual reproduced on man7 was checked instead.
