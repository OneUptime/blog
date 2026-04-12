# Validation Summary: How to Configure MySQL Connector/NET for C#

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Connector/NET (`MySql.Data`)
- MySqlConnector (community alternative)
- C# / .NET (ADO.NET patterns)
- Dapper micro-ORM
- ASP.NET Core Dependency Injection

## Sources Consulted
- Microsoft .NET API Reference: `DbDataReader` class — https://learn.microsoft.com/en-us/dotnet/api/system.data.common.dbdatareader
- MySql.Data NuGet package documentation — https://dev.mysql.com/doc/connector-net/en/
- MySqlConnector documentation — https://mysqlconnector.net/
- Dapper documentation — https://github.com/DapperLib/Dapper

## Issues Found
1. **`DbDataReader.GetInt32(string)` and `GetString(string)` do not exist.** The `GetInt32()` and `GetString()` methods on `DbDataReader` (and both `MySql.Data` and `MySqlConnector` implementations) only accept an `int ordinal` parameter, not a `string columnName`. Calls like `reader.GetInt32("id")` and `reader.GetString("name")` would fail to compile. Fixed all three occurrences (in "Basic Connection and Query", "Parameterized Queries", and "CustomerRepository.GetByIdAsync") to use `reader.GetInt32(reader.GetOrdinal("id"))` pattern instead.

## Review Notes
- The post correctly recommends `MySqlConnector` over `MySql.Data` for better truly-async I/O support.
- The `AddTransient<MySqlConnection>` DI registration pattern works but is simplistic; in production, `MySqlDataSource` (available in MySqlConnector 2.x+) provides a more robust pooling-aware registration. This is acceptable for a tutorial.
- The `AddWithValue` method is used throughout. While functional, it can cause type inference issues with MySQL (e.g., strings vs. enums). `MySqlParameter` with explicit `MySqlDbType` is more robust, but `AddWithValue` is fine for a getting-started tutorial.
- Connection string parameter names like `MinimumPoolSize` and `MaximumPoolSize` work with MySqlConnector; users of `MySql.Data` may need the spaced forms (`Minimum Pool Size`, `Maximum Pool Size`).
