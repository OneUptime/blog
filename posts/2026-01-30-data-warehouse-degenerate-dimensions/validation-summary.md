# Validation Summary: How to Implement Degenerate Dimensions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Data warehouse dimensional modeling
- Degenerate dimensions
- SQL Server / Transact-SQL
- Mermaid ER diagrams
- SQL indexing, partitioning, compression, and ETL patterns

## Sources Consulted
- Kimball Group, "Degenerate Dimensions": https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/degenerate-dimension/
- Microsoft Learn, "rowversion (Transact-SQL)": https://learn.microsoft.com/en-us/sql/t-sql/data-types/rowversion-transact-sql
- Microsoft Learn, "Date and time data types and functions (Transact-SQL)": https://learn.microsoft.com/en-us/sql/t-sql/functions/date-and-time-data-types-and-functions-transact-sql
- Microsoft Learn, "TRY...CATCH (Transact-SQL)": https://learn.microsoft.com/en-us/sql/t-sql/language-elements/try-catch-transact-sql
- Microsoft Learn, "THROW (Transact-SQL)": https://learn.microsoft.com/en-us/sql/t-sql/language-elements/throw-transact-sql
- Microsoft Learn, "CREATE INDEX (Transact-SQL)": https://learn.microsoft.com/en-us/sql/t-sql/statements/create-index-transact-sql
- Microsoft Learn, "Create Filtered Indexes": https://learn.microsoft.com/en-us/sql/relational-databases/indexes/create-filtered-indexes
- Microsoft Learn, "CREATE PARTITION FUNCTION (Transact-SQL)": https://learn.microsoft.com/en-us/sql/t-sql/statements/create-partition-function-transact-sql
- Microsoft Learn, "CREATE PARTITION SCHEME (Transact-SQL)": https://learn.microsoft.com/en-us/sql/t-sql/statements/create-partition-scheme-transact-sql
- Microsoft Learn, "Data compression": https://learn.microsoft.com/en-us/sql/relational-databases/data-compression/data-compression
- Mermaid ER diagram syntax reference: https://mermaid.ai/open-source/syntax/entityRelationshipDiagram.html

## Issues Found
- The introduction described degenerate dimensions as storing dimension attributes in fact tables. Changed this to dimension identifiers, matching Kimball's definition that the key remains in the fact table without a separate dimension table.
- The Mermaid ER diagram had the one-to-many relationship direction reversed between dimensions and the fact table. Updated it so each dimension can relate to many fact rows.
- SQL Server `TIMESTAMP` was used for audit date/time columns. Replaced it with `DATETIME2(0) DEFAULT SYSUTCDATETIME()` because SQL Server `timestamp` is `rowversion`, not a date/time type.
- The SCD Type 2 lookup comments and joins selected the current dimension row instead of the row effective at the sale date. Updated the product and customer joins to use effective-date ranges.
- Duplicate detection matched only on `order_number`, which is not sufficient for a line-item fact table. Updated the checks and `MERGE` predicate to match `order_number` plus `product_key`.
- The cross-fact query could multiply sales totals when shipments or payments had multiple rows for the same order. Pre-aggregated sales in a CTE before joining to related fact tables.
- The filtered index example used a subquery in the filter predicate. Replaced it with a fixed cutoff value because SQL Server filtered indexes require simple filter predicates.
- The partitioning example mixed PostgreSQL partition syntax with SQL Server table syntax. Rewrote it using SQL Server partition functions, partition schemes, and aligned/nonaligned indexes.
- The compression example mixed an unsupported dictionary-encoding alteration with SQL Server compression syntax. Replaced it with SQL Server page compression.
- The first validation query grouped existing fact rows and used `HAVING COUNT(*) = 0`, which can never return a group. Replaced it with a check for null or blank degenerate dimension values.

## Review Notes
The article is now technically valid as a SQL Server-oriented guide. Some snippets still assume supporting dimension/staging schemas that are not fully defined in the post, which is acceptable for an illustrative blog post but could be expanded in a future revision.
