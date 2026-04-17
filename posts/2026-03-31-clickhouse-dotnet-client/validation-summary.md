# Validation Summary: How to Use ClickHouse .NET Client

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- .NET / C#
- ClickHouse.Client (DarkWanderer) NuGet package
- ADO.NET
- Dapper
- ClickHouseBulkCopy
- ClickHouse SQL (MergeTree engine, `numbers()` table function, parameterized queries)

## Sources Consulted
- ClickHouse.Client GitHub repo: https://github.com/DarkWanderer/ClickHouse.Client
- `ClickHouseConnectionStringBuilder.cs` (connection-string property names, defaults, Protocol handling)
- `ClickHouse.Client/ADO/ClickHouseConnection.cs` (namespace verification)
- `ClickHouse.Client/Copy/ClickHouseBulkCopy.cs` (BulkCopy API: `DestinationTableName`, `BatchSize`, `InitAsync`, `WriteToServerAsync`)
- `ClickHouse.Client/ADO/Parameters/ClickHouseDbParameter.cs` (parameter class)
- ClickHouse docs for HTTP interface ports (8123 HTTP, 8443 HTTPS) and named parameter syntax `{name:Type}`

## Issues Found
No technical issues found. Each claim was verified:
- Connection-string properties (`Host`, `Port`, `Username`, `Password`, `Database`, `Protocol`) are valid.
- `Protocol=https` with port 8443 is the correct way to enable TLS for ClickHouse Cloud.
- `ClickHouseConnection` lives in `ClickHouse.Client.ADO`; `ClickHouseBulkCopy` in `ClickHouse.Client.Copy`.
- `InitAsync()` is still required before `WriteToServerAsync` in current versions (the library throws `InvalidOperationException` otherwise).
- `DestinationTableName` (init-only) and `BatchSize` are the correct property names.
- `ClickHouseDbParameter` is the right class, and the `{name:Type}` named-parameter syntax is correct ClickHouse syntax.
- Dapper integration via `QueryAsync<dynamic>` works because `ClickHouseConnection` implements `IDbConnection`.

## Review Notes
- `ClickHouseDbParameter` actually lives in the namespace `ClickHouse.Client.ADO.Parameters`, not `ClickHouse.Client.ADO`. The post does not show this `using` directive explicitly, so a reader copy-pasting may need to add `using ClickHouse.Client.ADO.Parameters;` — minor, not technically incorrect.
- The `ClickHouseBulkCopy` example does not set `ColumnNames`. Without it, the library inserts into all destination columns in declaration order, so the row tuples must match the table schema's column order exactly. The sample's row shape `{ id, event_time, event_type }` happens to match the DDL section's `events` table, so it is correct, but real-world users should be aware that explicitly setting `ColumnNames` is safer.
- The post does not mention a specific package version. The APIs shown are stable across recent ClickHouse.Client 7.x releases.
