# How to Back Up a WAL-Mode SQLite Database Without Losing Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQLite, WAL, Backup, Data Integrity, Disaster Recovery

Description: Explain why the SQLite WAL is part of database state and create consistent, verified backups without racing active writers.

---

In write-ahead logging mode, a committed transaction can exist only in `app.db-wal` and not yet in `app.db`. Copying the main file while the application is running can therefore omit committed data. It can also combine pages observed at different times and produce a snapshot that never existed.

The `-wal` file is part of the persistent state of a live WAL-mode database. Never separate it from the main file, delete it as cleanup, or assume that `-shm` and `-wal` sidecars are disposable while connections are open.

Before relying on concurrent WAL writers and checkpoints, verify the runtime with `SELECT sqlite_version();`. Use SQLite 3.51.3 or later, or a release containing an official backport such as 3.50.7 or 3.44.6. Earlier releases from 3.7.0 through 3.51.2 are affected by the rare WAL-reset race unless they include that backport. The race can corrupt a database when concurrent connections write and checkpoint at a particular instant.

WAL mode and the `synchronous` setting have different scope. `PRAGMA journal_mode=WAL` persists in the database, while `PRAGMA synchronous` is a per-connection setting. Configure and verify the required synchronous level on every connection. In WAL mode, `FULL` adds a durability sync after each commit; `NORMAL` preserves consistency but a power loss can roll back a recently acknowledged transaction.

## Prefer a database-aware snapshot

The SQLite command-line shell exposes the online backup API through `.backup`:

```bash
sqlite3 /srv/app/app.db ".backup '/srv/backups/app-2026-09-08.db'"
```

The online backup API reads a coherent database snapshot and can copy incrementally, holding source locks only while pages are read. Language bindings often expose the same API. For example, Python provides `Connection.backup`:

```python
import sqlite3

source = sqlite3.connect("file:/srv/app/app.db?mode=ro", uri=True)
destination = sqlite3.connect("/srv/backups/app-2026-09-08.db")
try:
    source.backup(destination, pages=256, sleep=0.050)
finally:
    destination.close()
    source.close()
```

Opening the source as read-only does not mean the database is quiescent. Consistency comes from the backup API, not from the URI flag.

`VACUUM INTO` is another database-aware option when a compact copy is useful:

```sql
VACUUM INTO '/srv/backups/app-2026-09-08.db';
```

The destination must not exist or must be an empty file. `VACUUM INTO` requires additional disk space and performs a full rebuild, so benchmark its I/O impact before scheduling it on a busy device.

## Use filesystem copies only after a clean shutdown

If policy requires a byte-for-byte filesystem copy, stop new requests, let all transactions finish, close every SQLite connection in every process, and then copy the file. The last clean close normally checkpoints and removes the WAL and shared-memory files. Keep all processes stopped throughout the copy. If a WAL file remains, copy it together with the main file while both are quiescent, or complete a successful checkpoint using SQLite before copying the main file alone.

Check for processes that still have the database open, using sufficient privileges to see all relevant processes. This check does not prevent a process from reopening the database:

```bash
lsof /srv/app/app.db /srv/app/app.db-wal /srv/app/app.db-shm
```

Do not run `PRAGMA wal_checkpoint(TRUNCATE)` and immediately copy the main file while writers remain active. A new transaction can enter the WAL between the checkpoint and the copy. A storage snapshot can be valid only if the snapshot mechanism captures the database and its WAL atomically at one instant. The `-shm` file is a rebuildable WAL index and need not be included in the backup. Confirm those guarantees with the storage provider and test restores.

## Publish a backup only after verification

Write each backup to a unique staging name, close it, and open that copy independently. At minimum, run:

```bash
sqlite3 /srv/backups/app-2026-09-08.db "PRAGMA quick_check;"
sqlite3 /srv/backups/app-2026-09-08.db "PRAGMA foreign_key_check;"
```

Require `quick_check` to return `ok` and `foreign_key_check` to return no rows; a successful command exit alone does not prove the checks passed. Use `PRAGMA integrity_check` for a deeper periodic check. `quick_check` and `integrity_check` do not detect foreign-key violations, which is why the second command is separate.

Structural checks cannot prove application correctness. Record and compare invariants such as tenant count, latest event timestamp, important totals, schema version, and required indexes. Restore the copy into an isolated environment and exercise representative reads.

Only after verification should automation mark the backup complete or update a `latest` pointer. If a backup job fails, leave the last known-good backup untouched.

## Retain the information needed to restore

Store a manifest next to the backup containing:

- creation time in UTC;
- source database identity and schema version;
- SQLite library version;
- backup method;
- file size and cryptographic checksum;
- verification results;
- application release needed to read it;
- encryption key identifier, if applicable.

Encrypt backups independently of transport and restrict read access. A consistent SQLite file still contains all of the production data.

## Test the recovery point objective

An online backup captures a point in time; it does not continuously ship later transactions. Choose a schedule based on the amount of data the business can lose, not on how quickly the backup command runs. Keep multiple generations and test restores on a schedule.

A useful restore drill starts from an empty directory, verifies the checksum, opens the database with the supported SQLite version, runs both structural and foreign-key checks, starts the matching application build, and records the time until service is usable.

## Avoid unsafe shortcuts

These practices do not produce a trustworthy live backup:

- copying only `app.db` while any writer can run;
- copying `app.db`, then copying `app.db-wal` in a separate operation;
- deleting `app.db-wal` before copying;
- assuming `sync` or `fsync` makes a multi-file copy atomic;
- validating the source instead of the copied artifact;
- retaining backups that have never been restored.

## Conclusion

A WAL-mode SQLite database is not always represented by its main file alone. Use the online backup API or `VACUUM INTO` for a coherent live snapshot. Use a plain filesystem copy only after every connection has closed and while the files remain quiescent, preserving any remaining WAL, or through a proven atomic snapshot of the database and its WAL. Validate and restore the resulting artifact before counting it as a backup.

## Official Documentation

- [SQLite write-ahead logging and the WAL file](https://www.sqlite.org/wal.html)
- [SQLite WAL-reset bug and fixed releases](https://www.sqlite.org/wal.html#walreset)
- [SQLite `synchronous` pragma](https://www.sqlite.org/pragma.html#pragma_synchronous)
- [SQLite online backup API](https://www.sqlite.org/backup.html)
- [SQLite `VACUUM INTO`](https://www.sqlite.org/lang_vacuum.html#vacuuminto)
- [SQLite command-line shell backup command](https://www.sqlite.org/cli.html#special_commands_to_sqlite3_dot_commands_)
