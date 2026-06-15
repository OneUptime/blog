# Validation Summary: How to Create Crosstab (Pivot Table) Queries in PostgreSQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- PostgreSQL
- SQL
- tablefunc extension
- crosstab pivot queries
- PL/pgSQL dynamic SQL
- Aggregate FILTER clause
- Materialized views

## Sources Consulted
- PostgreSQL 18 documentation: tablefunc/crosstab functions, including one-parameter and two-parameter crosstab behavior: https://www.postgresql.org/docs/current/tablefunc.html
- PostgreSQL 18 documentation: CREATE EXTENSION privileges and trusted extensions: https://www.postgresql.org/docs/current/sql-createextension.html
- PostgreSQL 18 documentation: aggregate FILTER clause: https://www.postgresql.org/docs/current/tutorial-agg.html
- PostgreSQL 18 documentation: PL/pgSQL EXECUTE and format() for dynamic SQL identifiers: https://www.postgresql.org/docs/current/plpgsql-statements.html
- PostgreSQL 18 documentation: string format() `%I` identifier quoting: https://www.postgresql.org/docs/current/functions-string.html
- PostgreSQL 18 documentation: CREATE MATERIALIZED VIEW: https://www.postgresql.org/docs/current/sql-creatematerializedview.html
- PostgreSQL 18 documentation: REFRESH MATERIALIZED VIEW: https://www.postgresql.org/docs/current/sql-refreshmaterializedview.html

## Issues Found
- The basic single-parameter crosstab ordered months alphabetically while labeling output columns January through April. Because this crosstab form fills value columns left to right and ignores the category except for ordering, the original query would place April revenue under the January column. Changed the source query to order months explicitly with a CASE expression.
- The missing-values example used alphabetical category ordering and output columns in that same unintuitive order. Changed the category SQL to define January through April explicitly, matching the output columns.
- The text said the crosstab input query must return exactly three columns without qualifying that this applies to the single-parameter form. Updated the wording because the two-parameter form can include extra columns between row_name and category.
- The dynamic pivot function generated output column names without data types, producing an invalid `AS ct (...)` column definition. Changed the dynamic column list to include `TEXT` types and cast source values to TEXT so the generated crosstab query is executable.
- The multiple-value-column example referenced a `sales_with_quantity` table that was never created and used columns that did not match the earlier sample schema. Updated it to use the existing `sales_transactions` table and calculate revenue from `quantity * unit_price`.
- The materialized view example queried `sale_month` and `revenue` from `sales_transactions`, but that table defines `sale_date`, `quantity`, and `unit_price`. Updated the materialized view to derive the month from `sale_date` and aggregate `quantity * unit_price`.

## Review Notes
Smoke-tested the corrected SQL examples against a disposable PostgreSQL 18 container with the `tablefunc` extension enabled. No remaining technical issues found.
