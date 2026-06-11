# Validation Summary: How to Create Conformed Dimensions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Data warehouse dimensional modeling
- Conformed dimensions
- Slowly changing dimensions Type 2
- Master data management integration
- PostgreSQL SQL and PL/pgSQL
- Mermaid architecture diagrams

## Sources Consulted
- PostgreSQL documentation: Lexical Structure / Operator Precedence - https://www.postgresql.org/docs/current/sql-syntax-lexical.html
- PostgreSQL documentation: Comparison Functions and Operators - https://www.postgresql.org/docs/current/functions-comparison.html
- PostgreSQL documentation: Date/Time Formatting Functions - https://www.postgresql.org/docs/current/functions-formatting.html
- PostgreSQL documentation: PL/pgSQL Transaction Management - https://www.postgresql.org/docs/current/plpgsql-transactions.html
- PostgreSQL documentation: Set Returning Functions / generate_series - https://www.postgresql.org/docs/current/functions-srf.html
- PostgreSQL documentation: Partial Indexes - https://www.postgresql.org/docs/current/indexes-partial.html
- Kimball Group: Conformed Dimensions - https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/conformed-dimension/
- Kimball Group: Dimensional Modeling Techniques - https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/

## Issues Found
- The metadata audit query mixed `AND` and `OR` without parentheses, so `column_name LIKE '%_id'` could match columns outside the intended schema and fact-table filter. Added parentheses around the key/id column-name predicates.
- The opening definition implied conformed dimensions must always have the same physical structure and identical surrogate keys everywhere. Adjusted the wording to align with Kimball's definition, including conformed attributes and consistent domain values, while preserving the article's shared-dimension framing.
- The SCD Type 2 merge used `!=` to compare nullable attributes. In PostgreSQL, comparisons involving `NULL` evaluate to unknown, so changes from or to `NULL` would be missed. Replaced those comparisons with `IS DISTINCT FROM`.
- The SCD Type 2 merge assigned `v_load_date - INTERVAL '1 day'` to a `DATE` column. Changed it to `v_load_date - 1`, which keeps the expression as a date.
- The customer key conformance validation returned aggregate rows even when orphan counts were zero, causing the validation framework to count successful checks as issues. Changed the query to return only actual orphan key rows.
- The product attribute consistency rule grouped by both `product_key` and `category_code`, making `COUNT(DISTINCT category_code) > 1` impossible for each group. Changed the grouping to `product_id` so it can detect conflicting current category mappings for the same product.

## Review Notes
The PostgreSQL examples are illustrative and assume supporting staging, fact, audit, and notification tables exist. `COMMIT` inside a PostgreSQL procedure is valid when the procedure is invoked in a context that allows transaction control, but callers should avoid wrapping that `CALL` in an explicit transaction block unless they remove the internal transaction control.
