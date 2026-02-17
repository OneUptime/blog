# How to Implement Connection Resiliency with Entity Framework Core and Azure SQL Database

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Entity Framework Core, Azure SQL, Resiliency, .NET, Database, Retry Logic, Cloud

Description: Implement connection resiliency patterns with Entity Framework Core and Azure SQL Database to handle transient faults gracefully.

---

Cloud databases are not like the PostgreSQL instance running on your local machine. Azure SQL Database connections cross network boundaries, pass through load balancers, and occasionally hit transient failures - brief connectivity issues that resolve themselves in seconds. Without retry logic, these transient faults cause your application to throw errors that confuse users and fill your logs with noise. Entity Framework Core has built-in support for connection resiliency through its execution strategy system, and configuring it properly is one of the most impactful things you can do for your Azure-hosted application.

## What Are Transient Faults

Transient faults are temporary errors that go away on their own. In Azure SQL Database, these include:

- Connection timeouts during failover events
- Brief network interruptions between your application and the database
- Throttling when the database reaches resource limits
- Connection pool exhaustion during traffic spikes

The key characteristic is that retrying the operation after a short wait usually succeeds. Your application needs to handle these gracefully instead of immediately failing.

## Prerequisites

- .NET 8 SDK
- An Azure SQL Database
- Basic Entity Framework Core knowledge

## Basic Retry Configuration

The simplest way to add retry logic is through the `EnableRetryOnFailure` option when configuring your DbContext:

```csharp
// Program.cs - Basic retry configuration
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlServerOptions =>
        {
            // Enable automatic retry on transient failures
            sqlServerOptions.EnableRetryOnFailure(
                maxRetryCount: 5,           // Retry up to 5 times
                maxRetryDelay: TimeSpan.FromSeconds(30),  // Maximum delay between retries
                errorNumbersToAdd: null     // Use the default set of transient error codes
            );
        }));
```

This tells EF Core to automatically retry failed operations up to five times, with an exponential backoff delay between attempts. The default list of transient error codes covers the most common Azure SQL transient failures.

## Custom Execution Strategy

For more control over retry behavior, create a custom execution strategy:

```csharp
// Data/CustomAzureSqlExecutionStrategy.cs - Custom retry strategy
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace MigrationDemo.Data;

public class CustomAzureSqlExecutionStrategy : SqlServerRetryingExecutionStrategy
{
    // Additional SQL error numbers that should trigger retries
    private static readonly int[] AdditionalTransientErrors = new[]
    {
        49918,  // Cannot process request. Not enough resources to process request
        49919,  // Cannot process create or update request
        49920,  // Cannot process request due to too many operations in progress
        4221,   // Login to read-secondary failed due to long wait on HADR synchronization
        615,    // Could not find database ID
    };

    public CustomAzureSqlExecutionStrategy(
        DbContext context,
        int maxRetryCount = 6,
        TimeSpan? maxRetryDelay = null)
        : base(
            context,
            maxRetryCount,
            maxRetryDelay ?? TimeSpan.FromSeconds(30),
            AdditionalTransientErrors)
    {
    }

    public CustomAzureSqlExecutionStrategy(
        ExecutionStrategyDependencies dependencies,
        int maxRetryCount = 6,
        TimeSpan? maxRetryDelay = null)
        : base(
            dependencies,
            maxRetryCount,
            maxRetryDelay ?? TimeSpan.FromSeconds(30),
            AdditionalTransientErrors)
    {
    }

    // Override to add custom logging or telemetry
    protected override void OnRetry()
    {
        base.OnRetry();
        // Log the retry attempt for monitoring
        Console.WriteLine(
            $"[EF Retry] Attempt {ExceptionsEncountered.Count} " +
            $"after error: {ExceptionsEncountered.Last().Message}");
    }

    // Override to customize which errors are considered transient
    protected override bool ShouldRetryOn(Exception exception)
    {
        // Call the base implementation first
        if (base.ShouldRetryOn(exception))
        {
            return true;
        }

        // Add custom checks for other exception types
        if (exception is TimeoutException)
        {
            return true;
        }

        return false;
    }
}
```

Register the custom strategy:

```csharp
// Program.cs - Using the custom execution strategy
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlServerOptions =>
        {
            // Use our custom execution strategy
            sqlServerOptions.ExecutionStrategy(
                deps => new CustomAzureSqlExecutionStrategy(deps, maxRetryCount: 6));
        }));
```

## Handling Transactions with Retry Logic

One important constraint: EF Core's retry logic does not automatically wrap user-initiated transactions. If a retry happens mid-transaction, the entire transaction needs to be replayed. Use the `CreateExecutionStrategy` method for explicit transactions:

```csharp
// Services/OrderService.cs - Resilient transaction handling
using Microsoft.EntityFrameworkCore;

namespace MigrationDemo.Services;

public class OrderService
{
    private readonly AppDbContext _context;

    public OrderService(AppDbContext context)
    {
        _context = context;
    }

    // Create an order with items in a resilient transaction
    public async Task<Order> CreateOrderAsync(CreateOrderDto dto)
    {
        // Get the execution strategy
        var strategy = _context.Database.CreateExecutionStrategy();

        // Execute the entire operation within the strategy
        // If a transient failure occurs, the whole block is retried
        return await strategy.ExecuteAsync(async () =>
        {
            // Start a transaction
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // Create the order
                var order = new Order
                {
                    CustomerId = dto.CustomerId,
                    OrderDate = DateTime.UtcNow,
                    Status = "Pending",
                };

                _context.Orders.Add(order);
                await _context.SaveChangesAsync();

                // Add order items and update stock
                foreach (var item in dto.Items)
                {
                    var product = await _context.Products.FindAsync(item.ProductId);
                    if (product == null)
                        throw new InvalidOperationException($"Product {item.ProductId} not found");

                    if (product.StockQuantity < item.Quantity)
                        throw new InvalidOperationException($"Insufficient stock for {product.Name}");

                    // Reduce stock
                    product.StockQuantity -= item.Quantity;

                    // Add the line item
                    _context.OrderItems.Add(new OrderItem
                    {
                        OrderId = order.Id,
                        ProductId = item.ProductId,
                        Quantity = item.Quantity,
                        UnitPrice = product.Price,
                    });
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return order;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        });
    }
}
```

## Connection Pool Configuration

Retry logic helps with transient failures, but proper connection pool settings prevent many issues from happening in the first place:

```csharp
// Program.cs - Optimized connection string for Azure SQL
var connectionString = new SqlConnectionStringBuilder(
    builder.Configuration.GetConnectionString("DefaultConnection"))
{
    // Connection pool settings
    MinPoolSize = 5,           // Keep at least 5 connections ready
    MaxPoolSize = 100,         // Allow up to 100 connections
    ConnectTimeout = 30,       // Timeout for establishing new connections
    CommandTimeout = 30,       // Timeout for executing commands

    // Azure SQL specific settings
    Encrypt = true,            // Always encrypt for Azure SQL
    TrustServerCertificate = false,
    MultipleActiveResultSets = true,

    // Connection resiliency
    ConnectRetryCount = 3,     // ADO.NET level retries
    ConnectRetryInterval = 10, // Seconds between ADO.NET retries
}.ConnectionString;

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString, sqlOptions =>
    {
        sqlOptions.EnableRetryOnFailure(5, TimeSpan.FromSeconds(30), null);
        sqlOptions.CommandTimeout(30);
    }));
```

## Circuit Breaker Pattern

For cases where the database is down for an extended period, add a circuit breaker to prevent retry storms:

```csharp
// Services/ResilientDbService.cs - Circuit breaker for database operations
using System.Collections.Concurrent;

namespace MigrationDemo.Services;

public class CircuitBreaker
{
    private enum State { Closed, Open, HalfOpen }

    private State _state = State.Closed;
    private int _failureCount;
    private DateTime _lastFailureTime;
    private readonly int _failureThreshold;
    private readonly TimeSpan _openDuration;
    private readonly object _lock = new();

    public CircuitBreaker(int failureThreshold = 5, int openDurationSeconds = 60)
    {
        _failureThreshold = failureThreshold;
        _openDuration = TimeSpan.FromSeconds(openDurationSeconds);
    }

    // Execute an operation through the circuit breaker
    public async Task<T> ExecuteAsync<T>(Func<Task<T>> operation)
    {
        lock (_lock)
        {
            if (_state == State.Open)
            {
                // Check if enough time has passed to try again
                if (DateTime.UtcNow - _lastFailureTime > _openDuration)
                {
                    _state = State.HalfOpen;
                }
                else
                {
                    throw new InvalidOperationException(
                        "Circuit breaker is open. Database operations are temporarily disabled.");
                }
            }
        }

        try
        {
            var result = await operation();

            lock (_lock)
            {
                // Reset on success
                _failureCount = 0;
                _state = State.Closed;
            }

            return result;
        }
        catch (Exception)
        {
            lock (_lock)
            {
                _failureCount++;
                _lastFailureTime = DateTime.UtcNow;

                if (_failureCount >= _failureThreshold)
                {
                    _state = State.Open;
                }
            }

            throw;
        }
    }
}
```

## Monitoring Retries

Track retry events to understand how often transient failures occur:

```csharp
// Interceptors/RetryLoggingInterceptor.cs - Log retries for monitoring
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;

namespace MigrationDemo.Interceptors;

public class RetryLoggingInterceptor : DbCommandInterceptor
{
    private readonly ILogger<RetryLoggingInterceptor> _logger;

    public RetryLoggingInterceptor(ILogger<RetryLoggingInterceptor> logger)
    {
        _logger = logger;
    }

    public override void CommandFailed(DbCommand command, CommandErrorEventData eventData)
    {
        _logger.LogWarning(
            eventData.Exception,
            "Database command failed. Duration: {Duration}ms. Command: {Command}",
            eventData.Duration.TotalMilliseconds,
            command.CommandText[..Math.Min(200, command.CommandText.Length)]);

        base.CommandFailed(command, eventData);
    }
}
```

## Wrapping Up

Connection resiliency is not optional for Azure SQL Database applications. Transient faults happen in the cloud, and without retry logic, your application surfaces those faults as user-visible errors. EF Core's built-in execution strategy handles most cases with a one-line configuration. For transactions, you need to wrap the entire operation in an execution strategy callback so the whole transaction gets retried as a unit. Add proper connection pool settings to prevent pool exhaustion, and consider a circuit breaker for extended outages. These patterns together make your application robust against the realities of cloud database connectivity.
