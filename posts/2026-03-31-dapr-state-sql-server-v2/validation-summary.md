# Validation Summary: How to Use Dapr State Store with Microsoft SQL Server v2 Features

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime) state management
- Microsoft SQL Server / Azure SQL Database
- Dapr SQL Server state store component (v2)
- Dapr .NET SDK (C#)
- Kubernetes (secrets, component configuration)
- Microsoft Entra ID (Azure AD) Managed Identity

## Sources Consulted
- Dapr SQL Server v1 state store docs: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-sqlserver/
- Dapr SQL Server v2 state store docs: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-sqlserver-v2/
- Dapr State Query API docs: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-state-query-api/
- Dapr State API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr .NET SDK client docs: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-client/
- Dapr components-contrib source code (v2 migration.go): https://github.com/dapr/components-contrib/blob/master/state/sqlserver/v2/migration.go
- Dapr components-contrib source code (v2 sqlserver.go): https://github.com/dapr/components-contrib/blob/master/state/sqlserver/v2/sqlserver.go

## Issues Found

1. **Component version field was wrong**: The spec used `version: v1` but the post is about v2 features. Changed to `version: v2`. The v2 component requires this version specifier and is incompatible with v1.

2. **Metadata field name `cleanupInterval` does not exist**: The correct field name is `cleanupIntervalInSeconds` and the value must be in seconds (not duration format like "5m"). Changed from `cleanupInterval: "5m"` to `cleanupIntervalInSeconds: "300"`.

3. **V2 table schema was incorrect in multiple ways**:
   - Key column was `NVARCHAR(900)` but v2 default `keyLength` is 200. Changed to `NVARCHAR(200)`.
   - Data column was `NVARCHAR(MAX) NOT NULL` but v2 uses `NVARCHAR(MAX) NULL` alongside a separate `VARBINARY(MAX) NULL` column named `[BinaryData]`. Added the `[BinaryData]` column.
   - The `[isBinary]` column was missing its `DEFAULT(0)` constraint.
   - ETag column was `[ETag] INT NOT NULL` but v2 uses SQL Server's native `[RowVersion] ROWVERSION NOT NULL` type (an 8-byte binary value, not an integer). Fixed column name and type.
   - `[UpdateTime]` column did not exist in v2. Replaced with the actual v2 columns: `[InsertDate] DATETIME2 NOT NULL DEFAULT(GETDATE())` and `[UpdateDate] DATETIME2 NULL`.
   - Removed the filtered index on ExpireDate (not confirmed in v2 source).

4. **State Query API section was incorrect for v2**: The v2 SQL Server component explicitly does not support the Dapr State Query API (confirmed by both official docs and source code showing no Query() method). Removed the C# query code example (which also used a non-existent `StateQueryRequest` class) and replaced the section with accurate information about indexed properties and their v2 limitations.

5. **Azure SQL Managed Identity configuration was wrong**: The post used `authentication=ActiveDirectoryMSI` as a connection string parameter. Dapr uses a separate `useAzureAD: "true"` metadata field instead, with credentials omitted from the connection string. Fixed the YAML configuration.

6. **Overview incorrectly claimed Query API support**: Removed "State Query API through JSON column indexing" from the overview and added a note that v2 does not support the query API and is incompatible with v1.

7. **Summary incorrectly described ETags as "integer-based"**: SQL Server ROWVERSION is an 8-byte binary type, not an integer. Changed to "ROWVERSION-based ETags". Also removed the claim that indexedProperties are for the State Query API.

## Review Notes
- The `QueryStateAsync` method in the Dapr .NET SDK accepts a raw JSON string query, not a typed `StateQueryRequest` object. The original code example used a non-existent class. This was removed as part of the v2 query API correction.
- The connection string in the kubectl command uses URL-style format (`sqlserver://...`), which is valid for the go-mssqldb driver but differs from the ADO.NET format (`Server=...;Database=...;`) shown in most Dapr documentation. Both formats work.
- The `SaveStateAsync` with metadata dictionary for TTL is correct per the Dapr .NET SDK.
- The `GetStateAndETagAsync` and `TrySaveStateAsync` methods are valid Dapr .NET SDK methods and the usage shown is correct.
- The v2 component stores data in both `[Data]` (NVARCHAR) and `[BinaryData]` (VARBINARY) columns with an `[isBinary]` flag, which is a significant architectural difference from v1 that users should understand when planning direct SQL access.
