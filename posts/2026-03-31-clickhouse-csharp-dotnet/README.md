# How to Use ClickHouse with C# and .NET

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, C#, .NET, ADO.NET, Analytics

Description: Connect to ClickHouse from C# and .NET using the official ClickHouse.Client library to run queries, inserts, and async data operations.

---

## Installation

```bash
dotnet add package ClickHouse.Client
```

## Creating a Connection

```csharp
using ClickHouse.Client.ADO;

var connectionString = "Host=localhost;Port=8123;Database=analytics;Username=default;Password=;";
using var connection = new ClickHouseConnection(connectionString);
await connection.OpenAsync();
```

## Running a Query

```csharp
using ClickHouse.Client.ADO;
using System.Data;

var sql = @"
    SELECT event_name, count() AS cnt
    FROM events
    WHERE toDate(ts) >= today() - 7
    GROUP BY event_name
    ORDER BY cnt DESC
    LIMIT 10";

using var command = connection.CreateCommand();
command.CommandText = sql;

using var reader = await command.ExecuteReaderAsync();
while (await reader.ReadAsync())
{
    var name  = reader.GetString(0);
    var count = reader.GetInt64(1);
    Console.WriteLine($"{name}: {count}");
}
```

## Parameterized Queries

```csharp
command.CommandText = "SELECT count() FROM events WHERE user_id = {userId:UInt64}";
command.AddParameter("userId", 42UL);
var result = await command.ExecuteScalarAsync();
Console.WriteLine($"Events: {result}");
```

## Inserting Data with BulkCopyInterface

```csharp
using ClickHouse.Client.Copy;

var bulkCopy = new ClickHouseBulkCopy(connection)
{
    DestinationTableName = "events",
    BatchSize = 10_000,
};

var data = Enumerable.Range(0, 100_000).Select(i => new object[]
{
    (ulong)i,
    "page_view",
    DateTime.UtcNow,
});

await bulkCopy.InitAsync();
await bulkCopy.WriteToServerAsync(data);
```

## Mapping Results to a Class

```csharp
public class EventSummary
{
    public string EventName { get; set; } = "";
    public long Count       { get; set; }
    public double AvgMs     { get; set; }
}

var results = new List<EventSummary>();
using var reader = await command.ExecuteReaderAsync();
while (await reader.ReadAsync())
{
    results.Add(new EventSummary
    {
        EventName = reader.GetString(0),
        Count     = reader.GetInt64(1),
        AvgMs     = reader.GetDouble(2),
    });
}
```

## Connection String Parameters

```text
Host=localhost;Port=8123;Database=analytics;
Username=default;Password=;
Compression=true;UseSession=false;
```

## Dapper Integration

```csharp
using Dapper;

var rows = await connection.QueryAsync<EventSummary>(
    "SELECT event_name AS EventName, count() AS Count FROM events GROUP BY event_name"
);
```

## Summary

The `ClickHouse.Client` NuGet package provides an ADO.NET-compatible interface for C# and .NET. Use `ClickHouseBulkCopy` for high-throughput inserts, parameterized commands for safe queries, and Dapper for lightweight object mapping without a full ORM.
