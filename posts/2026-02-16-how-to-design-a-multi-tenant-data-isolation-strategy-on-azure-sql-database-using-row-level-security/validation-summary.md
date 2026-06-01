# Validation Summary: How to Design a Multi-Tenant Data Isolation Strategy on Azure SQL Database

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure SQL Database
- SQL Server Row-Level Security
- T-SQL security policies and predicate functions
- SESSION_CONTEXT and sp_set_session_context
- Entity Framework Core connection interceptors
- ASP.NET Core middleware
- ADO.NET connection pooling

## Sources Consulted
- Microsoft Learn: Row-Level Security - SQL Server: https://learn.microsoft.com/en-us/sql/relational-databases/security/row-level-security
- Microsoft Learn: CREATE SECURITY POLICY (Transact-SQL): https://learn.microsoft.com/en-us/sql/t-sql/statements/create-security-policy-transact-sql
- Microsoft Learn: sp_set_session_context (Transact-SQL): https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-set-session-context-transact-sql
- Microsoft Learn: DbConnectionInterceptor.ConnectionOpenedAsync Method: https://learn.microsoft.com/en-us/dotnet/api/microsoft.entityframeworkcore.diagnostics.dbconnectioninterceptor.connectionopenedasync
- Microsoft Learn: SQL Server connection pooling (ADO.NET): https://learn.microsoft.com/en-us/sql/connect/ado-net/sql-server-connection-pooling

## Issues Found
- The post stated that missing a TenantId index would make every query do a full table scan. I changed this to a less absolute statement because query plans depend on the rest of the query and available indexes, though the RLS predicate can still cause significantly more scanning without a suitable TenantId index.
- The post described filter predicates as applying to SELECT queries only. I updated this to say SELECT, UPDATE, and DELETE operations, matching SQL Server RLS documentation.
- The connection pooling section said a previous read-only session context might remain set and could not be overwritten after a connection is returned to the pool. I corrected the wording: read-only session context cannot be changed on the current logical connection until that connection is closed and returned to the pool, so applications should set it whenever EF opens a connection and close/dispose connections promptly.
- The EF Core connection interceptor example set TenantId without @read_only=1. I updated the command to include @read_only=1 so it matches the security guidance given earlier in the post.
- The RLS testing example inserted rows after creating block predicates without first setting the matching tenant context. Those inserts would be blocked. I updated the test setup to set TenantId before each tenant-specific insert.
- The post claimed BULK INSERT bypasses RLS. Microsoft documentation says AFTER INSERT block predicates apply to bulk insert operations as they do to regular inserts. I corrected the pitfall to advise setting tenant context and validating tenant IDs during bulk loading.

## Review Notes
The overall design is technically sound for shared-database multi-tenancy with RLS. Future improvements could mention that any user can set session context for their own session, so administrative bypass flags such as IsAdmin must be controlled by trusted server-side code and database permissions, not by client-supplied input.
