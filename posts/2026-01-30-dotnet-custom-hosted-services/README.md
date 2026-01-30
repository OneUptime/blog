# How to Build Custom Hosted Services in .NET

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: CSharp, .NET, Background Services, Architecture

Description: Create background services in .NET using IHostedService and BackgroundService for long-running tasks, queue processing, and scheduled jobs.

---

Background services are essential for any production application. Whether you need to process messages from a queue, run scheduled cleanup tasks, or monitor system health, .NET provides robust abstractions for building these services. This post walks through building custom hosted services from scratch, covering everything from the basic interface to production-ready implementations.

## Understanding the Hosted Service Lifecycle

Before writing code, let's understand how hosted services fit into the .NET application lifecycle. When your application starts, the host calls `StartAsync` on all registered hosted services. When the application shuts down (whether from SIGTERM, Ctrl+C, or programmatic stop), the host calls `StopAsync` on each service.

| Lifecycle Event | Method Called | Typical Use |
|----------------|---------------|-------------|
| Application Start | `StartAsync` | Initialize resources, start background loops |
| Application Stop | `StopAsync` | Cancel operations, flush buffers, cleanup |
| Cancellation Requested | CancellationToken triggers | Stop processing gracefully |

## The IHostedService Interface

The `IHostedService` interface is the foundation for all background services in .NET. It defines two methods that control the service lifecycle.

```csharp
public interface IHostedService
{
    Task StartAsync(CancellationToken cancellationToken);
    Task StopAsync(CancellationToken cancellationToken);
}
```

Here is a minimal implementation that logs when it starts and stops.

```csharp
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

public class SimpleHostedService : IHostedService
{
    private readonly ILogger<SimpleHostedService> _logger;

    public SimpleHostedService(ILogger<SimpleHostedService> logger)
    {
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("SimpleHostedService started at {Time}", DateTimeOffset.Now);
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("SimpleHostedService stopped at {Time}", DateTimeOffset.Now);
        return Task.CompletedTask;
    }
}
```

Register the service in your `Program.cs` file.

```csharp
var builder = WebApplication.CreateBuilder(args);

// Register the hosted service
builder.Services.AddHostedService<SimpleHostedService>();

var app = builder.Build();
app.Run();
```

## Building a Timed Background Service

Most background services need to perform work repeatedly on a schedule. Here is an implementation that executes a task every 30 seconds.

```csharp
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

public class TimedHostedService : IHostedService, IDisposable
{
    private readonly ILogger<TimedHostedService> _logger;
    private Timer? _timer;

    public TimedHostedService(ILogger<TimedHostedService> logger)
    {
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Timed Hosted Service starting");

        // Create a timer that fires every 30 seconds
        // The first parameter is the callback method
        // The second parameter is state (null here)
        // The third parameter is the initial delay (0 = start immediately)
        // The fourth parameter is the interval between executions
        _timer = new Timer(
            callback: DoWork,
            state: null,
            dueTime: TimeSpan.Zero,
            period: TimeSpan.FromSeconds(30)
        );

        return Task.CompletedTask;
    }

    private void DoWork(object? state)
    {
        _logger.LogInformation("Timed Hosted Service executing at {Time}", DateTimeOffset.Now);

        // Your background work goes here
        // Be careful: this runs on a ThreadPool thread
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Timed Hosted Service stopping");

        // Stop the timer from firing
        _timer?.Change(Timeout.Infinite, 0);

        return Task.CompletedTask;
    }

    public void Dispose()
    {
        _timer?.Dispose();
    }
}
```

## The BackgroundService Base Class

For long-running background tasks, the `BackgroundService` base class simplifies implementation. It handles the boilerplate of managing a background task and provides a single `ExecuteAsync` method to override.

```csharp
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

public class LongRunningService : BackgroundService
{
    private readonly ILogger<LongRunningService> _logger;

    public LongRunningService(ILogger<LongRunningService> logger)
    {
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("LongRunningService started");

        // Keep running until cancellation is requested
        while (!stoppingToken.IsCancellationRequested)
        {
            _logger.LogInformation("Worker running at {Time}", DateTimeOffset.Now);

            try
            {
                // Perform your background work here
                await DoWorkAsync(stoppingToken);

                // Wait before the next iteration
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                // Expected during shutdown, don't log as error
                _logger.LogInformation("Service cancellation requested");
            }
            catch (Exception ex)
            {
                // Log unexpected errors but keep the service running
                _logger.LogError(ex, "Error occurred in background service");

                // Wait before retrying to avoid tight error loops
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
            }
        }

        _logger.LogInformation("LongRunningService stopped");
    }

    private async Task DoWorkAsync(CancellationToken cancellationToken)
    {
        // Simulate some work
        await Task.Delay(100, cancellationToken);
    }
}
```

## Comparison: IHostedService vs BackgroundService

| Feature | IHostedService | BackgroundService |
|---------|---------------|-------------------|
| Implementation complexity | More code required | Less boilerplate |
| Control over lifecycle | Full control | Simplified |
| Background task management | Manual | Automatic |
| Best for | Short initialization, timers | Long-running loops |
| Cancellation handling | Manual | Built-in |

## Handling Graceful Shutdown

Proper shutdown handling prevents data loss and ensures clean resource cleanup. The cancellation token passed to your methods signals when shutdown begins.

```csharp
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

public class GracefulShutdownService : BackgroundService
{
    private readonly ILogger<GracefulShutdownService> _logger;
    private readonly List<string> _pendingItems = new();
    private readonly SemaphoreSlim _lock = new(1, 1);

    public GracefulShutdownService(ILogger<GracefulShutdownService> logger)
    {
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Service starting, registering shutdown handler");

        // Register for the application stopping event for additional cleanup
        stoppingToken.Register(() =>
        {
            _logger.LogInformation("Shutdown signal received, beginning graceful shutdown");
        });

        while (!stoppingToken.IsCancellationRequested)
        {
            await ProcessNextItemAsync(stoppingToken);
            await Task.Delay(1000, stoppingToken);
        }

        // Perform final cleanup after the loop exits
        await FlushPendingItemsAsync();
    }

    private async Task ProcessNextItemAsync(CancellationToken cancellationToken)
    {
        await _lock.WaitAsync(cancellationToken);
        try
        {
            // Simulate adding work items
            _pendingItems.Add($"Item-{Guid.NewGuid():N}");

            if (_pendingItems.Count >= 10)
            {
                await FlushPendingItemsAsync();
            }
        }
        finally
        {
            _lock.Release();
        }
    }

    private async Task FlushPendingItemsAsync()
    {
        await _lock.WaitAsync();
        try
        {
            if (_pendingItems.Count > 0)
            {
                _logger.LogInformation("Flushing {Count} pending items", _pendingItems.Count);

                // Simulate writing to database or external service
                await Task.Delay(100);

                _pendingItems.Clear();
                _logger.LogInformation("Flush complete");
            }
        }
        finally
        {
            _lock.Release();
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("StopAsync called, waiting for graceful shutdown");

        // Call base implementation which cancels ExecuteAsync
        await base.StopAsync(cancellationToken);

        // Additional cleanup if needed
        _lock.Dispose();

        _logger.LogInformation("Graceful shutdown complete");
    }
}
```

## Using Scoped Services in Hosted Services

Hosted services are registered as singletons, but sometimes you need to use scoped services like Entity Framework's `DbContext`. Create a scope manually to access scoped dependencies.

```csharp
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

public class ScopedProcessingService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ScopedProcessingService> _logger;

    public ScopedProcessingService(
        IServiceProvider serviceProvider,
        ILogger<ScopedProcessingService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Scoped Processing Service starting");

        while (!stoppingToken.IsCancellationRequested)
        {
            // Create a new scope for each iteration
            // This ensures scoped services are properly disposed
            using (var scope = _serviceProvider.CreateScope())
            {
                var scopedService = scope.ServiceProvider
                    .GetRequiredService<IScopedProcessingService>();

                await scopedService.ProcessAsync(stoppingToken);
            }

            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
        }
    }
}

// Interface for the scoped service
public interface IScopedProcessingService
{
    Task ProcessAsync(CancellationToken cancellationToken);
}

// Implementation that uses scoped dependencies like DbContext
public class DatabaseProcessingService : IScopedProcessingService
{
    private readonly ILogger<DatabaseProcessingService> _logger;
    // Inject your DbContext or other scoped services here

    public DatabaseProcessingService(ILogger<DatabaseProcessingService> logger)
    {
        _logger = logger;
    }

    public async Task ProcessAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Processing database records");

        // Your database operations here
        // The DbContext will be properly scoped and disposed

        await Task.Delay(100, cancellationToken);
    }
}
```

Register both services in `Program.cs`.

```csharp
var builder = WebApplication.CreateBuilder(args);

// Register the scoped service
builder.Services.AddScoped<IScopedProcessingService, DatabaseProcessingService>();

// Register the hosted service
builder.Services.AddHostedService<ScopedProcessingService>();

var app = builder.Build();
app.Run();
```

## Queue-Based Background Processing

For work that arrives unpredictably, a queue-based approach decouples work production from consumption. Here is a complete implementation of a background task queue.

First, define the queue interface and implementation.

```csharp
using System.Threading.Channels;

// Represents a unit of background work
public interface IBackgroundTaskQueue
{
    ValueTask QueueBackgroundWorkItemAsync(Func<CancellationToken, ValueTask> workItem);
    ValueTask<Func<CancellationToken, ValueTask>> DequeueAsync(CancellationToken cancellationToken);
}

public class BackgroundTaskQueue : IBackgroundTaskQueue
{
    private readonly Channel<Func<CancellationToken, ValueTask>> _queue;

    public BackgroundTaskQueue(int capacity = 100)
    {
        // Create a bounded channel to prevent unbounded memory growth
        var options = new BoundedChannelOptions(capacity)
        {
            FullMode = BoundedChannelFullMode.Wait
        };

        _queue = Channel.CreateBounded<Func<CancellationToken, ValueTask>>(options);
    }

    public async ValueTask QueueBackgroundWorkItemAsync(
        Func<CancellationToken, ValueTask> workItem)
    {
        if (workItem == null)
        {
            throw new ArgumentNullException(nameof(workItem));
        }

        await _queue.Writer.WriteAsync(workItem);
    }

    public async ValueTask<Func<CancellationToken, ValueTask>> DequeueAsync(
        CancellationToken cancellationToken)
    {
        var workItem = await _queue.Reader.ReadAsync(cancellationToken);
        return workItem;
    }
}
```

Next, create the worker service that processes queued items.

```csharp
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

public class QueuedHostedService : BackgroundService
{
    private readonly IBackgroundTaskQueue _taskQueue;
    private readonly ILogger<QueuedHostedService> _logger;

    public QueuedHostedService(
        IBackgroundTaskQueue taskQueue,
        ILogger<QueuedHostedService> logger)
    {
        _taskQueue = taskQueue;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Queued Hosted Service starting");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Wait for a work item to be available
                var workItem = await _taskQueue.DequeueAsync(stoppingToken);

                _logger.LogInformation("Processing queued work item");

                // Execute the work item
                await workItem(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                // Expected during shutdown
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred executing queued work item");
            }
        }

        _logger.LogInformation("Queued Hosted Service stopping");
    }
}
```

Here is how to use the queue from an API controller.

```csharp
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class WorkController : ControllerBase
{
    private readonly IBackgroundTaskQueue _taskQueue;
    private readonly ILogger<WorkController> _logger;

    public WorkController(
        IBackgroundTaskQueue taskQueue,
        ILogger<WorkController> logger)
    {
        _taskQueue = taskQueue;
        _logger = logger;
    }

    [HttpPost("enqueue")]
    public async Task<IActionResult> EnqueueWork([FromBody] WorkRequest request)
    {
        // Queue the work to be processed in the background
        await _taskQueue.QueueBackgroundWorkItemAsync(async cancellationToken =>
        {
            _logger.LogInformation("Starting work for request {Id}", request.Id);

            // Simulate long-running work
            await Task.Delay(TimeSpan.FromSeconds(10), cancellationToken);

            _logger.LogInformation("Completed work for request {Id}", request.Id);
        });

        return Accepted(new { Message = "Work queued", RequestId = request.Id });
    }
}

public class WorkRequest
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Data { get; set; } = string.Empty;
}
```

Register the queue and worker in `Program.cs`.

```csharp
var builder = WebApplication.CreateBuilder(args);

// Register the queue as a singleton so all components share the same instance
builder.Services.AddSingleton<IBackgroundTaskQueue>(new BackgroundTaskQueue(capacity: 100));

// Register the worker service
builder.Services.AddHostedService<QueuedHostedService>();

builder.Services.AddControllers();

var app = builder.Build();
app.MapControllers();
app.Run();
```

## Multiple Queue Workers for Parallel Processing

For high-throughput scenarios, run multiple worker instances in parallel.

```csharp
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

public class ParallelQueuedHostedService : BackgroundService
{
    private readonly IBackgroundTaskQueue _taskQueue;
    private readonly ILogger<ParallelQueuedHostedService> _logger;
    private readonly int _workerCount;

    public ParallelQueuedHostedService(
        IBackgroundTaskQueue taskQueue,
        ILogger<ParallelQueuedHostedService> logger,
        int workerCount = 4)
    {
        _taskQueue = taskQueue;
        _logger = logger;
        _workerCount = workerCount;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "Parallel Queue Service starting with {WorkerCount} workers",
            _workerCount);

        // Create multiple worker tasks
        var workers = new Task[_workerCount];

        for (int i = 0; i < _workerCount; i++)
        {
            int workerId = i;
            workers[i] = ProcessQueueAsync(workerId, stoppingToken);
        }

        // Wait for all workers to complete (they run until cancellation)
        await Task.WhenAll(workers);

        _logger.LogInformation("All workers stopped");
    }

    private async Task ProcessQueueAsync(int workerId, CancellationToken stoppingToken)
    {
        _logger.LogInformation("Worker {WorkerId} starting", workerId);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var workItem = await _taskQueue.DequeueAsync(stoppingToken);

                _logger.LogInformation(
                    "Worker {WorkerId} processing item",
                    workerId);

                await workItem(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                // Expected during shutdown
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Worker {WorkerId} error processing item",
                    workerId);
            }
        }

        _logger.LogInformation("Worker {WorkerId} stopped", workerId);
    }
}
```

## Health Checks for Background Services

Production services need health monitoring. Implement health checks that report the status of your background services.

```csharp
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

public class MonitoredBackgroundService : BackgroundService, IHealthCheck
{
    private readonly ILogger<MonitoredBackgroundService> _logger;
    private volatile bool _isRunning;
    private volatile bool _isHealthy = true;
    private DateTime _lastSuccessfulRun = DateTime.MinValue;
    private string _lastError = string.Empty;

    public MonitoredBackgroundService(ILogger<MonitoredBackgroundService> logger)
    {
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _isRunning = true;

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await DoWorkAsync(stoppingToken);

                // Update health status on success
                _lastSuccessfulRun = DateTime.UtcNow;
                _isHealthy = true;
                _lastError = string.Empty;
            }
            catch (OperationCanceledException)
            {
                // Expected during shutdown
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Background service error");
                _isHealthy = false;
                _lastError = ex.Message;
            }

            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }

        _isRunning = false;
    }

    private async Task DoWorkAsync(CancellationToken cancellationToken)
    {
        // Simulate work that might fail
        await Task.Delay(100, cancellationToken);
    }

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        // Check if the service is running
        if (!_isRunning)
        {
            return Task.FromResult(HealthCheckResult.Unhealthy(
                "Background service is not running"));
        }

        // Check if the service has run recently (within last 5 minutes)
        var timeSinceLastRun = DateTime.UtcNow - _lastSuccessfulRun;
        if (timeSinceLastRun > TimeSpan.FromMinutes(5))
        {
            return Task.FromResult(HealthCheckResult.Degraded(
                $"Last successful run was {timeSinceLastRun.TotalMinutes:F1} minutes ago"));
        }

        // Check for recent errors
        if (!_isHealthy)
        {
            return Task.FromResult(HealthCheckResult.Unhealthy(
                $"Service is unhealthy: {_lastError}"));
        }

        return Task.FromResult(HealthCheckResult.Healthy(
            $"Service running normally. Last run: {_lastSuccessfulRun:O}"));
    }
}
```

Register the health check and service together.

```csharp
var builder = WebApplication.CreateBuilder(args);

// Create a single instance to use as both hosted service and health check
var monitoredService = new MonitoredBackgroundService(
    builder.Services.BuildServiceProvider()
        .GetRequiredService<ILogger<MonitoredBackgroundService>>());

// Register as hosted service
builder.Services.AddSingleton<IHostedService>(monitoredService);

// Register the same instance as a health check
builder.Services.AddHealthChecks()
    .AddCheck("background-service", monitoredService);

var app = builder.Build();

// Map health check endpoint
app.MapHealthChecks("/health");

app.Run();
```

## A Better Approach: Health Check Publisher Pattern

For cleaner separation, use a dedicated health check that queries service status.

```csharp
using Microsoft.Extensions.Diagnostics.HealthChecks;

// Interface for services that can report their health
public interface IReportHealth
{
    string ServiceName { get; }
    bool IsHealthy { get; }
    DateTime LastActivity { get; }
    string StatusMessage { get; }
}

// Health check that monitors multiple background services
public class BackgroundServicesHealthCheck : IHealthCheck
{
    private readonly IEnumerable<IReportHealth> _services;

    public BackgroundServicesHealthCheck(IEnumerable<IReportHealth> services)
    {
        _services = services;
    }

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var unhealthyServices = new List<string>();
        var degradedServices = new List<string>();
        var data = new Dictionary<string, object>();

        foreach (var service in _services)
        {
            data[service.ServiceName] = new
            {
                service.IsHealthy,
                service.LastActivity,
                service.StatusMessage
            };

            if (!service.IsHealthy)
            {
                unhealthyServices.Add(service.ServiceName);
            }
            else if (DateTime.UtcNow - service.LastActivity > TimeSpan.FromMinutes(5))
            {
                degradedServices.Add(service.ServiceName);
            }
        }

        if (unhealthyServices.Any())
        {
            return Task.FromResult(HealthCheckResult.Unhealthy(
                $"Unhealthy services: {string.Join(", ", unhealthyServices)}",
                data: data));
        }

        if (degradedServices.Any())
        {
            return Task.FromResult(HealthCheckResult.Degraded(
                $"Degraded services: {string.Join(", ", degradedServices)}",
                data: data));
        }

        return Task.FromResult(HealthCheckResult.Healthy(
            "All background services healthy",
            data: data));
    }
}
```

## Scheduled Tasks with Cron Expressions

For complex scheduling, use cron expressions with the Cronos library.

```csharp
using Cronos;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

public abstract class CronBackgroundService : BackgroundService
{
    private readonly ILogger _logger;
    private readonly CronExpression _cronExpression;
    private readonly TimeZoneInfo _timeZone;

    protected CronBackgroundService(
        string cronExpression,
        ILogger logger,
        TimeZoneInfo? timeZone = null)
    {
        _logger = logger;
        _cronExpression = CronExpression.Parse(cronExpression);
        _timeZone = timeZone ?? TimeZoneInfo.Local;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var now = DateTimeOffset.Now;
            var nextRun = _cronExpression.GetNextOccurrence(now, _timeZone);

            if (nextRun == null)
            {
                _logger.LogWarning("No next occurrence found for cron expression");
                return;
            }

            var delay = nextRun.Value - now;

            _logger.LogInformation(
                "Next scheduled run at {NextRun} (in {Delay})",
                nextRun,
                delay);

            if (delay > TimeSpan.Zero)
            {
                await Task.Delay(delay, stoppingToken);
            }

            if (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    _logger.LogInformation("Executing scheduled task");
                    await ExecuteScheduledTaskAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error executing scheduled task");
                }
            }
        }
    }

    protected abstract Task ExecuteScheduledTaskAsync(CancellationToken cancellationToken);
}

// Example implementation: cleanup old records every day at 2 AM
public class DailyCleanupService : CronBackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<DailyCleanupService> _logger;

    public DailyCleanupService(
        IServiceProvider serviceProvider,
        ILogger<DailyCleanupService> logger)
        : base("0 2 * * *", logger) // Run at 2 AM every day
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteScheduledTaskAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();

        _logger.LogInformation("Starting daily cleanup");

        // Perform cleanup operations
        await Task.Delay(1000, cancellationToken);

        _logger.LogInformation("Daily cleanup completed");
    }
}
```

## Common Cron Expression Examples

| Expression | Description |
|------------|-------------|
| `0 * * * *` | Every hour at minute 0 |
| `*/15 * * * *` | Every 15 minutes |
| `0 2 * * *` | Every day at 2:00 AM |
| `0 0 * * 0` | Every Sunday at midnight |
| `0 0 1 * *` | First day of every month at midnight |
| `0 9-17 * * 1-5` | Every hour from 9 AM to 5 PM on weekdays |

## Error Handling and Retry Logic

Production services need robust error handling with exponential backoff.

```csharp
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Polly;
using Polly.Retry;

public class ResilientBackgroundService : BackgroundService
{
    private readonly ILogger<ResilientBackgroundService> _logger;
    private readonly AsyncRetryPolicy _retryPolicy;

    public ResilientBackgroundService(ILogger<ResilientBackgroundService> logger)
    {
        _logger = logger;

        // Configure retry policy with exponential backoff
        _retryPolicy = Policy
            .Handle<Exception>()
            .WaitAndRetryAsync(
                retryCount: 5,
                sleepDurationProvider: attempt =>
                    TimeSpan.FromSeconds(Math.Pow(2, attempt)),
                onRetry: (exception, timeSpan, retryCount, context) =>
                {
                    _logger.LogWarning(
                        exception,
                        "Retry {RetryCount} after {Delay}s due to {Message}",
                        retryCount,
                        timeSpan.TotalSeconds,
                        exception.Message);
                });
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await _retryPolicy.ExecuteAsync(async () =>
                {
                    await ProcessWorkAsync(stoppingToken);
                });
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // All retries failed
                _logger.LogError(ex, "All retry attempts failed");

                // Wait before trying again
                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
            }

            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }

    private async Task ProcessWorkAsync(CancellationToken cancellationToken)
    {
        // Your work that might fail temporarily
        await Task.Delay(100, cancellationToken);
    }
}
```

## Putting It All Together

Here is a complete `Program.cs` that registers multiple background services.

```csharp
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// Register the background task queue
builder.Services.AddSingleton<IBackgroundTaskQueue>(
    new BackgroundTaskQueue(capacity: 100));

// Register scoped services
builder.Services.AddScoped<IScopedProcessingService, DatabaseProcessingService>();

// Register background services
builder.Services.AddHostedService<TimedHostedService>();
builder.Services.AddHostedService<ScopedProcessingService>();
builder.Services.AddHostedService<QueuedHostedService>();
builder.Services.AddHostedService<DailyCleanupService>();

// Configure health checks
builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy())
    .AddCheck<BackgroundServicesHealthCheck>("background-services");

builder.Services.AddControllers();

var app = builder.Build();

// Configure health check endpoint with detailed output
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";

        var response = new
        {
            status = report.Status.ToString(),
            checks = report.Entries.Select(e => new
            {
                name = e.Key,
                status = e.Value.Status.ToString(),
                description = e.Value.Description,
                duration = e.Value.Duration.TotalMilliseconds
            }),
            totalDuration = report.TotalDuration.TotalMilliseconds
        };

        await context.Response.WriteAsync(
            JsonSerializer.Serialize(response, new JsonSerializerOptions
            {
                WriteIndented = true
            }));
    }
});

app.MapControllers();
app.Run();
```

## Best Practices Summary

| Practice | Reason |
|----------|--------|
| Always handle OperationCanceledException | Prevents noisy logs during shutdown |
| Use scopes for scoped dependencies | Prevents memory leaks and ensures proper disposal |
| Implement health checks | Enables monitoring and alerting |
| Add retry logic with backoff | Handles transient failures gracefully |
| Log at appropriate levels | Aids debugging without noise |
| Use bounded queues | Prevents memory exhaustion |
| Test shutdown behavior | Ensures no data loss during deployment |

## Conclusion

Building custom hosted services in .NET gives you fine-grained control over background processing. Start with the `BackgroundService` base class for most scenarios, and drop down to `IHostedService` when you need more control. Remember to handle graceful shutdown, use scoped services correctly, and implement health checks for production monitoring.

The patterns shown here, including queue-based processing, scheduled tasks, and health monitoring, form the foundation for building reliable background services that can handle real-world production loads.
