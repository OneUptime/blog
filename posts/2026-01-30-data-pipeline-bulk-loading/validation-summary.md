# Validation Summary: How to Create Bulk Loading

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- PostgreSQL COPY, UNLOGGED tables, INSERT ON CONFLICT
- psycopg2
- MySQL LOAD DATA LOCAL INFILE and MySQL Connector/Python
- SQL Server BULK INSERT
- pg-promise
- Python dataclasses, typing, multiprocessing, ThreadPoolExecutor
- OpenTelemetry Python tracing and metrics
- Data pipeline staging, validation, retry, and observability patterns

## Sources Consulted
- PostgreSQL COPY documentation: https://www.postgresql.org/docs/current/sql-copy.html
- PostgreSQL CREATE TABLE documentation for UNLOGGED tables: https://www.postgresql.org/docs/current/sql-createtable.html
- PostgreSQL INSERT documentation for ON CONFLICT: https://www.postgresql.org/docs/current/sql-insert.html
- psycopg2 cursor COPY methods: https://www.psycopg.org/docs/cursor.html
- psycopg2 SQL composition documentation: https://www.psycopg.org/docs/sql.html
- psycopg2 fast execution helpers: https://www.psycopg.org/docs/extras.html
- MySQL LOAD DATA documentation: https://dev.mysql.com/doc/en/load-data.html
- MySQL Connector/Python connection arguments: https://dev.mysql.com/doc/connector-python/en/connector-python-connectargs.html
- SQL Server BULK INSERT documentation: https://learn.microsoft.com/en-us/sql/t-sql/statements/bulk-insert-transact-sql
- pg-promise helpers and ColumnSet documentation: https://vitaly-t.github.io/pg-promise/helpers.html and https://vitaly-t.github.io/pg-promise/helpers.ColumnSet.html
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- Python typing documentation: https://docs.python.org/3/library/typing.html

## Issues Found
- The PostgreSQL COPY Python example generated tab-delimited CSV data with `csv.writer` but used `cursor.copy_from`, which invokes PostgreSQL text-format COPY semantics. Changed it to use `copy_expert` with `FORMAT CSV`, tab delimiter, and explicit `NULL '\\N'`.
- The PostgreSQL COPY example accepted `batch_id` for tracking but did not use it. Updated row generation so a `load_batch_id` column is populated from `batch_id` when included in the column list.
- The pg-promise example said batching was needed because PostgreSQL has a roughly 32767 parameter limit. `pgp.helpers.insert` formats a multi-row SQL statement, so the more accurate reason is avoiding very large SQL strings and excessive formatting memory. Updated the comment.
- The validation and recovery Python snippets referenced `Callable` and `Tuple` without importing them, which can fail at runtime when annotations are evaluated. Added the missing imports and removed unused imports.
- The full pipeline claimed to use COPY but implemented loading with `execute_values`. Replaced the staging load implementation with `copy_expert` and a tab-delimited CSV stream.
- The full pipeline built SQL with unquoted dynamic identifiers. Updated the PostgreSQL truncate, COPY, and merge statements to use `psycopg2.sql.Identifier` and `SQL` composition.
- The `rows_validated` metric was declared but never incremented. Updated batch result handling so validated rows are counted.

## Review Notes
The examples are appropriate as tutorial code, but a production implementation should still add database-specific error-code handling, stricter identifier allowlisting for externally supplied names, API authentication/rate-limit handling, and integration tests against real PostgreSQL/MySQL/SQL Server instances.
