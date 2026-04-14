# How to Use Dapr Pub/Sub with .NET

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, .NET, Pub/Sub, Event, C#

Description: Implement event-driven messaging with Dapr pub/sub in .NET using DaprClient for publishing and ASP.NET Core controllers for subscribing to topics.

---

## Overview

Dapr pub/sub in .NET uses `DaprClient.PublishEventAsync` for publishing and the `[Topic]` attribute on controller actions for subscribing. The `Dapr.AspNetCore` package handles subscription registration and CloudEvent deserialization.

## Setup

```bash
dotnet add package Dapr.Client
dotnet add package Dapr.AspNetCore
```

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers().AddDapr();  // Also registers DaprClient

var app = builder.Build();
app.UseCloudEvents();
app.MapControllers();
app.MapSubscribeHandler();  // Required for auto-subscription discovery
app.Run();
```

## Publishing Events

```csharp
public class OrderService
{
    private readonly DaprClient _dapr;

    public OrderService(DaprClient dapr) => _dapr = dapr;

    public async Task PlaceOrder(Order order)
    {
        // Save to state
        await _dapr.SaveStateAsync("statestore", order.Id, order);

        // Publish event
        await _dapr.PublishEventAsync("pubsub", "order-created", new OrderCreatedEvent
        {
            OrderId = order.Id,
            CustomerId = order.CustomerId,
            Amount = order.Total,
            Timestamp = DateTime.UtcNow
        });
    }

    public async Task CancelOrder(string orderId)
    {
        await _dapr.PublishEventAsync("pubsub", "order-cancelled", new
        {
            OrderId = orderId,
            Reason = "customer_request",
            Timestamp = DateTime.UtcNow
        });
    }
}
```

## Subscribing with Controller Attributes

```csharp
[ApiController]
[Route("[controller]")]
public class NotificationController : ControllerBase
{
    [Topic("pubsub", "order-created")]
    [HttpPost("order-created")]
    public async Task<IActionResult> OnOrderCreated(OrderCreatedEvent order)
    {
        Console.WriteLine($"New order: {order.OrderId}, amount: {order.Amount}");
        // Send email, update dashboard, etc.
        return Ok();
    }

    [Topic("pubsub", "order-cancelled")]
    [HttpPost("order-cancelled")]
    public async Task<IActionResult> OnOrderCancelled(OrderCancelledEvent order)
    {
        Console.WriteLine($"Order cancelled: {order.OrderId}");
        return Ok();
    }
}
```

## Dead Letter Topics

```csharp
[Topic("pubsub", "order-created", DeadLetterTopic = "order-created-dlq")]
[HttpPost("order-created")]
public async Task<IActionResult> OnOrderCreated(OrderCreatedEvent order)
{
    try
    {
        await ProcessOrder(order);
        return Ok();
    }
    catch (Exception ex)
    {
        // Returning a non-2xx status sends to dead letter topic
        return StatusCode(500, ex.Message);
    }
}
```

## Bulk Subscribe

```csharp
[Topic("pubsub", "metrics")]
[BulkSubscribe("metrics", 100, 1000)]
[HttpPost("metrics")]
public async Task<ActionResult<BulkSubscribeAppResponse>> OnMetrics(
    BulkSubscribeMessage<MetricEvent> bulkMessage)
{
    var entries = bulkMessage.Entries.Select(entry =>
    {
        ProcessMetric(entry.Event);
        return new BulkSubscribeAppResponseEntry(entry.EntryId, BulkSubscribeAppResponseStatus.SUCCESS);
    }).ToList();

    return Ok(new BulkSubscribeAppResponse(entries));
}
```

## Publishing with Metadata

```csharp
var metadata = new Dictionary<string, string>
{
    ["partitionKey"] = order.CustomerId,  // For ordered delivery
    ["ttlInSeconds"] = "86400"
};

await _dapr.PublishEventAsync("pubsub", "order-created", orderEvent, metadata);
```

## Summary

Dapr pub/sub in .NET combines the `PublishEventAsync` method for event emission with the `[Topic]` attribute for clean subscription declaration. The `MapSubscribeHandler()` call registers subscription endpoints automatically so Dapr knows which topics to forward. Dead letter topics and bulk subscribe patterns handle failure scenarios and high-throughput workloads respectively.
