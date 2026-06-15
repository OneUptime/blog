# Validation Summary: How to Force Index Usage in PostgreSQL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL query planner
- PostgreSQL indexes
- PostgreSQL EXPLAIN and EXPLAIN ANALYZE
- PostgreSQL planner statistics and ANALYZE
- PostgreSQL planner cost settings
- pg_hint_plan extension

## Sources Consulted
- PostgreSQL documentation: Query Planning - https://www.postgresql.org/docs/current/runtime-config-query.html
- PostgreSQL documentation: EXPLAIN - https://www.postgresql.org/docs/current/sql-explain.html
- PostgreSQL documentation: ANALYZE - https://www.postgresql.org/docs/current/sql-analyze.html
- PostgreSQL documentation: Statistics Used by the Planner - https://www.postgresql.org/docs/current/planner-stats.html
- PostgreSQL documentation: CREATE INDEX - https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL documentation: Indexes on Expressions - https://www.postgresql.org/docs/current/indexes-expressional.html
- PostgreSQL documentation: Partial Indexes - https://www.postgresql.org/docs/current/indexes-partial.html
- PostgreSQL documentation: Index-Only Scans and Covering Indexes - https://www.postgresql.org/docs/current/indexes-index-only-scans.html
- PostgreSQL documentation: SELECT / WITH MATERIALIZED - https://www.postgresql.org/docs/current/sql-select.html
- pg_hint_plan documentation: Installation - https://pg-hint-plan.readthedocs.io/en/latest/installation.html
- pg_hint_plan documentation: Hint list - https://pg-hint-plan.readthedocs.io/en/latest/hint_list.html

## Issues Found
- The EXPLAIN guidance described `actual time=` as actual rows. Changed it to compare estimated `rows=` with `actual rows=` from `EXPLAIN ANALYZE`.
- The planner method settings were described as disabling sequential and bitmap scans. PostgreSQL documents these settings as planner method controls and notes they are a crude way to influence plans, so the comments were changed to "discourage" scan types.
- The implicit type cast example used `customer_id = '42'`, which PostgreSQL normally treats as an integer-compatible literal in this context. Changed the example to the more accurate anti-pattern `customer_id::text = '42'` and fixed the recommended version to cast the parameter instead.
- The pg_hint_plan setup example used `CREATE EXTENSION pg_hint_plan` as the way to enable hint comments. Current pg_hint_plan documentation says the module can be activated with `LOAD 'pg_hint_plan'`, while `CREATE EXTENSION` is for the hint table workflow. Updated the snippet accordingly.
- The "When NOT to Force Index Usage" list called a query returning 50% of rows "high selectivity." Changed this to "low selectivity," which is the correct database terminology.
- The correlated-columns note implied the planner may automatically know cross-column correlations. Adjusted it to say column correlation and physical ordering can affect which plan is cheaper.

## Review Notes
The post is technically relevant and the main recommendations are accurate after the targeted fixes. Some examples remain illustrative and depend on table size, data distribution, visibility map state, and existing indexes, so actual plans should still be verified with `EXPLAIN ANALYZE` in the target database.
