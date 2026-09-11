# Propagate Correlation Context into ASP.NET Core Background Work

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Correlation ID, ASP.NET Core, BackgroundService, .NET, Distributed Tracing

Description: Capture correlation and trace context in queued work envelopes, restore them per BackgroundService item, and avoid retaining request-scoped dependencies.

---

A request can enqueue work and finish before a `BackgroundService` begins processing it. The worker does not inherit the producer's `HttpContext`, logging scope, or live activity simply because both components run in the same process.

Transfer the small pieces of immutable context that identify the work. Restore them while processing each item, create a new activity for that execution, and dispose the worker's scope afterward. This makes the handoff explicit and avoids retaining an entire completed request.

## Design a work envelope

Keep business data and observability context separate in the envelope:

```csharp
using System.Diagnostics;

public sealed record WorkItem(
    string ItemId,
    string CorrelationId,
    ActivityContext ParentContext);
```

`ActivityContext` is a value describing trace identifiers and flags. It does not keep an `Activity` running. For an external queue, serialize supported trace headers using your propagator instead of attempting to serialize the activity object or the .NET struct directly.

A request's cancellation token has a different lifetime from accepted background work. Use it while waiting to enqueue, then use the worker's shutdown and job deadline policy for processing. Otherwise, disconnecting the browser could cancel a job that the API already accepted.

## Capture context at enqueue time

The following .NET minimal web application uses a bounded channel. The producer captures context before returning `202 Accepted`:

```csharp
using System.Diagnostics;
using System.Threading.Channels;

var builder = WebApplication.CreateBuilder(args);
builder.Logging.AddJsonConsole(o => o.IncludeScopes = true);
builder.Services.AddSingleton(Channel.CreateBounded<WorkItem>(
    new BoundedChannelOptions(100)
    {
        FullMode = BoundedChannelFullMode.Wait,
        SingleReader = true,
    }));
builder.Services.AddHostedService<Worker>();
var app = builder.Build();

app.MapPost("/jobs/{itemId}", async (
    string itemId, HttpContext http, Channel<WorkItem> queue) =>
{
    var correlationId = Guid.NewGuid().ToString("N");
    var item = new WorkItem(itemId, correlationId,
        Activity.Current?.Context ?? default);
    await queue.Writer.WriteAsync(item, http.RequestAborted);
    http.Response.Headers["X-Correlation-ID"] = correlationId;
    return Results.Accepted(value: new { correlation_id = correlationId });
});
app.Run();

public sealed record WorkItem(string ItemId, string CorrelationId,
    ActivityContext ParentContext);

public sealed class Worker(Channel<WorkItem> queue, ILogger<Worker> logger)
    : BackgroundService
{
    public static readonly ActivitySource Source = new("Example.Jobs");

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var item in queue.Reader.ReadAllAsync(stoppingToken))
        {
            using var activity = Source.StartActivity(
                "process job", ActivityKind.Consumer, item.ParentContext);
            activity?.SetTag("app.correlation_id", item.CorrelationId);
            using var scope = logger.BeginScope(
                new Dictionary<string, object?>
                {
                    ["correlation_id"] = item.CorrelationId,
                    ["item_id"] = item.ItemId,
                });
            try
            {
                logger.LogInformation("Job started");
                await Task.Delay(25, stoppingToken);
                logger.LogInformation("Job completed");
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception error)
            {
                activity?.SetStatus(ActivityStatusCode.Error);
                logger.LogError(error, "Job failed");
            }
        }
    }
}
```

Register `Example.Jobs` with your OpenTelemetry tracing builder using `AddSource("Example.Jobs")` and configure an exporter when you want these activities recorded. `StartActivity` can return `null` without an interested listener; the explicit logging scope still supplies correlation.

The queue is in memory. A process crash loses queued work, and this sample logs failures without retrying them. Use a durable broker and a defined retry policy when accepting a job must survive restarts. The code demonstrates context transfer rather than delivery guarantees.

## Choose parentage based on the work's lifecycle

For a short handoff, using the captured request context as the worker activity's parent is often appropriate. The request span can already be finished; its context still identifies the causal parent.

For work delayed for hours, scheduled replays, or a batch combining several requests, a new trace with links can describe the relationship more clearly. Preserve the correlation ID independently so searches work after the original trace expires. Do not keep the HTTP activity open until every queued job finishes.

When a job fans out, create a separate processing activity for each child execution. Sharing a correlation ID should not cause all children to reuse one span ID or one mutable activity object.

## Recreate scoped services inside the worker

A hosted service does not automatically get a new dependency-injection scope for each queued item. If processing needs a scoped database context or another scoped service, inject `IServiceScopeFactory`, create a scope per item, resolve the processor inside it, and dispose it after awaited processing completes.

Do not queue a delegate that closes over a controller, `HttpContext`, request service provider, or scoped database context. Capturing only `ItemId`, a validated correlation ID, and trace context gives the worker a clear ownership boundary.

Similarly, avoid copying arbitrary request headers into job metadata. Authorization and tenant membership must be checked against a durable job contract; a diagnostic ID is not a substitute for either.

## Verify queue isolation and shutdown

Submit several jobs concurrently and compare the response IDs with the corresponding worker records. Introduce a processing failure and confirm the next item does not inherit the failed item's ID. Fill the queue to observe backpressure rather than assuming the producer can enqueue without waiting.

Test shutdown separately. Decide whether your service drains work within its shutdown timeout, abandons in-memory items, or relies on broker redelivery. Context propagation should remain correct on every outcome, but it cannot make an in-memory queue durable.

Microsoft's [hosted service guide](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/host/hosted-services?view=aspnetcore-10.0) covers queued background tasks and dependency scopes. Apply those lifetime rules alongside the tracing design.

## Conclusion

Capture identifiers when work is submitted, restore them in a fresh worker scope, and create a new activity for each processing attempt. Keep request objects and scoped dependencies out of the queue, and choose a durable transport when the acceptance response promises work will survive a restart.

## Official Documentation

- [ASP.NET Core queued background tasks and scopes](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/host/hosted-services?view=aspnetcore-10.0)
- [.NET activity lifetime and context](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/distributed-tracing-concepts)
- [OpenTelemetry span links](https://opentelemetry.io/docs/specs/otel/trace/api/#link)
