# How to Optimize Entity Framework Core Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: .NET, Entity Framework Core, Performance, C#, Database, SQL

Description: Learn practical techniques to optimize Entity Framework Core queries for better performance, including query optimization, proper loading strategies, and avoiding common performance pitfalls.

---

Entity Framework Core makes database access convenient, but that convenience can hide performance problems. A simple-looking LINQ query might generate inefficient SQL, load too much data, or execute multiple database roundtrips. Understanding how EF Core translates your code to SQL is essential for building performant applications.

## Understanding the N+1 Problem

The most common EF Core performance issue is the N+1 query problem:

```csharp
// This looks innocent but causes N+1 queries
var orders = await context.Orders.ToListAsync();

foreach (var order in orders)
{
    // Each access triggers a separate database query!
    Console.WriteLine($"Order {order.Id}: {order.Customer.Name}");
}
```

If you have 100 orders, this code executes 101 queries: one for orders and one for each customer. The fix is eager loading:

```csharp
// Include loads related data in a single query
var orders = await context.Orders
    .Include(o => o.Customer)
    .ToListAsync();

foreach (var order in orders)
{
    // No additional queries - Customer is already loaded
    Console.WriteLine($"Order {order.Id}: {order.Customer.Name}");
}
```

## Choosing the Right Loading Strategy

EF Core offers three loading strategies:

| Strategy | When to Use | Syntax |
|----------|-------------|--------|
| Eager Loading | You know you need related data | `.Include()` |
| Explicit Loading | Conditional loading after the fact | `.Entry().Reference().Load()` |
| Lazy Loading | Rarely recommended | Enable in DbContext |

```csharp
// Eager loading - single query with JOIN
var order = await context.Orders
    .Include(o => o.Customer)
    .Include(o => o.Items)
        .ThenInclude(i => i.Product)
    .FirstOrDefaultAsync(o => o.Id == orderId);

// Explicit loading - load related data when needed
var order = await context.Orders.FindAsync(orderId);
if (order != null && needCustomerDetails)
{
    await context.Entry(order)
        .Reference(o => o.Customer)
        .LoadAsync();
}
```

## Projecting Only What You Need

Loading entire entities when you only need a few fields wastes memory and bandwidth:

```csharp
// Bad: loads all columns and creates entity tracking overhead
var customers = await context.Customers.ToListAsync();
var names = customers.Select(c => c.Name);

// Good: projects only needed columns, no tracking overhead
var names = await context.Customers
    .Select(c => c.Name)
    .ToListAsync();

// Better: project to a DTO for complex scenarios
var orderSummaries = await context.Orders
    .Select(o => new OrderSummaryDto
    {
        OrderId = o.Id,
        CustomerName = o.Customer.Name,
        TotalAmount = o.Items.Sum(i => i.Quantity * i.UnitPrice),
        ItemCount = o.Items.Count
    })
    .ToListAsync();
```

## Disabling Change Tracking

If you are only reading data, disable change tracking:

```csharp
// Query-level: No tracking for this specific query
var products = await context.Products
    .AsNoTracking()
    .Where(p => p.CategoryId == categoryId)
    .ToListAsync();

// DbContext-level: Disable tracking for all queries in this context
context.ChangeTracker.QueryTrackingBehavior = QueryTrackingBehavior.NoTracking;

// Or configure in DbContext options
services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlServer(connectionString);
    options.UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking);
});
```

## Using Compiled Queries

For frequently executed queries, compiled queries eliminate parsing overhead:

```csharp
public class ProductRepository
{
    // Compile the query once, reuse many times
    private static readonly Func<AppDbContext, int, Task<Product?>> GetProductById =
        EF.CompileAsyncQuery(
            (AppDbContext context, int productId) =>
                context.Products
                    .Include(p => p.Category)
                    .FirstOrDefault(p => p.Id == productId));

    private static readonly Func<AppDbContext, string, IAsyncEnumerable<Product>> GetProductsByCategory =
        EF.CompileAsyncQuery(
            (AppDbContext context, string categoryName) =>
                context.Products
                    .Where(p => p.Category.Name == categoryName));

    private readonly AppDbContext _context;

    public ProductRepository(AppDbContext context)
    {
        _context = context;
    }

    public Task<Product?> GetByIdAsync(int id)
    {
        return GetProductById(_context, id);
    }

    public async Task<List<Product>> GetByCategoryAsync(string categoryName)
    {
        var products = new List<Product>();
        await foreach (var product in GetProductsByCategory(_context, categoryName))
        {
            products.Add(product);
        }
        return products;
    }
}
```

## Efficient Pagination

Pagination should happen in the database, not in memory:

```csharp
// Bad: loads all records, then paginates in memory
var allOrders = await context.Orders.ToListAsync();
var page = allOrders.Skip(skip).Take(pageSize);

// Good: pagination happens in SQL
var orders = await context.Orders
    .OrderBy(o => o.CreatedAt)
    .Skip(skip)
    .Take(pageSize)
    .ToListAsync();

// Even better: use keyset pagination for large datasets
var orders = await context.Orders
    .Where(o => o.Id > lastSeenId)
    .OrderBy(o => o.Id)
    .Take(pageSize)
    .ToListAsync();
```

Keyset pagination (also called cursor-based pagination) performs better on large tables because it does not require counting rows to skip.

## Batch Operations

Avoid loading entities just to update or delete them:

```csharp
// Bad: loads entity to delete it
var product = await context.Products.FindAsync(productId);
if (product != null)
{
    context.Products.Remove(product);
    await context.SaveChangesAsync();
}

// Good: delete without loading (EF Core 7+)
await context.Products
    .Where(p => p.Id == productId)
    .ExecuteDeleteAsync();

// Batch update without loading
await context.Products
    .Where(p => p.CategoryId == oldCategoryId)
    .ExecuteUpdateAsync(setters => setters
        .SetProperty(p => p.CategoryId, newCategoryId)
        .SetProperty(p => p.UpdatedAt, DateTime.UtcNow));
```

## Splitting Large Queries

Complex queries with multiple Includes can create massive SQL with many JOINs. Split them:

```csharp
// This might create a cartesian explosion
var order = await context.Orders
    .Include(o => o.Items)
    .Include(o => o.Payments)
    .Include(o => o.ShippingInfo)
    .FirstOrDefaultAsync(o => o.Id == orderId);

// Better: split into separate queries
var order = await context.Orders
    .AsSplitQuery()
    .Include(o => o.Items)
    .Include(o => o.Payments)
    .Include(o => o.ShippingInfo)
    .FirstOrDefaultAsync(o => o.Id == orderId);
```

Split queries execute separate SQL statements instead of one large JOIN, which can be more efficient when related collections have many rows.

## Using Raw SQL When Needed

Sometimes LINQ cannot express what you need efficiently:

```csharp
// Complex reporting query is clearer in SQL
var monthlySales = await context.Database
    .SqlQuery<MonthlySalesReport>($@"
        SELECT
            DATEPART(YEAR, o.CreatedAt) AS Year,
            DATEPART(MONTH, o.CreatedAt) AS Month,
            COUNT(DISTINCT o.Id) AS OrderCount,
            SUM(oi.Quantity * oi.UnitPrice) AS TotalRevenue
        FROM Orders o
        INNER JOIN OrderItems oi ON o.Id = oi.OrderId
        WHERE o.Status = 'Completed'
        GROUP BY DATEPART(YEAR, o.CreatedAt), DATEPART(MONTH, o.CreatedAt)
        ORDER BY Year DESC, Month DESC")
    .ToListAsync();

// Parameterized query to prevent SQL injection
var categoryId = 5;
var products = await context.Products
    .FromSqlInterpolated($"SELECT * FROM Products WHERE CategoryId = {categoryId}")
    .ToListAsync();
```

## Indexing Strategies

Query optimization starts at the database level:

```csharp
// Configure indexes in your entity configuration
public class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.ToTable("Orders");

        // Index on frequently filtered column
        builder.HasIndex(o => o.CustomerId);

        // Composite index for common query patterns
        builder.HasIndex(o => new { o.Status, o.CreatedAt });

        // Filtered index for partial data
        builder.HasIndex(o => o.CreatedAt)
            .HasFilter("[Status] = 'Pending'");

        // Include columns to avoid key lookups
        builder.HasIndex(o => o.CustomerId)
            .IncludeProperties(o => new { o.Status, o.TotalAmount });
    }
}
```

## Monitoring Query Performance

Enable query logging to see what SQL EF Core generates:

```csharp
// Program.cs - Development logging
services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlServer(connectionString);

    if (environment.IsDevelopment())
    {
        options.EnableSensitiveDataLogging();
        options.EnableDetailedErrors();
        options.LogTo(Console.WriteLine, LogLevel.Information);
    }
});

// Or use interceptors for production monitoring
public class QueryPerformanceInterceptor : DbCommandInterceptor
{
    private readonly ILogger<QueryPerformanceInterceptor> _logger;

    public QueryPerformanceInterceptor(ILogger<QueryPerformanceInterceptor> logger)
    {
        _logger = logger;
    }

    public override async ValueTask<DbDataReader> ReaderExecutedAsync(
        DbCommand command,
        CommandExecutedEventData eventData,
        DbDataReader result,
        CancellationToken cancellationToken = default)
    {
        if (eventData.Duration.TotalMilliseconds > 100)
        {
            _logger.LogWarning(
                "Slow query detected ({Duration}ms): {CommandText}",
                eventData.Duration.TotalMilliseconds,
                command.CommandText);
        }

        return result;
    }
}
```

## Query Filters for Multi-Tenancy

Global query filters ensure tenant isolation without cluttering every query:

```csharp
public class AppDbContext : DbContext
{
    private readonly ITenantService _tenantService;

    public AppDbContext(
        DbContextOptions<AppDbContext> options,
        ITenantService tenantService) : base(options)
    {
        _tenantService = tenantService;
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Automatically filter by tenant
        modelBuilder.Entity<Order>()
            .HasQueryFilter(o => o.TenantId == _tenantService.CurrentTenantId);

        modelBuilder.Entity<Product>()
            .HasQueryFilter(p => p.TenantId == _tenantService.CurrentTenantId);

        // Soft delete filter
        modelBuilder.Entity<Customer>()
            .HasQueryFilter(c => !c.IsDeleted);
    }
}

// Bypass filter when needed
var allCustomers = await context.Customers
    .IgnoreQueryFilters()
    .ToListAsync();
```

## Summary

| Optimization | Impact | Difficulty |
|--------------|--------|------------|
| Fix N+1 with Include | High | Low |
| Project to DTOs | High | Low |
| Disable tracking for reads | Medium | Low |
| Use compiled queries | Medium | Medium |
| Batch operations | High | Low |
| Proper pagination | High | Low |
| Add indexes | High | Medium |

Entity Framework Core is powerful, but power without understanding leads to problems. Always check the generated SQL, especially for queries that run frequently or handle large datasets. Use the techniques shown here to write queries that are both readable and performant. Start with the low-hanging fruit like fixing N+1 queries and adding proper projections before moving to more advanced optimizations.
