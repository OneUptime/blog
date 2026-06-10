# Validation Summary: How to Implement Synthetic Full Backups

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Synthetic full backup concepts (block-level and file-level)
- Python (hashlib SHA-256, pathlib, shutil, os) for backup implementation
- PostgreSQL (pg_basebackup, pg_ctl, pg_isready, WAL archiving, recovery.signal)
- Bash scripting
- Deduplication concepts
- Prometheus-style metrics (illustrative)
- Mermaid diagrams

## Sources Consulted
- PostgreSQL official documentation for `pg_basebackup` (https://www.postgresql.org/docs/current/app-pgbasebackup.html) — verified `-Ft` (tar format), `-z` (gzip), `-P` (progress), `--checkpoint=fast`, `--wal-method=stream` flags
- PostgreSQL documentation on continuous archiving and PITR (https://www.postgresql.org/docs/current/continuous-archiving.html) — verified `recovery.signal`, `restore_command`, `recovery_target = 'immediate'`, `recovery_target_action = 'promote'` are valid for PostgreSQL 12+
- PostgreSQL `pg_archivecleanup` documentation (https://www.postgresql.org/docs/current/pgarchivecleanup.html)
- Python `hashlib` documentation (https://docs.python.org/3/library/hashlib.html) — verified `sha256` usage
- Python `pathlib` and `shutil.copy2` documentation — verified API usage (copy2 preserves metadata)
- General industry references on synthetic full backups (Veeam, Commvault, Veritas concepts)

## Issues Found
- **PostgreSQL bash script (Approach 3): missing port configuration for the temporary instance.** The script invokes `pg_isready -h localhost -p 5433` and `pg_basebackup -h localhost -p 5433` to talk to a temporary PostgreSQL instance, but the `postgresql.conf` overrides did not set `port = 5433`. Because the conf is appended to one extracted from the base backup (which carries the production `port = 5432`), the temporary instance would start on 5432, conflict with production, and the subsequent connection attempts on 5433 would fail.
  - Fix: Added `port = 5433` to the `postgresql.conf` heredoc so the temporary instance binds to the expected port.

## Review Notes
- The Python implementations are intentionally educational and use content-addressed storage (global block/file dedup keyed by SHA-256). They are conceptually correct but simplified:
  - `BlockStore.create_synthetic_full` keeps trailing blocks from the base if an incremental's block map is shorter; this is fine because the example `create_incremental` also writes a full block map per backup, but readers using this as a starting point for production code should handle file-shrinking explicitly.
  - `FileBackupSystem` detects changes by `mtime` only, which is a known and acceptable limitation for an illustrative example (production systems usually combine mtime, size, and content hashing).
- The PostgreSQL script remains conceptual after the fix. A few aspects worth flagging for readers who treat it as production-ready code:
  - The `pg_archivecleanup` call inside `create_wal_archive` is misplaced (cleanup belongs in retention logic, not archival), and its second argument (from `pg_controldata | grep 'Latest checkpoint'`) will match multiple lines because `pg_controldata` emits several lines containing "Latest checkpoint" (e.g., `Latest checkpoint location`, `Latest checkpoint's REDO location`, etc.). For real use the second arg should be a single WAL filename.
  - Manually `cp`-ing files out of `pg_wal/` is unsafe versus PostgreSQL's documented `archive_command` / `pg_receivewal` approach because files may still be being written.
  - These were left unchanged because the script is presented as an illustrative pattern and rewriting it would go beyond fixing strictly incorrect technical claims.
- The YAML block under "Monitoring Synthetic Full Creation" is not a valid Prometheus `scrape_configs` document (Prometheus has no `metrics:` key under `job_name`); it reads as a free-form list of metric names the author would expose, which is how it is labeled. Left as-is.
- Mermaid `subgraph` headers like `subgraph Week 1` (no bracketed label) render in current Mermaid versions but can fail in some renderers if the ID contains spaces. Not a technical error — left as-is.
- `pg_basebackup` flags (`-Ft`, `-z`, `-P`, `--checkpoint=fast`, `--wal-method=stream`) are correct for PostgreSQL 10+. `recovery.signal` + `recovery_target_action = 'promote'` is correct for PostgreSQL 12+ (replacing the deprecated `recovery.conf` mechanism).
