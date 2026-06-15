# Validation Summary: How to Build Custom Aggregate Functions in PostgreSQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- PostgreSQL
- SQL
- PL/pgSQL
- User-defined aggregate functions
- Parallel and moving aggregate support

## Sources Consulted
- PostgreSQL 18 documentation: CREATE AGGREGATE - https://www.postgresql.org/docs/current/sql-createaggregate.html
- PostgreSQL 18 documentation: User-Defined Aggregates - https://www.postgresql.org/docs/current/xaggr.html
- PostgreSQL 18 documentation: CREATE FUNCTION - https://www.postgresql.org/docs/current/sql-createfunction.html
- PostgreSQL 18 documentation: When Can Parallel Query Be Used? - https://www.postgresql.org/docs/current/when-can-parallel-query-be-used.html

## Issues Found
- The moving aggregate example omitted `MFINALFUNC = weighted_avg_ffunc`. Because the moving state type is `weighted_avg_state` while the regular aggregate result type is `NUMERIC`, PostgreSQL rejects the aggregate definition unless the moving final function also returns `NUMERIC`. Added `MFINALFUNC = weighted_avg_ffunc`.
- The combine function comment said `COMBINEFUNC` enables parallel execution. PostgreSQL documents `COMBINEFUNC` as supporting partial aggregation, while parallel aggregation also requires the aggregate to be marked `PARALLEL SAFE`. Updated the comment to say it supports partial aggregation.

## Review Notes
The examples were statically checked against the PostgreSQL documentation and the aggregate definitions were executed in a temporary PostgreSQL 18 container. No local `psql` client was installed in the workspace environment.
