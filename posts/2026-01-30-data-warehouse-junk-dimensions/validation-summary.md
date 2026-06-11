# Validation Summary: How to Build Junk Dimensions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dimensional modeling
- Data warehousing
- Junk dimensions
- ETL patterns
- SQL Server / Transact-SQL
- Mermaid diagrams

## Sources Consulted
- Kimball Group, Junk Dimension: https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/junk-dimension/
- Kimball Group, Design Tip #113 Creating, Using, and Maintaining Junk Dimensions: https://www.kimballgroup.com/2009/06/design-tip-113-creating-using-and-maintaining-junk-dimensions/
- Microsoft Learn, CREATE PROCEDURE (Transact-SQL): https://learn.microsoft.com/en-us/sql/t-sql/statements/create-procedure-transact-sql
- Microsoft Learn, CREATE TABLE (Transact-SQL): https://learn.microsoft.com/en-us/sql/t-sql/statements/create-table-transact-sql
- Microsoft Learn, Tables - temporary tables: https://learn.microsoft.com/en-us/sql/relational-databases/tables/tables
- Microsoft Learn, ALTER TABLE (Transact-SQL): https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-table-transact-sql
- Microsoft Learn, Create check constraints: https://learn.microsoft.com/en-us/sql/relational-databases/tables/create-check-constraints
- Microsoft Learn, CREATE INDEX (Transact-SQL): https://learn.microsoft.com/en-us/sql/t-sql/statements/create-index-transact-sql
- Microsoft Learn, Create indexes with included columns: https://learn.microsoft.com/en-us/sql/relational-databases/indexes/create-indexes-with-included-columns
- Microsoft Learn, HASHBYTES (Transact-SQL): https://learn.microsoft.com/en-us/sql/t-sql/functions/hashbytes-transact-sql
- Microsoft Learn, Indexes on computed columns: https://learn.microsoft.com/en-us/sql/relational-databases/indexes/indexes-on-computed-columns
- PostgreSQL Documentation, CREATE INDEX: https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL Documentation, Index Types: https://www.postgresql.org/docs/current/indexes-types.html
- PostgreSQL Documentation, Indexes on Expressions: https://www.postgresql.org/docs/current/indexes-expressional.html

## Issues Found
- The SQL examples mixed dialects: stored procedures, variables, `GETDATE()`, `HASHBYTES`, `PERSISTED`, and `INCLUDE` were SQL Server syntax, while the helper tables used `CREATE TEMPORARY TABLE` and the hash-index example used PostgreSQL syntax. Changed the helper tables to SQL Server local temporary tables (`#gift_values`, etc.) and replaced the PostgreSQL hash-index snippet with a SQL Server-oriented note that points to the persisted computed hash column example.
- The check constraints allowed only `Y` and `N`, but the later unknown/default row inserted `U` into the same flag columns. Updated the check constraints to allow `U`.
- The `usp_load_fact_orders` procedure referenced `@last_load_date` without declaring it. Added `@last_load_date DATETIME` as a procedure parameter.
- The hash lookup used only the hash value. Updated the lookup to also compare the underlying attribute columns so correctness does not depend solely on a hash comparison.
- The post described Cartesian-product generation as "the most common approach" and described hash keys as automatically faster. Adjusted the wording to "one common approach" and "shorter lookups" to match dimensional-modeling guidance and avoid unmeasured performance claims.

## Review Notes
The remaining examples are illustrative T-SQL patterns rather than complete production DDL. In a production SQL Server implementation, key generation with `MAX(order_junk_key) + 1` should be replaced or protected for concurrent ETL loads, for example with a sequence, identity strategy, or explicit transaction/locking design.
