# Validation Summary: How to Create Incremental Extraction

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- PostgreSQL
- psycopg2
- SQL upserts
- Incremental ETL / data pipelines
- Change Data Capture concepts
- Watermark-based extraction
- Pipeline monitoring

## Sources Consulted
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html
- Python `typing` documentation: https://docs.python.org/3/library/typing.html
- Python `json` documentation: https://docs.python.org/3/library/json.html
- Psycopg 2.9 SQL composition documentation: https://www.psycopg.org/docs/sql.html
- PostgreSQL `INSERT` / `ON CONFLICT` documentation: https://www.postgresql.org/docs/current/sql-insert.html
- PostgreSQL `CREATE INDEX` documentation: https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL partial indexes documentation: https://www.postgresql.org/docs/current/indexes-partial.html
- PostgreSQL default values documentation: https://www.postgresql.org/docs/current/ddl-default.html
- PEP 249, Python Database API Specification v2.0: https://peps.python.org/pep-0249/
- OneUptime linked post, OpenTelemetry Collector: https://oneuptime.com/blog/post/2025-09-18-what-is-opentelemetry-collector-and-why-use-one/view
- OneUptime linked post, structured logs in OpenTelemetry: https://oneuptime.com/blog/post/2025-08-28-how-to-structure-logs-properly-in-opentelemetry/view

## Issues Found
- The post described "exactly-once semantics" as a core guarantee. The provided pattern is more accurately at-least-once processing with idempotent loading, because a failure after loading but before watermark persistence can cause retry processing. Updated the terminology and the pipeline comment.
- Several Python SQL examples used parameterized values but interpolated dynamic table and column identifiers with f-strings. Psycopg documentation states identifiers cannot be passed as ordinary query parameters and should be composed safely. Updated the extractor, loader, soft-delete extractor, and hard-delete detector examples to use `psycopg2.sql.Identifier`, `SQL`, and `Placeholder`.
- The loader example generated an invalid `ON CONFLICT ... DO UPDATE SET` clause if the record contained only the primary key. Updated the example to use `DO NOTHING` when there are no non-primary-key columns to update.
- The Python examples used `datetime.utcnow()`, which is deprecated since Python 3.12. Updated the examples to use timezone-aware `datetime.now(timezone.utc)` and normalize naive watermarks in the monitoring example.

## Review Notes
The Python code blocks were syntax-checked after edits. The examples remain PostgreSQL-oriented because they use PostgreSQL `ON CONFLICT` upsert syntax and psycopg2 SQL composition helpers.
