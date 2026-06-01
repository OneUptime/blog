# Validation Summary: How to Enable CLR Integration in Azure SQL Managed Instance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure SQL Managed Instance
- SQL Server CLR integration
- Transact-SQL
- C#
- .NET Framework
- SQL Server assemblies and CLR routines

## Sources Consulted
- Microsoft Learn: Enable CLR integration - https://learn.microsoft.com/en-us/sql/relational-databases/clr-integration/clr-integration-enabling
- Microsoft Learn: CREATE ASSEMBLY (Transact-SQL) - https://learn.microsoft.com/en-us/sql/t-sql/statements/create-assembly-transact-sql
- Microsoft Learn: T-SQL differences between SQL Server and Azure SQL Managed Instance - https://learn.microsoft.com/en-us/azure/azure-sql/managed-instance/transact-sql-tsql-differences-sql-server
- Microsoft Learn: SQL Server to Azure SQL Managed Instance assessment rules - https://learn.microsoft.com/en-us/data-migration/sql-server/managed-instance/assessment-rules
- Microsoft Learn: CLR scalar-valued functions - https://learn.microsoft.com/en-us/sql/relational-databases/clr-integration-database-objects-user-defined-functions/clr-scalar-valued-functions
- Microsoft Learn: Performance of CLR integration architecture - https://learn.microsoft.com/en-us/sql/relational-databases/clr-integration/clr-integration-architecture-performance
- Microsoft Learn: SqlFunctionAttribute.IsDeterministic property - https://learn.microsoft.com/en-us/dotnet/api/microsoft.sqlserver.server.sqlfunctionattribute.isdeterministic

## Issues Found
- The post stated that CLR integration is enabled by default in Azure SQL Managed Instance. Microsoft documents CLR integration as off by default for SQL Server and Azure SQL Managed Instance, so the text now says it is disabled by default and keeps the `sp_configure 'clr enabled', 1` example.
- The post suggested deploying an assembly from Azure Blob Storage by URL. Azure SQL Managed Instance supports `CREATE ASSEMBLY FROM BINARY` only and does not support `CREATE ASSEMBLY FROM FILE`, so the Blob Storage deployment example was removed and replaced with a note to use binary deployment.
- The security guidance under-described CLR strict security. Azure SQL Managed Instance enforces CLR strict security, which treats SAFE and EXTERNAL_ACCESS assemblies as UNSAFE unless signed or trusted, so the permission-level and security sections were updated.
- The EXTERNAL_ACCESS description implied Managed Instance file system access. Microsoft documents that Managed Instance cannot access file shares or Windows folders, so the text now distinguishes general SQL Server behavior from Managed Instance restrictions.
- The C# stored procedure example used `SqlConnection`, `SqlCommand`, and `SqlDataReader` without importing `System.Data.SqlClient`. Added the missing `using` directive.
- The domain extraction example used a regex that returned the `@` character with the domain. Updated the pattern to `(?<=@).+$` so the result matches the stated output.
- The performance guidance said `IsDeterministic = true` enables caching. Microsoft documents determinism as metadata used for correctness and features such as indexed computed columns/views, so the advice now says to mark functions deterministic only when the declaration is true.

## Review Notes
The examples are illustrative and still omit the full certificate/asymmetric-key signing workflow. That is acceptable for this focused post, but a production-ready follow-up should show the exact signing or trusted assembly process for Azure SQL Managed Instance.
