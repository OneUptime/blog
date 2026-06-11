# Validation Summary: How to Build Fact Table Design

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Dimensional modeling
- Data warehouse fact table design
- Star and snowflake schemas
- PostgreSQL SQL and PL/pgSQL
- Mermaid ER and flow diagrams

## Sources Consulted
- PostgreSQL documentation: Identity Columns - https://www.postgresql.org/docs/current/ddl-identity-columns.html
- PostgreSQL documentation: Generated Columns - https://www.postgresql.org/docs/current/ddl-generated-columns.html
- PostgreSQL documentation: Aggregate Expressions and FILTER clause - https://www.postgresql.org/docs/current/sql-expressions.html
- PostgreSQL documentation: Aggregate Functions - https://www.postgresql.org/docs/current/functions-aggregate.html
- PostgreSQL documentation: CREATE PROCEDURE - https://www.postgresql.org/docs/current/sql-createprocedure.html
- PostgreSQL documentation: PL/pgSQL Transaction Management - https://www.postgresql.org/docs/current/plpgsql-transactions.html
- PostgreSQL documentation: Date/Time Functions and Operators - https://www.postgresql.org/docs/current/functions-datetime.html
- PostgreSQL documentation: PL/pgSQL Control Structures - https://www.postgresql.org/docs/current/plpgsql-control-structures.html
- PostgreSQL documentation: Constraints and foreign keys - https://www.postgresql.org/docs/current/ddl-constraints.html
- Kimball Group: Dimensional Modeling Techniques - https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/
- Kimball Group: Additive, Semi-Additive, and Non-Additive Facts - https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/additive-semi-additive-non-additive-fact/
- Kimball Group: Periodic Snapshot Fact Tables - https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/periodic-snapshot-fact-table/
- Kimball Group: Degenerate Dimensions - https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/degenerate-dimension/
- Kimball Group: Multivalued Dimensions and Bridge Tables - https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/multivalued-dimension-bridge-table/
- Kimball Group: Factless Fact Tables - https://www.kimballgroup.com/2011/04/design-tip-133-factless-fact-tables-for-simplification/

## Issues Found
- The transaction fact table comment said all measures were additive, but the example included `unit_price`, which is non-additive. Updated the comment to distinguish additive amounts and quantities from non-additive unit price.
- The margin percentage query used `f.cost_amount`, but the earlier `fact_sales_transaction` table did not define that measure. Added `cost_amount` to the table definition so the query matches the schema shown in the post.
- The inventory snapshot procedure used `v_date_key - 30` to find the previous 30 days. Date surrogate keys are not guaranteed to be arithmetic day counts, so the query now joins `dim_date` and filters on `full_date`.
- The accumulating snapshot procedure calculated lag durations by subtracting integer date keys. Replaced those calculations with date subtraction against `dim_date.full_date`, which matches PostgreSQL date arithmetic and avoids relying on surrogate-key encoding.
- The daily sales snapshot procedure calculated MTD and YTD windows with date-key ranges. Updated those window filters to join `dim_date` and compare real dates.

## Review Notes
The post is technically relevant and the dimensional modeling concepts align with Kimball-style fact table guidance. The SQL examples use PostgreSQL-specific features such as identity columns, stored generated columns, aggregate `FILTER`, `CREATE PROCEDURE`, PL/pgSQL `CASE`, and transaction control in procedures; these are current PostgreSQL features. No live PostgreSQL server was available in the workspace, so SQL validation was performed as a static review against official PostgreSQL documentation.
