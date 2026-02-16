# How to Send Messages to Azure Service Bus Queues Using Azure.Messaging.ServiceBus in C#

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Service Bus, C#, .NET, Messaging, Queue, Azure.Messaging.ServiceBus

Description: Learn how to send and receive messages with Azure Service Bus queues using the Azure.Messaging.ServiceBus SDK in C# .NET applications.

---

Azure Service Bus is a fully managed enterprise message broker. When you need reliable messaging between services - order processing, background task queuing, event distribution - Service Bus handles the heavy lifting. The Azure.Messaging.ServiceBus SDK for .NET gives you a modern, async-first API for working with queues and topics. In this post, I will cover sending and receiving messages with practical C# examples.

## Setting Up

Add the NuGet packages.

```bash
dotnet add package Azure.Messaging.ServiceBus
dotnet add package Azure.Identity
```

Create a Service Bus namespace and queue if you do not have them.

```bash
# Create namespace
az servicebus namespace create \
    --name my-sb-namespace \
    --resource-group my-rg \
    --location eastus \
    --sku Standard

# Create a queue
az servicebus queue create \
    --name orders \
    --namespace-name my-sb-namespace \
    --resource-group my-rg \
    --max-size 1024

# Assign RBAC roles
NS_ID=$(az servicebus namespace show --name my-sb-namespace --resource-group my-rg --query id -o tsv)

az role assignment create --role "Azure Service Bus Data Sender" --assignee <principal-id> --scope $NS_ID
az role assignment create --role "Azure Service Bus Data Receiver" --assignee <principal-id> --scope $NS_ID
```

## Creating the Client

The ServiceBusClient is the entry point. Create it once and reuse it throughout your application.

```csharp
using Azure.Identity;
using Azure.Messaging.ServiceBus;

// Create the client with DefaultAzureCredential
var client = new ServiceBusClient(
    "my-sb-namespace.servicebus.windows.net",
    new DefaultAzureCredential()
);
```

## Sending Messages

The sender sends messages to a specific queue or topic.

```csharp
// Create a sender for the "orders" queue
ServiceBusSender sender = client.CreateSender("orders");

// Send a simple text message
await sender.SendMessageAsync(new ServiceBusMessage("Order #12345 - process payment"));

Console.WriteLine("Message sent");
```

For structured data, serialize to JSON and set appropriate properties.

```csharp
using System.Text.Json;

// Define an order model
public record Order(
    string OrderId,
    string CustomerId,
    List<OrderItem> Items,
    decimal Total,
    DateTime CreatedAt
);

public record OrderItem(string Product, int Quantity, decimal Price);

// Create and send a structured message
var order = new Order(
    OrderId: "ORD-2026-001",
    CustomerId: "CUST-789",
    Items: new List<OrderItem>
    {
        new("Wireless Headphones", 1, 79.99m),
        new("USB-C Hub", 2, 34.99m)
    },
    Total: 149.97m,
    CreatedAt: DateTime.UtcNow
);

var message = new ServiceBusMessage(JsonSerializer.Serialize(order))
{
    ContentType = "application/json",
    Subject = "new-order",
    MessageId = order.OrderId,  // Deduplication key
    ApplicationProperties =
    {
        { "priority", "high" },
        { "region", "us-east" },
        { "orderTotal", order.Total.ToString() }
    }
};

await sender.SendMessageAsync(message);
Console.WriteLine($"Order {order.OrderId} sent to queue");
```

## Sending Batches

Batching improves throughput by sending multiple messages in a single network call.

```csharp
// Create a batch - the SDK manages the size limit
using ServiceBusMessageBatch batch = await sender.CreateMessageBatchAsync();

var orders = new List<Order>
{
    new("ORD-001", "CUST-1", new List<OrderItem>(), 25.00m, DateTime.UtcNow),
    new("ORD-002", "CUST-2", new List<OrderItem>(), 150.00m, DateTime.UtcNow),
    new("ORD-003", "CUST-3", new List<OrderItem>(), 89.50m, DateTime.UtcNow)
};

foreach (var order in orders)
{
    var message = new ServiceBusMessage(JsonSerializer.Serialize(order));

    // TryAddMessage returns false if the batch is full
    if (!batch.TryAddMessage(message))
    {
        // Send the current batch and start a new one
        await sender.SendMessagesAsync(batch);
        batch.Dispose();

        var newBatch = await sender.CreateMessageBatchAsync();
        if (!newBatch.TryAddMessage(message))
        {
            throw new Exception($"Message too large for an empty batch");
        }
    }
}

// Send any remaining messages
if (batch.Count > 0)
{
    await sender.SendMessagesAsync(batch);
}

Console.WriteLine($"Batch of {orders.Count} orders sent");
```

## Receiving Messages

The receiver picks up messages from a queue. Service Bus uses peek-lock by default: the message is locked while you process it, and you complete it when done.

```csharp
// Create a receiver for the "orders" queue
ServiceBusReceiver receiver = client.CreateReceiver("orders");

// Receive a single message (waits up to 30 seconds by default)
ServiceBusReceivedMessage message = await receiver.ReceiveMessageAsync(
    maxWaitTime: TimeSpan.FromSeconds(10)
);

if (message != null)
{
    // Deserialize the message body
    Order order = JsonSerializer.Deserialize<Order>(message.Body.ToString())!;
    Console.WriteLine($"Received order: {order.OrderId} - ${order.Total}");

    // Process the order
    // ... your business logic here ...

    // Mark as successfully processed
    await receiver.CompleteMessageAsync(message);
    Console.WriteLine("Message completed");
}
else
{
    Console.WriteLine("No messages available");
}
```

## Receiving Multiple Messages

```csharp
// Receive a batch of messages
IReadOnlyList<ServiceBusReceivedMessage> messages = await receiver.ReceiveMessagesAsync(
    maxMessages: 10,
    maxWaitTime: TimeSpan.FromSeconds(5)
);

Console.WriteLine($"Received {messages.Count} messages");

foreach (var msg in messages)
{
    try
    {
        var order = JsonSerializer.Deserialize<Order>(msg.Body.ToString())!;
        Console.WriteLine($"  Processing: {order.OrderId}");

        // Process the order...

        await receiver.CompleteMessageAsync(msg);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"  Error: {ex.Message}");
        // Put the message back for retry
        await receiver.AbandonMessageAsync(msg);
    }
}
```

## Using the Processor for Continuous Processing

The ServiceBusProcessor provides a higher-level abstraction for continuous message processing with automatic message handling.

```csharp
// Create a processor with concurrency settings
var processor = client.CreateProcessor("orders", new ServiceBusProcessorOptions
{
    MaxConcurrentCalls = 5,          // Process up to 5 messages in parallel
    AutoCompleteMessages = false,     // We will complete manually
    PrefetchCount = 10,              // Prefetch messages for better throughput
    MaxAutoLockRenewalDuration = TimeSpan.FromMinutes(10)  // Renew lock for long operations
});

// Register the message handler
processor.ProcessMessageAsync += async args =>
{
    string body = args.Message.Body.ToString();
    var order = JsonSerializer.Deserialize<Order>(body)!;

    Console.WriteLine($"Processing order: {order.OrderId}");

    // Simulate work
    await Task.Delay(1000);

    // Complete the message
    await args.CompleteMessageAsync(args.Message);
    Console.WriteLine($"Order {order.OrderId} processed successfully");
};

// Register the error handler
processor.ProcessErrorAsync += args =>
{
    Console.WriteLine($"Error: {args.Exception.Message}");
    Console.WriteLine($"  Source: {args.ErrorSource}");
    Console.WriteLine($"  Entity: {args.EntityPath}");
    return Task.CompletedTask;
};

// Start processing
await processor.StartProcessingAsync();
Console.WriteLine("Processor started. Press any key to stop.");
Console.ReadKey();

// Stop gracefully
await processor.StopProcessingAsync();
```

## Dead Letter Queue

Messages that fail too many times automatically go to the dead letter queue. You should monitor and process it.

```csharp
// Explicitly dead-letter a message with a reason
processor.ProcessMessageAsync += async args =>
{
    try
    {
        var order = JsonSerializer.Deserialize<Order>(args.Message.Body.ToString());

        if (order == null || string.IsNullOrEmpty(order.OrderId))
        {
            // Invalid message - send to dead letter queue
            await args.DeadLetterMessageAsync(
                args.Message,
                deadLetterReason: "InvalidPayload",
                deadLetterErrorDescription: "Order ID was null or empty"
            );
            return;
        }

        // Process normally
        await args.CompleteMessageAsync(args.Message);
    }
    catch (JsonException)
    {
        await args.DeadLetterMessageAsync(
            args.Message,
            deadLetterReason: "DeserializationFailed",
            deadLetterErrorDescription: "Could not parse message body as JSON"
        );
    }
};

// Process dead letter messages
var dlqReceiver = client.CreateReceiver("orders", new ServiceBusReceiverOptions
{
    SubQueue = SubQueue.DeadLetter
});

var deadLetters = await dlqReceiver.ReceiveMessagesAsync(maxMessages: 10);
foreach (var dl in deadLetters)
{
    Console.WriteLine($"Dead letter - Reason: {dl.DeadLetterReason}");
    Console.WriteLine($"  Error: {dl.DeadLetterErrorDescription}");
    Console.WriteLine($"  Body: {dl.Body}");

    // Handle or log, then complete to remove from DLQ
    await dlqReceiver.CompleteMessageAsync(dl);
}
```

## Scheduled Messages

```csharp
// Schedule a message for delivery 30 minutes from now
var scheduledMessage = new ServiceBusMessage("Follow-up reminder for order ORD-001")
{
    Subject = "reminder"
};

long sequenceNumber = await sender.ScheduleMessageAsync(
    scheduledMessage,
    DateTimeOffset.UtcNow.AddMinutes(30)
);

Console.WriteLine($"Message scheduled. Sequence number: {sequenceNumber}");

// Cancel a scheduled message if needed
await sender.CancelScheduledMessageAsync(sequenceNumber);
```

## Integration with ASP.NET Core

Register Service Bus in your DI container for use in controllers and services.

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

// Register ServiceBusClient as singleton
builder.Services.AddSingleton(new ServiceBusClient(
    "my-sb-namespace.servicebus.windows.net",
    new DefaultAzureCredential()
));

var app = builder.Build();

// Endpoint to submit an order
app.MapPost("/api/orders", async (Order order, ServiceBusClient sbClient) =>
{
    var sender = sbClient.CreateSender("orders");
    var message = new ServiceBusMessage(JsonSerializer.Serialize(order))
    {
        ContentType = "application/json",
        MessageId = order.OrderId
    };

    await sender.SendMessageAsync(message);
    await sender.DisposeAsync();

    return Results.Accepted(value: new { message = "Order queued", orderId = order.OrderId });
});

app.Run();
```

## Best Practices

1. **Reuse the ServiceBusClient.** Create it once and share it. It manages connections efficiently.
2. **Dispose senders and receivers** when you are done with them. Use `await using` for scoped usage.
3. **Do not auto-complete messages** in production. Complete manually after successful processing.
4. **Monitor the dead letter queue.** Unprocessed dead letters are silent failures.
5. **Use the processor for background workers.** It handles concurrency, lock renewal, and reconnection.
6. **Set appropriate lock durations.** If your processing takes longer than the lock timeout, the message gets redelivered.

## Wrapping Up

The Azure.Messaging.ServiceBus SDK provides a well-designed API for message-based communication in .NET. The ServiceBusProcessor handles the common background worker pattern with minimal code, while the lower-level sender and receiver give you control when you need it. Combined with DefaultAzureCredential, you get a secure, production-ready messaging setup that works from development through production.
