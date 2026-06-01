# Validation Summary: How to Implement Dynamic Data Masking in Azure SQL Database

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure SQL Database
- SQL Server Dynamic Data Masking
- Transact-SQL
- Azure Portal
- Database permissions

## Sources Consulted
- Microsoft Learn: Dynamic Data Masking - SQL Server: https://learn.microsoft.com/en-us/sql/relational-databases/security/dynamic-data-masking
- Microsoft Learn: Dynamic Data Masking - Azure SQL Database, Azure SQL Managed Instance, and Azure Synapse Analytics: https://learn.microsoft.com/en-us/azure/azure-sql/database/dynamic-data-masking-overview
- Microsoft Learn: Get started with SQL Database dynamic data masking with the Azure portal: https://learn.microsoft.com/en-gb/azure/azure-sql/database/dynamic-data-masking-configure-portal
- Microsoft Learn: ALTER TABLE column_definition (Transact-SQL): https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-table-column-definition-transact-sql
- Microsoft Learn: Always Encrypted - SQL Server: https://learn.microsoft.com/en-us/sql/relational-databases/security/encryption/always-encrypted-database-engine

## Issues Found
- The post said Azure SQL provides four built-in masking types. T-SQL exposes four masking functions, while the Azure portal documentation also includes predefined masking categories such as credit card. Updated the wording to distinguish T-SQL functions from portal categories.
- The default date mask was shown as `01-01-1900 00:00:00`, which is ambiguous. Updated it to the documented `1900-01-01 00:00:00` format.
- The credit card sample used a 16-character column and unformatted values while the partial mask output included separators and expected the first two characters to be exposed. Updated the column to `CHAR(19)`, formatted the sample values, and corrected the expected masked output.
- A permission example comment said it granted UNMASK on a specific table, but the SQL granted it on a schema. Updated the comment to match the SQL.
- The common masking pattern snippets omitted the required `ALTER TABLE` statement before `ALTER COLUMN`. Updated each snippet to be valid T-SQL.
- The IP address example claimed to show the first octet, but `partial(3, ...)` exposes the first three characters, which is not always the first octet. Updated the description.
- The post said masked columns participate in full-text search. Microsoft documentation says a column with data masking cannot be a key for a full-text index. Updated the limitation.

## Review Notes
Dynamic Data Masking is correctly described as a query-result masking feature rather than encryption or a strong security boundary. The post's recommendation to combine it with stronger controls such as Always Encrypted, row-level security, and column-level permissions is consistent with Microsoft guidance.
