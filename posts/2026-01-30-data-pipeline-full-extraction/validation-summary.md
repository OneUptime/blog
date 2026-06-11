# Validation Summary: How to Implement Full Extraction

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Python
- PostgreSQL
- psycopg2
- SQL COPY
- ETL/data pipeline full extraction patterns
- Data validation, monitoring, retry, and checkpointing concepts

## Sources Consulted
- Psycopg 2.9.12 documentation: Basic module usage and server-side cursors - https://www.psycopg.org/docs/usage.html
- Psycopg 2.9.12 documentation: Cursor COPY methods - https://www.psycopg.org/docs/cursor.html
- Psycopg 2.9.12 documentation: SQL string composition - https://www.psycopg.org/docs/sql.html
- PostgreSQL 18 documentation: COPY - https://www.postgresql.org/docs/current/sql-copy.html
- PostgreSQL 18 documentation: Transaction isolation - https://www.postgresql.org/docs/current/transaction-iso.html
- PostgreSQL 18 documentation: ALTER TABLE - https://www.postgresql.org/docs/current/sql-altertable.html
- PostgreSQL 18 documentation: CREATE TABLE - https://www.postgresql.org/docs/current/sql-createtable.html
- PostgreSQL 18 documentation: Window functions - https://www.postgresql.org/docs/current/functions-window.html

## Issues Found
- The basic psycopg2 example set `autocommit=True` before creating a named server-side cursor. psycopg2 documents that named cursors created without `WITH HOLD` cannot be created in autocommit mode, so the example would fail. Changed the source connection setup to keep autocommit disabled and set the transaction read-only.
- The basic table swap example embedded `BEGIN` and `COMMIT` inside a multi-statement `cursor.execute()` while psycopg2 already manages the transaction. Removed the embedded transaction commands and committed through the connection.
- The streaming COPY example claimed data was streamed without being held in memory but wrote the full result to `io.BytesIO`. Replaced it with `tempfile.SpooledTemporaryFile` and updated the wording to describe spooling accurately.
- The parallel partition boundary query grouped by both bucket and key, which made `HAVING key = MAX(key)` true per grouped key and could return every row instead of one boundary per bucket. Changed it to `MAX(key)` grouped by bucket and clarified that the example expects an integer key.
- Removed an unused `ThreadPoolExecutor` import and corrected the process pool comment so it does not imply process pools are universally better for I/O-bound extraction.
- The full vs incremental comparison overstated consistency as a guaranteed point-in-time snapshot. Revised it to say full extraction is simple to make consistent with snapshot isolation.
- The COPY optimization explanation said the CSV example uses a binary protocol. Changed the wording to say binary COPY can be used when configured.
- The unlogged staging table example used `INCLUDING DEFAULTS`, which would not preserve all target table attributes before a table swap. Changed it to `INCLUDING ALL`.
- The production example claimed retry and checkpoint support that was not implemented in that code block. Revised the feature list to match the actual implementation.
- The production table swap example called `BEGIN`, `COMMIT`, and `ROLLBACK` manually through SQL strings. Changed it to use `conn.commit()` and `conn.rollback()`.
- The production example and summary described table swaps as zero-downtime. PostgreSQL `ALTER TABLE` generally takes metadata locks, so the wording now says atomic or low-downtime with brief metadata locks.
- The snapshot example comment said it used serializable isolation but the code used repeatable read. Updated the comment to accurately describe PostgreSQL repeatable-read MVCC snapshots.
- The snapshot timestamp comment incorrectly referenced `pg_stat_statements` for time-travel querying. Changed it to refer to temporal tables, audit history, or a time-travel extension.

## Review Notes
- The post remains a high-level tutorial with illustrative code. Several examples still use f-string SQL for table and column identifiers for readability; production code should prefer `psycopg2.sql.Identifier` or a validated allowlist for dynamic identifiers.
- The Python code blocks were parsed with `ast.parse`; all 10 Python snippets are syntactically valid after the corrections.
