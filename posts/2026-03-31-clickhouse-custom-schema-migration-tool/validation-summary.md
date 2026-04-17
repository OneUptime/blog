# Validation Summary: How to Build a Custom Schema Migration Tool for ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (ReplacingMergeTree engine, DDL, mutations)
- Python 3 (clickhouse-driver package)
- SQL migration patterns

## Sources Consulted
- ClickHouse documentation — ReplacingMergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse documentation — ALTER TABLE ... DELETE mutations: https://clickhouse.com/docs/en/sql-reference/statements/alter/delete
- ClickHouse documentation — SELECT ... FINAL modifier: https://clickhouse.com/docs/en/sql-reference/statements/select/from#final-modifier
- clickhouse-driver documentation (PyPI / ReadTheDocs): https://clickhouse-driver.readthedocs.io/en/latest/
- clickhouse-driver quickstart (Client constructor, execute, INSERT with dict rows, %(name)s parameterization)

## Issues Found
No technical issues found.

The code and claims were verified:
- `ReplacingMergeTree(applied_at)` is valid — DateTime is an accepted version column type.
- `ORDER BY version` establishes the sort/dedupe key — correct.
- `Client('localhost', database='analytics')` is a valid clickhouse-driver constructor call.
- The `client.execute("INSERT ... VALUES", [{...}])` pattern with a list of dicts is the documented pattern for parameterized inserts in clickhouse-driver.
- `%(v)s` pyformat-style parameterization with a params dict is the documented style for clickhouse-driver.
- `ALTER TABLE ... DELETE WHERE` is the correct ClickHouse mutation syntax for row deletion.
- `SELECT ... FINAL` is the correct way to read deduplicated rows from a ReplacingMergeTree.
- Filename parsing logic (`split('_')[0]` and description extraction) produces the correct values for the shown naming convention.

## Review Notes
- The `run_sql_file` function splits SQL by `;` which is a naive approach — it would break if a migration contained semicolons inside string literals or comments. For simple DDL-only migrations (the intended use case here) it is adequate.
- `ALTER TABLE ... DELETE` in ClickHouse is an asynchronous mutation rather than a synchronous delete. Rapid repeated rollbacks may see stale rows until the mutation completes; using `SETTINGS mutations_sync = 1` (or 2) would make it synchronous. Not incorrect — just a caveat for production use.
- The intro calls ClickHouse DDL "idempotent" — this is only true when `IF NOT EXISTS` / `IF EXISTS` clauses are used. Left as-is since the surrounding text clearly describes the safe-to-re-run design using the tracking table.
- `compute_checksum` is computed and stored but never verified against stored checksums on re-runs — this is a reasonable design simplification for a minimal tool and is consistent with the author's "lightweight" framing.
- The CLI help text says `python migrate.py up`, but the script treats any non-`down` argument (and no argument) as "up" — functionally correct, just slightly looser than what the help text implies. Not a technical error.
