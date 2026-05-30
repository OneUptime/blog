# Validation Summary: How to Analyze Query Plans in Cloud SQL PostgreSQL Using EXPLAIN ANALYZE

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud SQL for PostgreSQL
- PostgreSQL EXPLAIN and EXPLAIN ANALYZE
- PostgreSQL query plans and plan nodes
- PostgreSQL indexes and statistics
- pg_stat_statements

## Sources Consulted
- PostgreSQL official documentation: Using EXPLAIN - https://www.postgresql.org/docs/current/using-explain.html
- PostgreSQL official documentation: EXPLAIN command - https://www.postgresql.org/docs/current/sql-explain.html
- PostgreSQL official documentation: pg_stat_statements - https://www.postgresql.org/docs/17/pgstatstatements.html
- Google Cloud official documentation: Cloud SQL for PostgreSQL database flags - https://docs.cloud.google.com/sql/docs/postgres/flags
- Google Cloud official documentation: Cloud SQL for PostgreSQL extensions - https://docs.cloud.google.com/sql/docs/postgres/extensions
- Google Cloud official documentation: Cloud SQL for PostgreSQL memory usage best practices - https://docs.cloud.google.com/sql/docs/postgres/manage-memory-usage-best-practices

## Issues Found
- Clarified that EXPLAIN ANALYZE executes SELECT statements too, so ordinary read-only SELECT queries are safe, but SELECT statements that call functions with side effects still need care.
- Added MERGE and other data-changing statements to the transaction/rollback warning because EXPLAIN ANALYZE executes data-changing statements.
- Corrected the explanation of actual time to note that node timing is per execution when loops is greater than 1.
- Corrected BUFFERS wording so read blocks are described as blocks read into PostgreSQL shared buffers, not simply physical disk reads.
- Refined high read-to-hit guidance to avoid over-attributing the cause to shared_buffers size.
- Clarified Index Only Scan behavior: avoiding heap access depends on visibility information, and Heap Fetches: 0 means no heap visits were needed for that run.
- Added that pg_stat_statements must be enabled in the database before querying its view.

## Review Notes
The SQL examples are syntactically valid PostgreSQL. The pg_stat_statements column names total_exec_time and mean_exec_time are current for supported modern PostgreSQL versions, but older PostgreSQL releases used different timing column names.
