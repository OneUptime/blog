# Validation Summary: How to Use PostgreSQL Query Hints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- pg_hint_plan
- SQL query planning and EXPLAIN
- PostgreSQL CTE materialization
- PostgreSQL planner statistics
- pg_stat_statements

## Sources Consulted
- pg_hint_plan official README: https://github.com/ossc-db/pg_hint_plan
- pg_hint_plan installation documentation: https://pg-hint-plan.readthedocs.io/en/latest/installation.html
- pg_hint_plan hint table documentation: https://pg-hint-plan.readthedocs.io/en/latest/hint_table.html
- pg_hint_plan hint list documentation: https://github.com/ossc-db/pg_hint_plan/blob/master/docs/hint_list.md
- PostgreSQL CTE materialization documentation: https://www.postgresql.org/docs/current/queries-with.html
- PostgreSQL EXPLAIN documentation: https://www.postgresql.org/docs/current/sql-explain.html
- PostgreSQL pg_stat_statements documentation: https://www.postgresql.org/docs/current/pgstatstatements.html
- PostgreSQL planner statistics documentation: https://www.postgresql.org/docs/current/planner-stats.html
- PostgreSQL CREATE STATISTICS documentation: https://www.postgresql.org/docs/current/sql-createstatistics.html

## Issues Found
- The prerequisites claimed PostgreSQL 10+ support. Changed this to require a PostgreSQL version supported by the installed pg_hint_plan release, because pg_hint_plan releases are tied to PostgreSQL major versions.
- The package manager section included unverified RHEL/CentOS and Homebrew commands. Removed those commands and kept the documented Debian/Ubuntu package naming pattern.
- Several join and join-order hints used base table names even though the SQL queries assigned aliases. Updated the hints to use aliases, matching pg_hint_plan's documented alias resolution behavior.
- The Row Count Hints section used `Rows` for single-table row estimates. Updated examples to apply `Rows` to join results, as documented by pg_hint_plan.
- The hint table examples used the obsolete/incorrect `norm_query_string` column and query normalization workflow. Updated them to use `query_id`, `EXPLAIN (VERBOSE)`, and `pg_stat_statements.queryid`.
- The CTE materialization example used unsupported pg_hint_plan-style `Materialize` and `NoMaterialize` comments. Replaced them with PostgreSQL's supported `AS MATERIALIZED` and `AS NOT MATERIALIZED` syntax.
- The subquery example attempted to hint a subquery directly. Reworked it as a regular join example using aliases, because pg_hint_plan documentation says joins on subqueries are not affected.
- The documentation example placed SQL comments inside the pg_hint_plan hint block. Moved explanatory comments outside the hint block so the hint syntax remains valid.

## Review Notes
The post is now technically aligned with current pg_hint_plan and PostgreSQL documentation. Some package names and release tags remain version-specific examples; readers should still choose the pg_hint_plan package or tag matching their PostgreSQL major version.
