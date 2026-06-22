# Validation Summary: How to Handle Database Indexing Strategy

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL
- MySQL
- SQL indexing
- Query planning and EXPLAIN
- pg_stat_statements
- Python with psycopg2

## Sources Consulted
- PostgreSQL CREATE INDEX documentation: https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL partial indexes documentation: https://www.postgresql.org/docs/current/indexes-partial.html
- PostgreSQL pg_stat_statements documentation: https://www.postgresql.org/docs/current/pgstatstatements.html
- PostgreSQL REINDEX documentation: https://www.postgresql.org/docs/current/sql-reindex.html
- MySQL InnoDB online DDL operations documentation: https://dev.mysql.com/doc/refman/8.4/en/innodb-online-ddl-operations.html

## Issues Found
- The partial index example used `CURRENT_DATE - INTERVAL '90 days'` in the predicate. PostgreSQL requires functions and operators used in index definitions and predicates to be immutable, so a moving current-date predicate is not valid. Changed the example to use a fixed cutoff date.
- The sequential-scan query was described as finding missing indexes. High sequential scan counts can indicate a candidate for review, but sequential scans are sometimes optimal. Updated the wording to require confirmation with `EXPLAIN`.
- The covering index description implied table lookups would always be avoided. PostgreSQL `INCLUDE` columns enable index-only scans, but visibility and the rest of the plan still matter. Updated the wording to be conditional.
- The duplicate-index query only compared key columns and did not account for predicates, operator classes, or included columns. Updated the wording to present it as a review query instead of definitive duplicate detection.
- The index maintenance query was labeled as a bloat check, but it only reports index size relative to table size. Updated it to describe finding large indexes for deeper bloat analysis, and clarified that rebuilds should follow confirmation with a dedicated bloat query or extension.

## Review Notes
The examples are intentionally illustrative and schema-dependent, so exact execution plans and timing improvements will vary by data distribution, PostgreSQL version, statistics, and workload. The simplified Python analyzer catches failed `EXPLAIN` attempts; production tooling should parse SQL and PostgreSQL JSON plans more rigorously.
