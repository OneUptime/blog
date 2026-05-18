# Validation Summary: How to Set Up SQLite with WAL Mode on Ubuntu

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- SQLite (Write-Ahead Logging mode, PRAGMA statements, checkpointing)
- Ubuntu (filesystem, cron, shell scripting)
- Python `sqlite3` standard library module
- Bash scripting

## Sources Consulted
- SQLite WAL documentation: https://www.sqlite.org/wal.html
- SQLite PRAGMA reference: https://www.sqlite.org/pragma.html
- SQLite `wal_checkpoint` pragma: https://www.sqlite.org/pragma.html#pragma_wal_checkpoint
- SQLite `wal_autocheckpoint` pragma: https://www.sqlite.org/pragma.html#pragma_wal_autocheckpoint
- SQLite `synchronous` pragma: https://www.sqlite.org/pragma.html#pragma_synchronous
- SQLite `.backup` and online backup API: https://www.sqlite.org/backup.html
- SQLite `VACUUM INTO`: https://www.sqlite.org/lang_vacuum.html
- Python `sqlite3` module docs: https://docs.python.org/3/library/sqlite3.html

## Issues Found
1. **Inaccurate description of `PRAGMA wal_checkpoint` return values.** The post described the three returned columns as `busy-page-count|log-size|frames-checkpointed` in one place and `wal-log|frames-written|frames-checkpointed` in another. Per the official SQLite docs, the first column is a busy flag (0 on success, 1 if `SQLITE_BUSY` was returned because the checkpoint was blocked), the second is the number of modified pages in the WAL, and the third is the number of pages moved back to the main database. Updated both code comments to use `busy|pages-in-wal|pages-checkpointed` and added a one-line clarification of what the `busy` value means.

## Review Notes
- The Read-only databases note is a slight oversimplification. Since SQLite 3.22.0 (2018), WAL mode can be used with a read-only database file if the `-shm`/`-wal` files already exist and are readable, if the containing directory is writable, or if the `immutable=1` query parameter is set. The post's statement still matches the common case (database file and directory both read-only) and the practical recommendation is correct, so it was left as-is.
- The `find /data -name "*.db" -type f | while read db` loop in the checkpoint script will mishandle filenames containing whitespace or backslashes. For database files following the standard `*.db` naming convention this is unlikely to matter in practice, but a more robust pattern would use `find -print0 | while IFS= read -r -d ''`.
- `PRAGMA cache_size = -32768` correctly requests 32 MiB of page cache (negative values are in KiB); `PRAGMA mmap_size = 268435456` correctly requests 256 MiB of memory-mapped I/O.
- `VACUUM INTO` requires SQLite 3.27.0 (Feb 2019) or later, which is satisfied by every supported Ubuntu release.
- The PostgreSQL durability comparison (`synchronous = FULL` matching PostgreSQL's default) is a fair characterisation — PostgreSQL's default `synchronous_commit = on` fsyncs the WAL at commit, analogous to SQLite's `FULL`.
