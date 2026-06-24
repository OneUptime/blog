# How to Implement Read Replicas with Entity Framework Core and Azure SQL Database

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Entity Framework Core, Azure SQL, Read Replica, .NET, Performance, Database, Scaling

Description: Scale read-heavy workloads by routing queries to Azure SQL Database read replicas using Entity Framework Core interceptors.

---

Most applications read data far more than they write it. A product catalog page, a user profile view, a dashboard query - these are all reads. When your primary database starts struggling under load, the first instinct is to scale up (bigger tier). But scaling up has limits and gets expensive fast. A better approach for read-heavy workloads is to route read queries to a read replica, keeping the primary database focused on writes. Azure SQL Database supports read scale-out in the Premium and Business Critical tiers, and in the Hyperscale tier when at least one secondary replica is configured. Entity Framework Core can be configured to route queries accordingly.

## How Azure SQL Read Replicas Work

Azure SQL Database Premium and Business Critical tiers maintain read-only replicas automatically, and Hyperscale supports read-only replicas when secondary replicas are configured. These replicas are kept in sync by propagating and applying transaction log records from the primary. You access them using the same connection string with an extra parameter: `ApplicationIntent=ReadOnly`. Azure's gateway routes the connection to an available replica instead of the primary.

```mermaid
graph LR
    App[Application]
    App -->|Writes| Primary[Primary Database]
    App -->|Reads| Replica1[Read Replica 1]
    App -->|Reads| Replica2[Read Replica 2]
    Primary -->|Transaction log records| Replica1
    Primary -->|Transaction log records| Replica2
```

There is a small replication lag - often from tens of milliseconds to single-digit seconds, but with no fixed upper bound - so the replicas may not have the absolute latest data. This is fine for most read scenarios but not for reads that immediately follow a write (like reading back a record you just inserted).

## Prerequisites

- .NET 8 SDK
- Azure SQL Database (Premium or Business Critical tier, or Hyperscale with at least one secondary replica)
- Basic Entity Framework Core knowledge

## Setting Up Connection Strings

You need two connection strings - one for the primary (read-write) and one for the replica (read-only):

```json
{
  "ConnectionStrings": {
    "Primary": "Server=myserver.database.windows.net;Database=MyApp;User Id=admin;Password=pass;Encrypt=True;",
    "ReadOnly": "Server=myserver.database.windows.net;Database=MyApp;User Id=admin;Password=pass;Encrypt=True;ApplicationIntent=ReadOnly;"
  }
}
```

The only difference is the `ApplicationIntent=ReadOnly` parameter. Same server, same database, same credentials - Azure handles routing to the replica.

## Implementing Read/Write Splitting

There are several ways to implement this in EF Core. The cleanest approach uses two DbContext instances - one for reads and one for writes.

First, define a base context with your model configuration:

```csharp
// Data/BaseDbContext.cs - Shared model configuration
using Microsoft.EntityFrameworkCore;

namespace ReadReplicaDemo.Data;

public abstract class BaseDbContext : DbContext
{
    protected BaseDbContext(DbContextOptions options) : base(options) { }

    public DbSet<Product> Products => Set<Product>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Price).HasPrecision(18, 2);
            entity.HasIndex(e => e.Category);
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasMany(e => e.Items).WithOne(i => i.Order).HasForeignKey(i => i.OrderId);
        });

        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.HasKey(e => e.Id);
        });
    }
}

// Data/WriteDbContext.cs - Context for write operations
public class WriteDbContext : BaseDbContext
{
    public WriteDbContext(DbContextOptions<WriteDbContext> options) : base(options) { }
}

// Data/ReadDbContext.cs - Context for read operations
public class ReadDbContext : BaseDbContext
{
    public ReadDbContext(DbContextOptions<ReadDbContext> options) : base(options) { }
}
```

Register both contexts in dependency injection:

```csharp
// Program.cs - Register read and write contexts
var builder = WebApplication.CreateBuilder(args);

// Write context connects to the primary database
builder.Services.AddDbContext<WriteDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("Primary"),
        sql =>
        {
            sql.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), null);
        }));

// Read context connects to the read replica
builder.Services.AddDbContext<ReadDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("ReadOnly"),
        sql =>
        {
            sql.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), null);
        })
    // Disable change tracking for read-only context for better performance
    .UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking));
```

## Using Read/Write Contexts in Services

```csharp
// Services/ProductService.cs - Service using both read and write contexts
using Microsoft.EntityFrameworkCore;
using ReadReplicaDemo.Data;

namespace ReadReplicaDemo.Services;

public class ProductService
{
    private readonly ReadDbContext _readDb;
    private readonly WriteDbContext _writeDb;

    public ProductService(ReadDbContext readDb, WriteDbContext writeDb)
    {
        _readDb = readDb;
        _writeDb = writeDb;
    }

    // Read operations go to the replica
    public async Task<List<Product>> GetProductsAsync(string? category = null)
    {
        var query = _readDb.Products.AsQueryable();

        if (!string.IsNullOrEmpty(category))
        {
            query = query.Where(p => p.Category == category);
        }

        return await query
            .OrderBy(p => p.Name)
            .ToListAsync();
    }

    // This read goes to the replica - good for dashboards and reports
    public async Task<ProductStats> GetStatsAsync()
    {
        var stats = await _readDb.Products
            .GroupBy(p => p.Category)
            .Select(g => new CategoryStat
            {
                Category = g.Key,
                Count = g.Count(),
                AvgPrice = g.Average(p => p.Price),
                TotalStock = g.Sum(p => p.StockQuantity),
            })
            .ToListAsync();

        return new ProductStats
        {
            TotalProducts = await _readDb.Products.CountAsync(),
            Categories = stats,
        };
    }

    // Write operations go to the primary
    public async Task<Product> CreateProductAsync(CreateProductDto dto)
    {
        var product = new Product
        {
            Name = dto.Name,
            Description = dto.Description,
            Price = dto.Price,
            Category = dto.Category,
            StockQuantity = dto.StockQuantity,
            CreatedAt = DateTime.UtcNow,
        };

        _writeDb.Products.Add(product);
        await _writeDb.SaveChangesAsync();

        return product;
    }

    // For read-after-write scenarios, use the primary to avoid replication lag
    public async Task<Product> CreateAndReturnAsync(CreateProductDto dto)
    {
        var product = await CreateProductAsync(dto);

        // Read from the PRIMARY to ensure we get the just-written data
        return await _writeDb.Products
            .FirstAsync(p => p.Id == product.Id);
    }

    // Update operations go to the primary
    public async Task<bool> UpdateStockAsync(int productId, int quantity)
    {
        var product = await _writeDb.Products.FindAsync(productId);
        if (product == null) return false;

        product.StockQuantity = quantity;
        await _writeDb.SaveChangesAsync();
        return true;
    }
}
```

## Interceptor-Based Approach

If you want extra protection around a read-only context, you can use an interceptor to prevent accidental writes. Avoid switching a `DbCommand` connection string inside `ReaderExecuting`; at that point EF Core has already prepared the command for the current connection, and changing the connection can leak the read-only connection into later write operations on the same context.

```csharp
// Interceptors/ReadOnlyCommandInterceptor.cs - Guard a read-only context
using Microsoft.EntityFrameworkCore.Diagnostics;
using System.Data.Common;
using System.Text.RegularExpressions;

namespace ReadReplicaDemo.Interceptors;

public class ReadOnlyCommandInterceptor : DbCommandInterceptor
{
    private static readonly Regex WriteCommandPattern = new(
        @"^\s*(?:(?:--[^\r\n]*(?:\r?\n|$))|(?:/\*.*?\*/\s*)|(?:SET\s+[^;]+;\s*))*\s*(INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|TRUNCATE|EXEC|EXECUTE)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.Singleline);

    public override InterceptionResult<DbDataReader> ReaderExecuting(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<DbDataReader> result)
    {
        EnsureReadOnly(command);
        return result;
    }

    public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<DbDataReader> result,
        CancellationToken cancellationToken = default)
    {
        EnsureReadOnly(command);
        return ValueTask.FromResult(result);
    }

    public override InterceptionResult<int> NonQueryExecuting(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<int> result)
    {
        EnsureReadOnly(command);
        return result;
    }

    public override ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        EnsureReadOnly(command);
        return ValueTask.FromResult(result);
    }

    public override InterceptionResult<object> ScalarExecuting(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<object> result)
    {
        EnsureReadOnly(command);
        return result;
    }

    public override ValueTask<InterceptionResult<object>> ScalarExecutingAsync(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<object> result,
        CancellationToken cancellationToken = default)
    {
        EnsureReadOnly(command);
        return ValueTask.FromResult(result);
    }

    private static void EnsureReadOnly(DbCommand command)
    {
        if (WriteCommandPattern.IsMatch(command.CommandText))
            throw new InvalidOperationException("Write command attempted on a read-only DbContext.");
    }
}
```

## Monitoring Replica Lag

Keep an eye on replication lag to make sure reads from the replica are reasonably fresh:

```csharp
// Services/ReplicaHealthCheck.cs - Monitor replication lag
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace ReadReplicaDemo.Services;

public class ReplicaHealthCheck : IHealthCheck
{
    private readonly string _readOnlyConnectionString;
    private const int MaxAcceptableLagSeconds = 5;

    public ReplicaHealthCheck(IConfiguration configuration)
    {
        _readOnlyConnectionString = configuration.GetConnectionString("ReadOnly")!;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            using var connection = new SqlConnection(_readOnlyConnectionString);
            await connection.OpenAsync(cancellationToken);

            // Query the replica's redo queue as an indicator of data propagation latency
            using var command = new SqlCommand(
                """
                SELECT redo_queue_size, redo_rate
                FROM sys.dm_database_replica_states
                WHERE is_local = 1
                """, connection);

            using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                return HealthCheckResult.Degraded("Replica state is not available");
            }

            var redoQueueSizeKb = reader.GetInt64(0);
            var redoRateKbPerSecond = reader.IsDBNull(1) ? 0 : reader.GetInt64(1);
            if (redoQueueSizeKb > 0 && redoRateKbPerSecond == 0)
            {
                return HealthCheckResult.Degraded("Read replica has a redo queue but no current redo rate");
            }

            var estimatedLagSeconds = redoRateKbPerSecond > 0
                ? redoQueueSizeKb / redoRateKbPerSecond
                : 0;

            if (estimatedLagSeconds > MaxAcceptableLagSeconds)
            {
                return HealthCheckResult.Degraded(
                    $"Read replica estimated redo lag is {estimatedLagSeconds}s (threshold: {MaxAcceptableLagSeconds}s)");
            }

            return HealthCheckResult.Healthy($"Read replica estimated redo lag: {estimatedLagSeconds}s");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Cannot connect to read replica", ex);
        }
    }
}
```

## Wrapping Up

Read replicas are one of the most effective ways to scale a read-heavy application without rewriting your data access layer. Azure SQL handles the replication automatically - you just add `ApplicationIntent=ReadOnly` to your connection string and eligible read-scale-out connections go to a replica. The dual-context pattern in Entity Framework Core makes it explicit which operations hit the primary and which hit the replica, reducing the chance of accidentally writing through the read context. Watch out for the replication lag in read-after-write scenarios, and monitor the lag to catch any synchronization issues early. For applications where reads outnumber writes by 10:1 or more, this pattern can significantly reduce the load on your primary database and improve overall application responsiveness.
