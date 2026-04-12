# Validation Summary: What Is gh-ost for MySQL Schema Migrations

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (binary logging, row-based replication, schema migrations)
- gh-ost (GitHub Online Schema Migrations tool)
- pt-online-schema-change (referenced for comparison)

## Sources Consulted
- gh-ost GitHub repository README and documentation: https://github.com/github/gh-ost
- gh-ost triggerless design doc: https://github.com/github/gh-ost/blob/master/doc/triggerless-design.md
- gh-ost requirements and limitations: https://github.com/github/gh-ost/blob/master/doc/requirements-and-limitations.md
- gh-ost interactive commands doc: https://github.com/github/gh-ost/blob/master/doc/interactive-commands.md
- gh-ost command-line flags doc: https://github.com/github/gh-ost/blob/master/doc/command-line-flags.md
- gh-ost cut-over doc: https://github.com/github/gh-ost/blob/master/doc/cut-over.md
- gh-ost source code (go/base/context.go) for table naming conventions
- MySQL 8.0 Reference Manual for TEXT column DEFAULT value support (added in 8.0.13)

## Issues Found

1. **Ghost table name was wrong (line 17)**: The post stated the ghost table is named `_tablename_ghc`. This is actually the changelog/heartbeat table. The ghost table (where data is copied with the new schema) is named `_tablename_gho`. Fixed to `_tablename_gho`.

2. **Installation URL was broken (lines 25-29)**: The post used `https://github.com/github/gh-ost/releases/latest/download/gh-ost-binary-linux-amd64.tar.gz`, but gh-ost release assets include a build timestamp in the filename (e.g., `gh-ost-binary-linux-amd64-20231207144803.tar.gz`), so the `/latest/download/` shortcut cannot resolve to a valid asset. Fixed to use a version-specific URL with a comment directing readers to check the releases page for the latest version.

3. **ALTER example used MySQL 8.0.13+ syntax (line 89)**: The `MODIFY COLUMN bio TEXT NOT NULL DEFAULT ''` statement only works in MySQL 8.0.13+ because TEXT columns could not have DEFAULT values in MySQL 5.7. Since gh-ost supports MySQL 5.7+, this example could fail for readers on older versions. Replaced with `ADD COLUMN last_login DATETIME NULL` which works across all supported MySQL versions.

4. **False claim about tables with existing triggers (line 126)**: The post stated "Binlog-based approach works well on tables that already have triggers." This is incorrect — gh-ost's requirements explicitly state "Triggers are not supported." If the original table has triggers, gh-ost will refuse to operate on it. Rewrote to accurately note that gh-ost avoids triggers entirely.

5. **Misleading "no write amplification" claim (line 125)**: The post claimed "no write amplification" as an advantage. While gh-ost eliminates trigger-based write amplification, it introduces its own overhead by reading data and writing it back (often across hosts via the network). The gh-ost docs explicitly acknowledge this in the "No free meals" section. Clarified to specify "no trigger-based write amplification."

## Review Notes
- The table swap description ("two-step lock that lasts milliseconds") is a reasonable simplification. The actual mechanism is an atomic two-step blocking swap using two connections: one holds a LOCK TABLES WRITE while the other queues a RENAME TABLE that executes atomically when the lock is released. The "milliseconds" claim is plausible but not precisely documented.
- The `--postpone-cut-over-flag-file` flag, interactive socket commands, throttling flags, and prerequisites are all verified correct.
- The post's "dry run" note (omitting `--execute`) is accurate — gh-ost runs in noop mode by default without `--execute`.
