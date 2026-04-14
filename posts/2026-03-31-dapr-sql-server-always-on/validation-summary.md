# Validation Summary: How to Configure SQL Server Always On with Dapr State Store

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Microsoft SQL Server Always On Availability Groups
- Dapr (Distributed Application Runtime) state store component (`state.sqlserver`)
- Dapr .NET SDK (`Dapr.Client`)
- Kubernetes (for secret management)
- T-SQL (JSON_VALUE, computed columns, filtered indexes)

## Sources Consulted
- Dapr SQL Server state store component reference — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-sqlserver/
- Dapr .NET SDK client documentation — https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-client/
- Dapr .NET SDK source (DaprClient.cs) — https://github.com/dapr/dotnet-sdk/blob/master/src/Dapr.Client/DaprClient.cs
- Microsoft SQL Server CREATE AVAILABILITY GROUP documentation — https://learn.microsoft.com/en-us/sql/t-sql/statements/create-availability-group-transact-sql
- Microsoft SQL Server ALTER AVAILABILITY GROUP ADD LISTENER documentation — https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-availability-group-transact-sql
- Microsoft SQL Server JSON_VALUE documentation — https://learn.microsoft.com/en-us/sql/t-sql/functions/json-value-transact-sql

## Issues Found

1. **Incorrect Dapr metadata field name `schemaName`**: The Dapr SQL Server state store uses `schema` (not `schemaName`) as the metadata field name. Changed `schemaName` to `schema` in the component YAML.

2. **Incorrect Dapr metadata field name `cleanupInterval` with duration string value**: The correct field name is `cleanupIntervalInSeconds` and it accepts an integer value in seconds, not a duration string like `"1h"`. Changed to `cleanupIntervalInSeconds` with value `"3600"`.

3. **Unnecessary `using System.Text.Json;` import in C# example**: The code does not use anything from `System.Text.Json` directly — Dapr handles serialization internally. Removed the unused import to avoid confusion.

## Review Notes
- The SQL Server Always On AG T-SQL syntax is correct for SQL Server 2016+. The features used (`DB_FAILOVER`, `SEEDING_MODE = AUTOMATIC`, `FAILURE_CONDITION_LEVEL`) all require SQL Server 2016 or later.
- The connection string parameters (`MultiSubnetFailover=True`, `ApplicationIntent=ReadWrite/ReadOnly`, `ConnectRetryCount`, `ConnectRetryInterval`) are all valid ADO.NET connection string keywords for SQL Server AG scenarios.
- The Dapr .NET SDK API usage (`SaveStateAsync`, `GetStateAsync`, `StateOptions`, `ConsistencyMode.Strong`, `ConcurrencyMode.LastWrite`) is all correct per the current SDK.
- The `JSON_VALUE` computed column approach for indexed JSON properties is valid T-SQL. For production use, adding `PERSISTED` to the computed column definition would be a safer practice for filtered indexes.
- The read-only replica component pattern using `ApplicationIntent=ReadOnly` is a valid approach, though note that Dapr state store operations (Get/Save/Delete) all go through a single component — using a separate component name for reads requires application-level routing logic.
