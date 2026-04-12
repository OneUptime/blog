# How to Configure MySQL Connector/NET for C#

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, C#, Connector/NET, .NET, ADO.NET, Database

Description: Learn how to install and configure MySQL Connector/NET in a C# application, execute queries, use parameterized statements, and handle transactions.

---

## What Is MySQL Connector/NET

MySQL Connector/NET is the official ADO.NET provider for MySQL. It allows .NET applications (C#, VB.NET, F#) to connect to MySQL databases using familiar ADO.NET patterns.

Key packages:
- `MySql.Data` - the classic ADO.NET connector.
- `MySqlConnector` - a community-maintained alternative with better async support.

## Installing Connector/NET

```bash
# Install official Oracle connector
dotnet add package MySql.Data

# Or install the async-optimized alternative (recommended)
dotnet add package MySqlConnector
```

## Connection String Configuration

```csharp
string connectionString = "Server=localhost;" +
                          "Port=3306;" +
                          "Database=myapp;" +
                          "User ID=app_user;" +
                          "Password=StrongPass!1;" +
                          "SslMode=Required;" +
                          "Pooling=true;" +
                          "MinimumPoolSize=5;" +
                          "MaximumPoolSize=50;" +
                          "ConnectionTimeout=30;" +
                          "DefaultCommandTimeout=60;";
```

In `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "MySQL": "Server=localhost;Port=3306;Database=myapp;User ID=app_user;Password=StrongPass!1;SslMode=Required;"
  }
}
```

## Basic Connection and Query

```csharp
using MySql.Data.MySqlClient;
// or: using MySqlConnector;

var connectionString = "Server=localhost;Database=myapp;User ID=app_user;Password=pass;";

using var connection = new MySqlConnection(connectionString);
await connection.OpenAsync();

using var command = connection.CreateCommand();
command.CommandText = "SELECT id, name, email FROM customers WHERE status = 'active' LIMIT 10";

using var reader = await command.ExecuteReaderAsync();
while (await reader.ReadAsync())
{
    int id = reader.GetInt32(reader.GetOrdinal("id"));
    string name = reader.GetString(reader.GetOrdinal("name"));
    string email = reader.GetString(reader.GetOrdinal("email"));
    Console.WriteLine($"{id}: {name} <{email}>");
}
```

## Parameterized Queries (Prevent SQL Injection)

Always use parameterized queries when accepting user input:

```csharp
async Task<Customer?> GetCustomerByEmailAsync(string email, MySqlConnection connection)
{
    using var command = connection.CreateCommand();
    command.CommandText = "SELECT id, name, email FROM customers WHERE email = @email";
    command.Parameters.AddWithValue("@email", email);

    using var reader = await command.ExecuteReaderAsync();
    if (await reader.ReadAsync())
    {
        return new Customer
        {
            Id = reader.GetInt32(reader.GetOrdinal("id")),
            Name = reader.GetString(reader.GetOrdinal("name")),
            Email = reader.GetString(reader.GetOrdinal("email"))
        };
    }
    return null;
}
```

## INSERT with Parameters

```csharp
async Task<int> CreateOrderAsync(int customerId, decimal amount, MySqlConnection connection)
{
    using var command = connection.CreateCommand();
    command.CommandText = @"
        INSERT INTO orders (customer_id, total_amount, status, created_at)
        VALUES (@customerId, @amount, 'pending', NOW())";

    command.Parameters.AddWithValue("@customerId", customerId);
    command.Parameters.AddWithValue("@amount", amount);

    await command.ExecuteNonQueryAsync();
    return (int)command.LastInsertedId;
}
```

## Transactions

```csharp
async Task TransferFundsAsync(int fromId, int toId, decimal amount, MySqlConnection connection)
{
    using var transaction = await connection.BeginTransactionAsync();
    try
    {
        var debitCmd = connection.CreateCommand();
        debitCmd.Transaction = transaction;
        debitCmd.CommandText = "UPDATE accounts SET balance = balance - @amount WHERE id = @id";
        debitCmd.Parameters.AddWithValue("@amount", amount);
        debitCmd.Parameters.AddWithValue("@id", fromId);
        await debitCmd.ExecuteNonQueryAsync();

        var creditCmd = connection.CreateCommand();
        creditCmd.Transaction = transaction;
        creditCmd.CommandText = "UPDATE accounts SET balance = balance + @amount WHERE id = @id";
        creditCmd.Parameters.AddWithValue("@amount", amount);
        creditCmd.Parameters.AddWithValue("@id", toId);
        await creditCmd.ExecuteNonQueryAsync();

        await transaction.CommitAsync();
    }
    catch
    {
        await transaction.RollbackAsync();
        throw;
    }
}
```

## Using Dapper for Simplified Queries

Dapper is a lightweight micro-ORM that works with Connector/NET:

```bash
dotnet add package Dapper
```

```csharp
using Dapper;

async Task<IEnumerable<Customer>> GetActiveCustomersAsync(MySqlConnection connection)
{
    return await connection.QueryAsync<Customer>(
        "SELECT id, name, email FROM customers WHERE status = @status",
        new { status = "active" }
    );
}

async Task<int> InsertCustomerAsync(Customer customer, MySqlConnection connection)
{
    return await connection.ExecuteScalarAsync<int>(
        "INSERT INTO customers (name, email) VALUES (@Name, @Email); SELECT LAST_INSERT_ID();",
        customer
    );
}
```

## Dependency Injection with ASP.NET Core

```csharp
// Program.cs
builder.Services.AddTransient<MySqlConnection>(_ =>
    new MySqlConnection(builder.Configuration.GetConnectionString("MySQL")));
```

For connection pooling with a typed repository:

```csharp
// CustomerRepository.cs
public class CustomerRepository
{
    private readonly string _connectionString;

    public CustomerRepository(IConfiguration config)
    {
        _connectionString = config.GetConnectionString("MySQL")!;
    }

    public async Task<Customer?> GetByIdAsync(int id)
    {
        await using var connection = new MySqlConnection(_connectionString);
        await connection.OpenAsync();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT id, name, email FROM customers WHERE id = @id";
        command.Parameters.AddWithValue("@id", id);
        using var reader = await command.ExecuteReaderAsync();
        if (await reader.ReadAsync())
            return new Customer { Id = reader.GetInt32(reader.GetOrdinal("id")), Name = reader.GetString(reader.GetOrdinal("name")) };
        return null;
    }
}
```

## Connection String Security

Never hardcode passwords. Use environment variables or secrets management:

```csharp
var connectionString = $"Server={Environment.GetEnvironmentVariable("DB_HOST")};" +
                       $"Database={Environment.GetEnvironmentVariable("DB_NAME")};" +
                       $"User ID={Environment.GetEnvironmentVariable("DB_USER")};" +
                       $"Password={Environment.GetEnvironmentVariable("DB_PASSWORD")};";
```

## Summary

MySQL Connector/NET integrates MySQL with C# applications through standard ADO.NET patterns. Always use parameterized queries with `@parameter` syntax to prevent SQL injection, wrap multi-step operations in transactions, and use connection pooling (enabled by default) to reuse database connections efficiently. For simplified data access, combine Connector/NET with Dapper for clean query mapping without a full ORM.
