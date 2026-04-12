# Validation Summary: How to Connect to MySQL from C#/.NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- C# / .NET
- MySqlConnector (NuGet package)
- Oracle Connector/NET (`MySql.Data`) — mentioned as alternative
- Pomelo.EntityFrameworkCore.MySql — mentioned for EF Core
- Dapper (micro-ORM)
- ADO.NET

## Sources Consulted
- MySqlConnector Connection Options — https://mysqlconnector.net/connection-options/
- MySqlConnector MySqlDataReader.GetInt32 API — https://mysqlconnector.net/api/mysqlconnector/mysqldatareader/getint32/
- MySqlConnector MySqlCommand.LastInsertedId API — https://mysqlconnector.net/api/mysqlconnector/mysqlcommand/lastinsertedid/
- MySqlConnector MySqlConnection.BeginTransactionAsync API — https://mysqlconnector.net/api/mysqlconnector/mysqlconnection/begintransactionasync/
- .NET DbDataReader documentation — https://learn.microsoft.com/en-us/dotnet/api/system.data.common.dbdatareader
- Dapper GitHub / NuGet documentation

## Issues Found
No technical issues found.

## Review Notes
- MySqlConnector's `MySqlDataReader` provides string-based overloads (`GetInt32(string)`, `GetString(string)`, `GetDouble(string)`) beyond the standard `DbDataReader` ordinal-only methods, so the querying example is correct.
- `SslMode=None` is accepted as an alias for `Disabled` in MySqlConnector connection strings. Both are valid; `Disabled` is the primary name in MySqlConnector 2.x+, but `None` remains supported for compatibility.
- The `CharSet=utf8mb4` setting in the connection string is redundant since MySqlConnector defaults to `utf8mb4`, but it is not incorrect and serves as explicit documentation of intent.
- The `MySqlCommand` objects in the Transactions section are not wrapped in `await using` statements, which is a minor best-practice gap but not a correctness issue for a tutorial example.
- The Dapper `record` definition at the end of the code block would need to be at the namespace/type level in a real project, but this is acceptable for a blog snippet.
