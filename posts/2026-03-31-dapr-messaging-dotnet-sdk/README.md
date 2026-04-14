# How to Use Dapr Messaging with .NET SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, .NET, Messaging, Pub/Sub, C#

Description: Implement advanced Dapr messaging patterns in .NET including CloudEvents, bulk messaging, message routing, dead letter handling, and subscription management.

---

## Overview

Dapr messaging in .NET goes beyond basic pub/sub. This guide covers advanced patterns including CloudEvent inspection, bulk publishing, content-based routing, subscription filters, and dead letter queue processing.

## Setup

```bash
dotnet add package Dapr.Client
dotnet add package Dapr.AspNetCore
```

## CloudEvents Publishing

```csharp
using Dapr.Client;

public class EventPublisher
{
    private readonly DaprClient _dapr;

    public EventPublisher(DaprClient dapr) => _dapr = dapr;

    public async Task PublishOrderEvent(Order order, string eventType)
    {
        // Dapr automatically wraps in CloudEvents 1.0 envelope
        await _dapr.PublishEventAsync("pubsub", $"orders.{eventType}", order, new Dictionary<string, string>
        {
            ["cloudevent.type"] = $"com.myapp.order.{eventType}",
            ["cloudevent.source"] = "orders-service",
            ["cloudevent.datacontenttype"] = "application/json"
        });
    }
}
```

## Bulk Publishing

```csharp
public async Task PublishBatch(IEnumerable<OrderEvent> events)
{
    var messages = events.Select((e, i) => new BulkPublishEntry<OrderEvent>(
        entryId: i.ToString(),
        eventData: e,
        contentType: "application/json",
        metadata: new Dictionary<string, string> { ["partitionKey"] = e.OrderId }
    )).ToList();

    var result = await _dapr.BulkPublishEventAsync(
        pubsubName: "pubsub",
        topicName: "orders",
        events: messages
    );

    if (result.FailedEntries.Any())
    {
        foreach (var failed in result.FailedEntries)
        {
            Console.WriteLine($"Failed to publish: {failed.ErrorMessage}");
        }
    }
}
```

## Content-Based Routing

Use topic rules to route messages based on content:

```csharp
[ApiController]
public class OrderRouterController : ControllerBase
{
    // Route high-value orders to priority topic
    [Topic("pubsub", "orders", "event.type == \"order-created\" && event.data.total > 1000", 1)]
    [HttpPost("/orders/high-value")]
    public IActionResult HandleHighValueOrder(Order order)
    {
        Console.WriteLine($"High-value order: {order.Id}, ${order.Total}");
        return Ok();
    }

    // Standard orders
    [Topic("pubsub", "orders", "event.type == \"order-created\" && event.data.total <= 1000", 2)]
    [HttpPost("/orders/standard")]
    public IActionResult HandleStandardOrder(Order order)
    {
        Console.WriteLine($"Standard order: {order.Id}");
        return Ok();
    }
}
```

## Dead Letter Queue Handling

```csharp
[ApiController]
public class OrderProcessorController : ControllerBase
{
    [Topic("pubsub", "orders", DeadLetterTopic = "orders-dlq")]
    [HttpPost("/orders")]
    public async Task<IActionResult> ProcessOrder(Order order)
    {
        try
        {
            await ValidateAndProcess(order);
            return Ok();
        }
        catch (ValidationException ex)
        {
            // Permanent failure - drop message, routes to dead letter topic
            Console.WriteLine($"Validation failed: {ex.Message}");
            return NotFound(); // Dapr treats 404 as DROP → sends to DLQ
        }
        catch (TransientException)
        {
            // Transient failure - Dapr will retry
            return StatusCode(500);
        }
    }

    // Handle dead letter messages
    [Topic("pubsub", "orders-dlq")]
    [HttpPost("/orders-dlq")]
    public IActionResult HandleDeadLetter(Order order)
    {
        Console.WriteLine($"Dead letter: order {order.Id} - manual review required");
        // Alert, log to database, etc.
        return Ok();
    }
}
```

## Subscription with Metadata

```csharp
// Programmatic subscription
app.MapPost("/orders", async (Order order, DaprClient dapr) =>
{
    Console.WriteLine($"Received: {order.Id}");
    return Results.Ok();
}).WithTopic("pubsub", "orders");
```

## Reading CloudEvent Envelope

```csharp
[HttpPost("/orders")]
public IActionResult OnOrder([FromBody] CloudEvent<Order> cloudEvent)
{
    Console.WriteLine($"Type: {cloudEvent.Type}");
    Console.WriteLine($"Source: {cloudEvent.Source}");
    Console.WriteLine($"Subject: {cloudEvent.Subject}");
    Console.WriteLine($"Order ID: {cloudEvent.Data?.Id}");
    return Ok();
}
```

## Summary

Advanced Dapr messaging in .NET covers bulk publishing for throughput, content-based routing for message fanout, and dead letter queues for poison message handling. CloudEvents are the default envelope format, and DaprClient handles wrapping and unwrapping automatically. The combination of bulk publish, routing rules, and DLQ handling provides a production-ready messaging foundation for event-driven .NET microservices.
