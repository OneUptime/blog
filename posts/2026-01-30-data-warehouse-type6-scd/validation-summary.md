# Validation Summary: How to Create Type 6 SCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Data warehousing
- Slowly Changing Dimensions (SCD Type 1, Type 2, Type 3, Type 6)
- SQL Server Transact-SQL
- SQL Server indexing and partitioning
- ETL stored procedure patterns

## Sources Consulted
- Kimball Group, Type 6: Add Type 1 Attributes to Type 2 Dimension: https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/type-6/
- Microsoft Learn, CREATE PARTITION SCHEME (Transact-SQL): https://learn.microsoft.com/en-us/sql/t-sql/statements/create-partition-scheme-transact-sql
- Microsoft Learn, Create partitioned tables and indexes: https://learn.microsoft.com/en-us/sql/relational-databases/partitions/create-partitioned-tables-and-indexes
- Microsoft Learn, DATEADD (Transact-SQL): https://learn.microsoft.com/en-us/sql/t-sql/functions/dateadd-transact-sql
- Microsoft Learn, DATEDIFF (Transact-SQL): https://learn.microsoft.com/en-us/sql/t-sql/functions/datediff-transact-sql
- Microsoft Learn, Set Operators - EXCEPT and INTERSECT (Transact-SQL): https://learn.microsoft.com/en-us/sql/t-sql/language-elements/set-operators-except-and-intersect-transact-sql
- Microsoft Learn, != (Not Equal To) (Transact-SQL): https://learn.microsoft.com/en-us/sql/t-sql/language-elements/not-equal-to-transact-sql-exclamation

## Issues Found
- The stored procedure used `!=` to detect changes in `city`, even though `city` is nullable in the table schema. In SQL Server, `!=` returns `NULL` when either operand is `NULL`, so a change from or to `NULL` could be missed. Changed the condition to a NULL-safe `EXCEPT` comparison, which treats two `NULL` values as equal for set comparison.
- The partitioning section created a partition function and partition scheme but left a comment that could be read as applying partitioning to the table. Microsoft documents partitioning as requiring the table or index to be created or altered/rebuilt on the partition scheme. Updated the comment to make that requirement explicit.

## Review Notes
The Type 6 SCD explanation matches the Kimball Group description: Type 6 builds on Type 2 history while embedding current Type 1 attribute versions in dimension rows. The SQL examples are written for SQL Server/T-SQL, including `IDENTITY`, `BIT`, filtered indexes, `GETDATE()`, `DATEADD`, and `DATEDIFF`. The example data assumes the procedure is executed on the dates shown in the result table.
