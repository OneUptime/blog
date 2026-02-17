# How to Implement Repository Pattern with Dapper and Azure SQL Database in C#

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Dapper, C#, Repository Pattern, Azure SQL, .NET, Database

Description: Implement the repository pattern using Dapper micro-ORM with Azure SQL Database in C# for lightweight and performant data access.

---

Entity Framework Core is the default ORM choice in .NET, but sometimes you want more control over your SQL or need the raw performance of a lighter abstraction. Dapper fills that gap. It is a micro-ORM that maps SQL query results to C# objects with minimal overhead. Combined with the repository pattern, it gives you clean, testable data access code. In this post, I will implement this pattern against Azure SQL Database.

## Why Dapper?

Dapper sits close to ADO.NET but removes the tedious boilerplate of reading columns into objects. You write the SQL, Dapper handles the mapping. It was built by the Stack Overflow team for performance-critical scenarios, and it shows - Dapper is significantly faster than EF Core for read-heavy workloads because there is no change tracking or query translation layer.

The trade-off is that you write SQL by hand. For some teams, that is a feature, not a bug.

## Setting Up

```bash
dotnet new webapi -n DapperDemo
cd DapperDemo

# Add Dapper and SQL Server packages
dotnet add package Dapper
dotnet add package Microsoft.Data.SqlClient
dotnet add package Azure.Identity
```

## Defining the Models

Simple POCOs - no base classes, no attributes, no navigation properties.

```csharp
// Models/Product.cs
public class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int StockQuantity { get; set; }
    public string Category { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

// Models/ProductSummary.cs - A projection for list views
public class ProductSummary
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string Category { get; set; } = string.Empty;
    public bool InStock { get; set; }
}
```

## The Repository Interface

Define what operations your repository supports.

```csharp
// Repositories/IProductRepository.cs
public interface IProductRepository
{
    Task<Product?> GetByIdAsync(int id);
    Task<IEnumerable<ProductSummary>> GetAllAsync(int page, int pageSize, string? category = null);
    Task<int> GetCountAsync(string? category = null);
    Task<Product?> GetBySkuAsync(string sku);
    Task<int> CreateAsync(Product product);
    Task<bool> UpdateAsync(Product product);
    Task<bool> DeleteAsync(int id);
    Task<IEnumerable<Product>> GetLowStockAsync(int threshold);
}
```

## Implementing the Repository with Dapper

Here is the full repository implementation.

```csharp
// Repositories/ProductRepository.cs
using Dapper;
using Microsoft.Data.SqlClient;
using System.Data;

public class ProductRepository : IProductRepository
{
    private readonly string _connectionString;

    public ProductRepository(string connectionString)
    {
        _connectionString = connectionString;
    }

    /// <summary>
    /// Create a new database connection.
    /// Each method creates its own connection for thread safety.
    /// </summary>
    private IDbConnection CreateConnection()
    {
        return new SqlConnection(_connectionString);
    }

    public async Task<Product?> GetByIdAsync(int id)
    {
        const string sql = @"
            SELECT Id, Name, Sku, Price, StockQuantity, Category, IsActive, CreatedAt, UpdatedAt
            FROM Products
            WHERE Id = @Id";

        using var connection = CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<Product>(sql, new { Id = id });
    }

    public async Task<IEnumerable<ProductSummary>> GetAllAsync(
        int page, int pageSize, string? category = null)
    {
        // Build the query dynamically based on the filter
        var sql = @"
            SELECT Id, Name, Price, Category,
                   CASE WHEN StockQuantity > 0 THEN 1 ELSE 0 END AS InStock
            FROM Products
            WHERE IsActive = 1";

        if (!string.IsNullOrEmpty(category))
        {
            sql += " AND Category = @Category";
        }

        sql += @"
            ORDER BY Name
            OFFSET @Offset ROWS
            FETCH NEXT @PageSize ROWS ONLY";

        using var connection = CreateConnection();
        return await connection.QueryAsync<ProductSummary>(sql, new
        {
            Category = category,
            Offset = (page - 1) * pageSize,
            PageSize = pageSize
        });
    }

    public async Task<int> GetCountAsync(string? category = null)
    {
        var sql = "SELECT COUNT(*) FROM Products WHERE IsActive = 1";

        if (!string.IsNullOrEmpty(category))
        {
            sql += " AND Category = @Category";
        }

        using var connection = CreateConnection();
        return await connection.ExecuteScalarAsync<int>(sql, new { Category = category });
    }

    public async Task<Product?> GetBySkuAsync(string sku)
    {
        const string sql = @"
            SELECT Id, Name, Sku, Price, StockQuantity, Category, IsActive, CreatedAt, UpdatedAt
            FROM Products
            WHERE Sku = @Sku";

        using var connection = CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<Product>(sql, new { Sku = sku });
    }

    public async Task<int> CreateAsync(Product product)
    {
        const string sql = @"
            INSERT INTO Products (Name, Sku, Price, StockQuantity, Category, IsActive, CreatedAt)
            VALUES (@Name, @Sku, @Price, @StockQuantity, @Category, @IsActive, @CreatedAt);
            SELECT CAST(SCOPE_IDENTITY() AS INT)";

        product.CreatedAt = DateTime.UtcNow;

        using var connection = CreateConnection();
        // ExecuteScalar returns the new ID from SCOPE_IDENTITY()
        return await connection.QuerySingleAsync<int>(sql, product);
    }

    public async Task<bool> UpdateAsync(Product product)
    {
        const string sql = @"
            UPDATE Products
            SET Name = @Name,
                Price = @Price,
                StockQuantity = @StockQuantity,
                Category = @Category,
                IsActive = @IsActive,
                UpdatedAt = @UpdatedAt
            WHERE Id = @Id";

        product.UpdatedAt = DateTime.UtcNow;

        using var connection = CreateConnection();
        int rowsAffected = await connection.ExecuteAsync(sql, product);
        return rowsAffected > 0;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        // Soft delete - set IsActive to false
        const string sql = @"
            UPDATE Products
            SET IsActive = 0, UpdatedAt = @UpdatedAt
            WHERE Id = @Id";

        using var connection = CreateConnection();
        int rowsAffected = await connection.ExecuteAsync(sql, new
        {
            Id = id,
            UpdatedAt = DateTime.UtcNow
        });
        return rowsAffected > 0;
    }

    public async Task<IEnumerable<Product>> GetLowStockAsync(int threshold)
    {
        const string sql = @"
            SELECT Id, Name, Sku, Price, StockQuantity, Category, IsActive, CreatedAt, UpdatedAt
            FROM Products
            WHERE StockQuantity < @Threshold AND IsActive = 1
            ORDER BY StockQuantity ASC";

        using var connection = CreateConnection();
        return await connection.QueryAsync<Product>(sql, new { Threshold = threshold });
    }
}
```

## Database Schema

Create the table. You can run this migration manually or use a migration tool like DbUp or FluentMigrator.

```sql
-- Create the Products table
CREATE TABLE Products (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(200) NOT NULL,
    Sku NVARCHAR(50) NOT NULL,
    Price DECIMAL(10, 2) NOT NULL,
    StockQuantity INT NOT NULL DEFAULT 0,
    Category NVARCHAR(100) NOT NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NULL,
    CONSTRAINT UQ_Products_Sku UNIQUE (Sku)
);

-- Index for category filtering
CREATE INDEX IX_Products_Category ON Products (Category) WHERE IsActive = 1;

-- Index for low stock queries
CREATE INDEX IX_Products_StockQuantity ON Products (StockQuantity) WHERE IsActive = 1;
```

## Registering in DI

Wire up the repository in your ASP.NET Core application.

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

// Register the repository
string connectionString = builder.Configuration.GetConnectionString("ProductDb")!;
builder.Services.AddScoped<IProductRepository>(_ => new ProductRepository(connectionString));

var app = builder.Build();

// Map the API endpoints
app.MapGet("/api/products", async (
    IProductRepository repo,
    int page = 1,
    int pageSize = 10,
    string? category = null) =>
{
    var products = await repo.GetAllAsync(page, pageSize, category);
    var total = await repo.GetCountAsync(category);

    return Results.Ok(new { products, total, page, pageSize });
});

app.MapGet("/api/products/{id}", async (int id, IProductRepository repo) =>
{
    var product = await repo.GetByIdAsync(id);
    return product is null ? Results.NotFound() : Results.Ok(product);
});

app.MapPost("/api/products", async (Product product, IProductRepository repo) =>
{
    // Check for duplicate SKU
    var existing = await repo.GetBySkuAsync(product.Sku);
    if (existing is not null)
        return Results.Conflict("A product with this SKU already exists");

    int id = await repo.CreateAsync(product);
    product.Id = id;
    return Results.Created($"/api/products/{id}", product);
});

app.MapPut("/api/products/{id}", async (int id, Product product, IProductRepository repo) =>
{
    product.Id = id;
    bool updated = await repo.UpdateAsync(product);
    return updated ? Results.Ok(product) : Results.NotFound();
});

app.MapDelete("/api/products/{id}", async (int id, IProductRepository repo) =>
{
    bool deleted = await repo.DeleteAsync(id);
    return deleted ? Results.NoContent() : Results.NotFound();
});

app.MapGet("/api/products/low-stock", async (IProductRepository repo, int threshold = 10) =>
{
    var products = await repo.GetLowStockAsync(threshold);
    return Results.Ok(products);
});

app.Run();
```

## Multi-Mapping for Joins

Dapper can map joined queries to multiple objects. Here is an example that joins products with their order history.

```csharp
public async Task<IEnumerable<ProductWithOrders>> GetProductsWithRecentOrdersAsync()
{
    const string sql = @"
        SELECT p.Id, p.Name, p.Sku, p.Price,
               o.Id AS OrderId, o.Quantity, o.OrderDate, o.CustomerName
        FROM Products p
        LEFT JOIN OrderItems oi ON p.Id = oi.ProductId
        LEFT JOIN Orders o ON oi.OrderId = o.Id
        WHERE p.IsActive = 1
        ORDER BY p.Name, o.OrderDate DESC";

    using var connection = CreateConnection();

    // Map to two types and combine them
    var productDict = new Dictionary<int, ProductWithOrders>();

    await connection.QueryAsync<ProductWithOrders, OrderInfo, ProductWithOrders>(
        sql,
        (product, order) =>
        {
            if (!productDict.TryGetValue(product.Id, out var existingProduct))
            {
                existingProduct = product;
                existingProduct.RecentOrders = new List<OrderInfo>();
                productDict[product.Id] = existingProduct;
            }

            if (order is not null)
            {
                existingProduct.RecentOrders.Add(order);
            }

            return existingProduct;
        },
        splitOn: "OrderId"  // Column where the second object starts
    );

    return productDict.Values;
}
```

## Stored Procedures

Dapper works with stored procedures just as easily.

```csharp
public async Task<IEnumerable<Product>> SearchProductsAsync(string searchTerm, decimal? maxPrice)
{
    using var connection = CreateConnection();

    // Call a stored procedure with parameters
    return await connection.QueryAsync<Product>(
        "sp_SearchProducts",
        new { SearchTerm = searchTerm, MaxPrice = maxPrice },
        commandType: CommandType.StoredProcedure
    );
}
```

## Transaction Support

For operations that need atomicity, wrap them in a transaction.

```csharp
public async Task<bool> TransferStockAsync(int fromProductId, int toProductId, int quantity)
{
    using var connection = CreateConnection();
    connection.Open();

    using var transaction = connection.BeginTransaction();

    try
    {
        // Deduct from source product
        int deducted = await connection.ExecuteAsync(
            "UPDATE Products SET StockQuantity = StockQuantity - @Qty WHERE Id = @Id AND StockQuantity >= @Qty",
            new { Qty = quantity, Id = fromProductId },
            transaction
        );

        if (deducted == 0)
        {
            transaction.Rollback();
            return false; // Not enough stock
        }

        // Add to destination product
        await connection.ExecuteAsync(
            "UPDATE Products SET StockQuantity = StockQuantity + @Qty WHERE Id = @Id",
            new { Qty = quantity, Id = toProductId },
            transaction
        );

        transaction.Commit();
        return true;
    }
    catch
    {
        transaction.Rollback();
        throw;
    }
}
```

## Connection Resilience with Azure SQL

Azure SQL has transient errors. Unlike EF Core which has built-in retry, with Dapper you need to handle retries yourself.

```csharp
using Microsoft.Data.SqlClient;

public static class RetryHelper
{
    /// <summary>
    /// Execute a database operation with retry logic for transient Azure SQL errors.
    /// </summary>
    public static async Task<T> ExecuteWithRetryAsync<T>(
        Func<Task<T>> operation,
        int maxRetries = 3,
        int delayMs = 1000)
    {
        for (int attempt = 0; attempt <= maxRetries; attempt++)
        {
            try
            {
                return await operation();
            }
            catch (SqlException ex) when (IsTransient(ex) && attempt < maxRetries)
            {
                await Task.Delay(delayMs * (attempt + 1));
            }
        }

        throw new InvalidOperationException("Should not reach here");
    }

    private static bool IsTransient(SqlException ex)
    {
        // Common transient Azure SQL error numbers
        int[] transientErrors = { 40197, 40501, 40613, 49918, 49919, 49920, 4060, 40143 };
        return transientErrors.Contains(ex.Number);
    }
}
```

## Best Practices

1. **Create a new connection per operation.** SQL connections are pooled by ADO.NET, so creating SqlConnection objects is cheap.
2. **Always use parameterized queries.** Dapper handles this naturally with the anonymous object parameter.
3. **Use projections.** Do not SELECT * when you only need a few columns. Create DTOs for specific queries.
4. **Add retry logic for Azure SQL.** Transient failures are normal in cloud databases.
5. **Index your queries.** Since you write SQL directly, you have full control over optimizing both queries and indexes.
6. **Use transactions for multi-step operations** that need atomicity.

## Wrapping Up

Dapper with the repository pattern gives you a lightweight, performant data access layer. You control the SQL, Dapper handles the mapping, and the repository pattern keeps your data access cleanly separated from your business logic. For applications where query performance matters and you want explicit control over what SQL hits the database, this combination is hard to beat.
