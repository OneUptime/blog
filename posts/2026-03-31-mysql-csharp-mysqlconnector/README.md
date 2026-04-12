# How to Use MySQL with C# and MySqlConnector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, CSharp, MySqlConnector, ADO.NET, Async

Description: Learn how to use the MySqlConnector library for high-performance async MySQL access from C# with connection pooling and bulk operations.

---

## Why MySqlConnector?

MySqlConnector is a fully async, truly cancellable ADO.NET MySQL driver. Unlike Oracle's official Connector/NET (`MySql.Data`), `MySqlConnector` was built from the ground up with `async/await` in mind and correctly supports `CancellationToken` throughout. It is the recommended driver for .NET 6+ applications.

## Installation

```bash
dotnet add package MySqlConnector
dotnet add package MySqlConnector.DependencyInjection
```

## Connection String Format

```text
Server=localhost;Port=3306;Database=shop;User ID=app_user;Password=secret;
CharSet=utf8mb4;AllowPublicKeyRetrieval=True;SslMode=Preferred;
ConnectionTimeout=30;MinimumPoolSize=2;MaximumPoolSize=20;
```

## Registering with Dependency Injection (.NET 6+)

```csharp
// Program.cs
builder.Services.AddMySqlDataSource(
    builder.Configuration.GetConnectionString("DefaultConnection")!
);
```

Then inject `MySqlDataSource` into services:

```csharp
public class ProductRepository
{
    private readonly MySqlDataSource _db;

    public ProductRepository(MySqlDataSource db) => _db = db;

    public async Task<List<Product>> GetCheapProductsAsync(double maxPrice,
        CancellationToken ct = default)
    {
        await using var conn = await _db.OpenConnectionAsync(ct);
        await using var cmd  = conn.CreateCommand();
        cmd.CommandText = "SELECT id, name, price FROM products WHERE price < @max";
        cmd.Parameters.AddWithValue("@max", maxPrice);

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        var results = new List<Product>();
        while (await reader.ReadAsync(ct))
            results.Add(new Product(reader.GetInt32(0), reader.GetString(1), reader.GetDouble(2)));
        return results;
    }
}

public record Product(int Id, string Name, double Price);
```

## Bulk Insert with MySqlBulkCopy

```csharp
using MySqlConnector;
using System.Data;

var table = new DataTable();
table.Columns.Add("name",  typeof(string));
table.Columns.Add("price", typeof(decimal));

for (int i = 0; i < 10_000; i++)
    table.Rows.Add($"Product {i}", i * 0.99m);

await using var conn = await _db.OpenConnectionAsync();
var bulkCopy = new MySqlBulkCopy(conn)
{
    DestinationTableName = "products"
};
await bulkCopy.WriteToServerAsync(table);
```

## Using Prepared Statements for Repeated Queries

```csharp
await using var cmd = conn.CreateCommand();
cmd.CommandText = "INSERT INTO events (user_id, event_type) VALUES (@uid, @type)";
cmd.Parameters.Add("@uid",  MySqlDbType.Int32);
cmd.Parameters.Add("@type", MySqlDbType.VarChar);

await cmd.PrepareAsync();

foreach (var evt in events)
{
    cmd.Parameters["@uid"].Value  = evt.UserId;
    cmd.Parameters["@type"].Value = evt.Type;
    await cmd.ExecuteNonQueryAsync();
}
```

## Cancellation Support

```csharp
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));

try
{
    await using var cmd = conn.CreateCommand();
    cmd.CommandText = "SELECT * FROM large_table";
    await using var reader = await cmd.ExecuteReaderAsync(cts.Token);
    // ...
}
catch (OperationCanceledException)
{
    Console.WriteLine("Query cancelled after timeout");
}
```

## Summary

MySqlConnector is the best choice for async .NET MySQL applications. Register it as `MySqlDataSource` for DI-friendly connection pooling, use `MySqlBulkCopy` for high-throughput inserts, and take advantage of true `CancellationToken` support to prevent runaway queries. Always parameterize queries and load credentials from `appsettings.json` or environment variables.
