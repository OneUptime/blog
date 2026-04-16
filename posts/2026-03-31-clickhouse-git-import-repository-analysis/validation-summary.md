# Validation Summary: How to Use clickhouse-git-import for Repository Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- `clickhouse-git-import` utility
- `clickhouse-client`
- Git
- SQL (ClickHouse dialect)

## Sources Consulted
- Official ClickHouse docs: https://clickhouse.com/docs/operations/utilities/clickhouse-git-import
- ClickHouse source: `programs/git-import/git-import.cpp` (master branch) — flag definitions at lines 1202–1223, table schemas and workflow documentation at lines 28–176

## Issues Found

Several significant technical errors were found and corrected:

1. **Non-existent command-line flags.** The original post passed `--host localhost --port 9000 --database git_analytics` to `clickhouse-git-import`. These flags do not exist — the tool does not connect to ClickHouse at all. Replaced with the actual workflow: the tool writes `commits.tsv`, `file_changes.tsv`, and `line_changes.tsv` into the current directory, which are then loaded via `clickhouse-client`.

2. **Wrong format for `--skip-paths`.** The original used `".vendor,.git,node_modules"` (a comma-separated list). The flag actually takes a re2 regular expression. Changed to `'generated|vendor|node_modules'` and added a clarifying note.

3. **False claim that the tool auto-creates tables.** The original said "The tool creates and populates several tables automatically" and showed `SHOW TABLES FROM git_analytics` as if the tables would appear. In reality, the user must create the tables manually using DDL printed by `clickhouse-git-import --help`. Rewrote the "Tables Created" section as "Tables and Loading the Data" with the real two-step workflow (create DB/tables, then `INSERT ... FORMAT TSV`).

4. **Incorrect re-import instructions.** The original claimed re-running with `--host/--port/--database` flags "truncates and reimports". The tool neither accepts those flags nor touches ClickHouse. Replaced with the actual procedure: `TRUNCATE TABLE` via `clickhouse-client`, regenerate TSVs, reload.

5. **Misleading "commits" count query.** The "Top Contributors by Commits" query used `count()` on `file_changes`, which returns the number of file-change rows (one per file per commit), not commits. Replaced with `uniqExact(commit_hash) AS commits` for accurate per-author commit counts.

## Review Notes

- Schemas referenced in the remaining queries are accurate: `file_changes` does have `author`, `lines_added`, `lines_deleted`, `path`, `commit_hash`, and `time`; `commits` has `hash`, `author`, `time`, `message`. The `sign` column in `line_changes` is real (`Int8`, +1 for added / -1 for deleted lines).
- The "Analyzing Multiple Repositories" section is vague (the original wording about "table prefixes" isn't mechanically enforced by the tool — you would need to rename or load into separate databases) but not technically wrong, so left untouched per the instruction to fix only outright errors.
- `which clickhouse-git-import` showing `/usr/bin/clickhouse-git-import` is plausible for standard Debian/RPM installs of the ClickHouse package and was left as-is.
