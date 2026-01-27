# How to Use Azure Service Bus with .NET

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: .NET, C#, Azure Service Bus, Messaging, Queues, Microservices, Cloud, ASP.NET Core

Description: A practical guide to building reliable messaging systems with Azure Service Bus in .NET, covering queues, topics, sessions, dead letter queues, and best practices.

---

> Azure Service Bus is the backbone of asynchronous communication in Azure. Master queues, topics, and sessions, and your microservices will communicate reliably even when individual components fail.

## Queues vs Topics: Choosing the Right Pattern

Azure Service Bus offers two messaging patterns: **queues** for point-to-point communication and **topics** for publish-subscribe scenarios.

**Queues** deliver each message to exactly one consumer. Use them when:
- You have a single processor for each message type
- You need guaranteed ordering (with sessions)
- Work distribution across competing consumers is the goal

**Topics** broadcast messages to multiple subscriptions. Each subscription acts like a virtual queue with its own filtering rules. Use them when:
- Multiple services need the same event
- You want to decouple publishers from subscribers
- Different consumers need different subsets of messages

```csharp
// Install the Azure.Messaging.ServiceBus NuGet package
// dotnet add package Azure.Messaging.ServiceBus

using Azure.Messaging.ServiceBus;

// Connection string from Azure portal or Key Vault
var connectionString = "Endpoint=sb://your-namespace.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=your-key";

// Create a client that manages connections efficiently
// ServiceBusClient is thread-safe and should be reused
await using var client = new ServiceBusClient(connectionString);
```

## Sending Messages to Queues and Topics

Sending messages is straightforward. The `ServiceBusSender` handles batching, retries, and connection management.

```csharp
using Azure.Messaging.ServiceBus;
using System.Text.Json;

public class OrderMessage
{
    public string OrderId { get; set; } = string.Empty;
    public string CustomerId { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class OrderPublisher : IAsyncDisposable
{
    private readonly ServiceBusClient _client;
    private readonly ServiceBusSender _sender;

    public OrderPublisher(string connectionString, string queueOrTopicName)
    {
        _client = new ServiceBusClient(connectionString);
        _sender = _client.CreateSender(queueOrTopicName);
    }

    public async Task SendOrderAsync(OrderMessage order)
    {
        // Serialize the message body as JSON
        var messageBody = JsonSerializer.Serialize(order);
        var message = new ServiceBusMessage(messageBody)
        {
            // ContentType helps receivers deserialize correctly
            ContentType = "application/json",

            // MessageId enables duplicate detection
            MessageId = order.OrderId,

            // CorrelationId links related messages for tracing
            CorrelationId = Guid.NewGuid().ToString(),

            // Subject (formerly Label) categorizes the message
            Subject = "NewOrder",

            // ApplicationProperties store custom metadata
            ApplicationProperties =
            {
                ["Priority"] = order.TotalAmount > 1000 ? "High" : "Normal",
                ["Region"] = "US-East"
            },

            // TimeToLive controls how long the message lives
            TimeToLive = TimeSpan.FromHours(24)
        };

        await _sender.SendMessageAsync(message);
        Console.WriteLine($"Sent order {order.OrderId}");
    }

    public async ValueTask DisposeAsync()
    {
        await _sender.DisposeAsync();
        await _client.DisposeAsync();
    }
}
```

## Receiving Messages with Processors

The `ServiceBusProcessor` is the recommended way to receive messages. It handles connection recovery, concurrent processing, and automatic message completion.

```csharp
using Azure.Messaging.ServiceBus;
using System.Text.Json;

public class OrderProcessor : IAsyncDisposable
{
    private readonly ServiceBusClient _client;
    private readonly ServiceBusProcessor _processor;

    public OrderProcessor(string connectionString, string queueName)
    {
        _client = new ServiceBusClient(connectionString);

        // Configure the processor for optimal performance
        _processor = _client.CreateProcessor(queueName, new ServiceBusProcessorOptions
        {
            // Process multiple messages concurrently
            MaxConcurrentCalls = 10,

            // Automatically complete messages after successful processing
            AutoCompleteMessages = false,

            // Prefetch messages for lower latency
            PrefetchCount = 20,

            // ReceiveMode determines visibility behavior
            // PeekLock: message hidden until completed or abandoned
            // ReceiveAndDelete: message removed immediately (no retry)
            ReceiveMode = ServiceBusReceiveMode.PeekLock,

            // Maximum time to process before lock expires
            MaxAutoLockRenewalDuration = TimeSpan.FromMinutes(5)
        });

        // Wire up event handlers
        _processor.ProcessMessageAsync += HandleMessageAsync;
        _processor.ProcessErrorAsync += HandleErrorAsync;
    }

    private async Task HandleMessageAsync(ProcessMessageEventArgs args)
    {
        var body = args.Message.Body.ToString();
        var order = JsonSerializer.Deserialize<OrderMessage>(body);

        Console.WriteLine($"Processing order {order?.OrderId}");

        try
        {
            // Your business logic here
            await ProcessOrderAsync(order!);

            // Explicitly complete the message to remove it from the queue
            await args.CompleteMessageAsync(args.Message);
            Console.WriteLine($"Completed order {order?.OrderId}");
        }
        catch (Exception ex) when (IsTransient(ex))
        {
            // Abandon releases the lock so another consumer can retry
            await args.AbandonMessageAsync(args.Message);
            Console.WriteLine($"Abandoned order {order?.OrderId} for retry: {ex.Message}");
        }
        catch (Exception ex)
        {
            // Dead letter permanently failed messages for investigation
            await args.DeadLetterMessageAsync(args.Message,
                deadLetterReason: "ProcessingFailed",
                deadLetterErrorDescription: ex.Message);
            Console.WriteLine($"Dead-lettered order {order?.OrderId}: {ex.Message}");
        }
    }

    private Task HandleErrorAsync(ProcessErrorEventArgs args)
    {
        // Log errors for monitoring and alerting
        Console.WriteLine($"Error in {args.ErrorSource}: {args.Exception.Message}");
        return Task.CompletedTask;
    }

    private Task ProcessOrderAsync(OrderMessage order)
    {
        // Simulate processing
        return Task.Delay(100);
    }

    private bool IsTransient(Exception ex)
    {
        // Determine if the error is transient and worth retrying
        return ex is TimeoutException or ServiceBusException { IsTransient: true };
    }

    public async Task StartAsync() => await _processor.StartProcessingAsync();
    public async Task StopAsync() => await _processor.StopProcessingAsync();

    public async ValueTask DisposeAsync()
    {
        await _processor.DisposeAsync();
        await _client.DisposeAsync();
    }
}
```

## Sessions for Ordered Message Processing

Sessions guarantee ordered delivery and exclusive processing. Messages with the same `SessionId` are delivered to one consumer in FIFO order.

```csharp
using Azure.Messaging.ServiceBus;

public class SessionOrderProcessor : IAsyncDisposable
{
    private readonly ServiceBusClient _client;
    private readonly ServiceBusSessionProcessor _processor;

    public SessionOrderProcessor(string connectionString, string queueName)
    {
        _client = new ServiceBusClient(connectionString);

        // Session processor handles session lifecycle automatically
        _processor = _client.CreateSessionProcessor(queueName, new ServiceBusSessionProcessorOptions
        {
            // Number of sessions to process concurrently
            MaxConcurrentSessions = 8,

            // Messages per session processed concurrently
            MaxConcurrentCallsPerSession = 1,

            // Automatically renew session locks
            SessionIdleTimeout = TimeSpan.FromMinutes(5)
        });

        _processor.ProcessMessageAsync += HandleSessionMessageAsync;
        _processor.ProcessErrorAsync += HandleErrorAsync;
    }

    private async Task HandleSessionMessageAsync(ProcessSessionMessageEventArgs args)
    {
        // SessionId groups related messages (e.g., all messages for one customer)
        var sessionId = args.SessionId;
        var sequenceNumber = args.Message.SequenceNumber;

        Console.WriteLine($"Session {sessionId}, Sequence {sequenceNumber}: {args.Message.Body}");

        // Session state persists across message processing
        // Use it to track progress within a session
        var state = await args.GetSessionStateAsync();
        if (state != null)
        {
            var lastProcessed = state.ToArray();
            Console.WriteLine($"Previous state: {System.Text.Encoding.UTF8.GetString(lastProcessed)}");
        }

        // Update session state after processing
        await args.SetSessionStateAsync(new BinaryData($"Processed sequence {sequenceNumber}"));

        await args.CompleteMessageAsync(args.Message);
    }

    private Task HandleErrorAsync(ProcessErrorEventArgs args)
    {
        Console.WriteLine($"Session error: {args.Exception.Message}");
        return Task.CompletedTask;
    }

    public async Task StartAsync() => await _processor.StartProcessingAsync();
    public async Task StopAsync() => await _processor.StopProcessingAsync();

    public async ValueTask DisposeAsync()
    {
        await _processor.DisposeAsync();
        await _client.DisposeAsync();
    }
}

// Sending session-enabled messages
public async Task SendSessionMessagesAsync(ServiceBusSender sender)
{
    var customerId = "CUST-12345";

    // All messages with the same SessionId are delivered in order
    var messages = new[]
    {
        new ServiceBusMessage("Order created") { SessionId = customerId },
        new ServiceBusMessage("Payment received") { SessionId = customerId },
        new ServiceBusMessage("Order shipped") { SessionId = customerId }
    };

    // Send as a batch to ensure atomicity
    await sender.SendMessagesAsync(messages);
}
```

## Dead Letter Queue: Handling Failed Messages

The dead letter queue (DLQ) captures messages that cannot be processed. Every queue and subscription has an associated DLQ.

```csharp
using Azure.Messaging.ServiceBus;

public class DeadLetterHandler
{
    private readonly ServiceBusClient _client;

    public DeadLetterHandler(string connectionString)
    {
        _client = new ServiceBusClient(connectionString);
    }

    public async Task ProcessDeadLettersAsync(string queueName)
    {
        // Access the dead letter queue using the SubQueue option
        var receiver = _client.CreateReceiver(queueName, new ServiceBusReceiverOptions
        {
            SubQueue = SubQueue.DeadLetter
        });

        // Receive dead letters in batches
        var deadLetters = await receiver.ReceiveMessagesAsync(maxMessages: 100, maxWaitTime: TimeSpan.FromSeconds(30));

        foreach (var message in deadLetters)
        {
            // Inspect why the message was dead-lettered
            Console.WriteLine($"Dead Letter Reason: {message.DeadLetterReason}");
            Console.WriteLine($"Dead Letter Description: {message.DeadLetterErrorDescription}");
            Console.WriteLine($"Original Enqueue Time: {message.EnqueuedTime}");
            Console.WriteLine($"Delivery Count: {message.DeliveryCount}");
            Console.WriteLine($"Body: {message.Body}");

            // Options for handling dead letters:
            // 1. Fix and resubmit to the main queue
            // 2. Log for manual investigation
            // 3. Move to a parking lot queue
            // 4. Complete to remove from DLQ

            if (CanReprocess(message))
            {
                await ResubmitMessageAsync(queueName, message);
            }

            // Complete removes the message from the DLQ
            await receiver.CompleteMessageAsync(message);
        }

        await receiver.DisposeAsync();
    }

    private bool CanReprocess(ServiceBusReceivedMessage message)
    {
        // Determine if the message should be retried
        // Example: retry if the original failure was transient
        return message.DeadLetterReason == "TransientFailure";
    }

    private async Task ResubmitMessageAsync(string queueName, ServiceBusReceivedMessage deadLetter)
    {
        var sender = _client.CreateSender(queueName);

        // Create a new message from the dead letter
        var resubmitMessage = new ServiceBusMessage(deadLetter.Body)
        {
            ContentType = deadLetter.ContentType,
            Subject = deadLetter.Subject,
            MessageId = $"{deadLetter.MessageId}-retry-{DateTime.UtcNow.Ticks}",
            CorrelationId = deadLetter.CorrelationId
        };

        // Copy application properties
        foreach (var prop in deadLetter.ApplicationProperties)
        {
            resubmitMessage.ApplicationProperties[prop.Key] = prop.Value;
        }

        // Track resubmission attempts
        resubmitMessage.ApplicationProperties["ResubmitCount"] =
            (deadLetter.ApplicationProperties.TryGetValue("ResubmitCount", out var count) ? (int)count : 0) + 1;

        await sender.SendMessageAsync(resubmitMessage);
        await sender.DisposeAsync();

        Console.WriteLine($"Resubmitted message {deadLetter.MessageId}");
    }
}
```

## Retry Policies and Resilience

Configure retry policies to handle transient failures gracefully.

```csharp
using Azure.Messaging.ServiceBus;

public class ResilientServiceBusClient
{
    public static ServiceBusClient CreateWithRetryPolicy(string connectionString)
    {
        var options = new ServiceBusClientOptions
        {
            // Configure retry behavior for transient failures
            RetryOptions = new ServiceBusRetryOptions
            {
                // Exponential backoff mode
                Mode = ServiceBusRetryMode.Exponential,

                // Maximum retry attempts
                MaxRetries = 5,

                // Initial delay between retries
                Delay = TimeSpan.FromSeconds(1),

                // Maximum delay between retries
                MaxDelay = TimeSpan.FromSeconds(30),

                // Total time allowed for all retry attempts
                TryTimeout = TimeSpan.FromMinutes(2)
            },

            // Transport type: AMQP is default, WebSockets for firewall-restricted environments
            TransportType = ServiceBusTransportType.AmqpTcp
        };

        return new ServiceBusClient(connectionString, options);
    }
}

// For more complex scenarios, combine with Polly
using Polly;
using Polly.Retry;

public class PollyEnhancedPublisher
{
    private readonly ServiceBusSender _sender;
    private readonly AsyncRetryPolicy _retryPolicy;

    public PollyEnhancedPublisher(ServiceBusClient client, string queueName)
    {
        _sender = client.CreateSender(queueName);

        // Define a Polly retry policy for application-level retries
        _retryPolicy = Policy
            .Handle<ServiceBusException>(ex => ex.IsTransient)
            .Or<TimeoutException>()
            .WaitAndRetryAsync(
                retryCount: 3,
                sleepDurationProvider: attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt)),
                onRetry: (exception, timeSpan, retryCount, context) =>
                {
                    Console.WriteLine($"Retry {retryCount} after {timeSpan.TotalSeconds}s due to: {exception.Message}");
                });
    }

    public async Task SendWithRetryAsync(ServiceBusMessage message)
    {
        await _retryPolicy.ExecuteAsync(async () =>
        {
            await _sender.SendMessageAsync(message);
        });
    }
}
```

## Batch Operations for High Throughput

Batch operations improve throughput and reduce costs by grouping messages.

```csharp
using Azure.Messaging.ServiceBus;
using System.Text.Json;

public class BatchPublisher
{
    private readonly ServiceBusSender _sender;

    public BatchPublisher(ServiceBusClient client, string queueName)
    {
        _sender = client.CreateSender(queueName);
    }

    public async Task SendBatchAsync<T>(IEnumerable<T> items) where T : class
    {
        // Create a batch that respects size limits
        using var batch = await _sender.CreateMessageBatchAsync();

        var overflow = new List<T>();

        foreach (var item in items)
        {
            var message = new ServiceBusMessage(JsonSerializer.Serialize(item))
            {
                ContentType = "application/json"
            };

            // TryAddMessage returns false if the batch is full
            if (!batch.TryAddMessage(message))
            {
                // Track items that did not fit
                overflow.Add(item);
            }
        }

        if (batch.Count > 0)
        {
            // Send the batch as a single operation
            await _sender.SendMessagesAsync(batch);
            Console.WriteLine($"Sent batch of {batch.Count} messages ({batch.SizeInBytes} bytes)");
        }

        // Recursively handle overflow
        if (overflow.Count > 0)
        {
            Console.WriteLine($"Processing overflow: {overflow.Count} items");
            await SendBatchAsync(overflow);
        }
    }

    // Alternative: send a list directly (SDK handles batching)
    public async Task SendListAsync<T>(IEnumerable<T> items) where T : class
    {
        var messages = items.Select(item => new ServiceBusMessage(JsonSerializer.Serialize(item))
        {
            ContentType = "application/json"
        }).ToList();

        // SendMessagesAsync automatically batches if the list exceeds size limits
        await _sender.SendMessagesAsync(messages);
        Console.WriteLine($"Sent {messages.Count} messages");
    }
}

// Batch receiving for processing efficiency
public class BatchReceiver
{
    private readonly ServiceBusReceiver _receiver;

    public BatchReceiver(ServiceBusClient client, string queueName)
    {
        _receiver = client.CreateReceiver(queueName, new ServiceBusReceiverOptions
        {
            ReceiveMode = ServiceBusReceiveMode.PeekLock,
            PrefetchCount = 100
        });
    }

    public async Task ReceiveBatchAsync(int batchSize, Func<IReadOnlyList<ServiceBusReceivedMessage>, Task> processor)
    {
        // Receive up to batchSize messages
        var messages = await _receiver.ReceiveMessagesAsync(
            maxMessages: batchSize,
            maxWaitTime: TimeSpan.FromSeconds(30));

        if (messages.Count == 0)
        {
            Console.WriteLine("No messages available");
            return;
        }

        Console.WriteLine($"Received batch of {messages.Count} messages");

        try
        {
            // Process the entire batch
            await processor(messages);

            // Complete all messages in the batch
            var completeTasks = messages.Select(m => _receiver.CompleteMessageAsync(m));
            await Task.WhenAll(completeTasks);

            Console.WriteLine($"Completed {messages.Count} messages");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Batch processing failed: {ex.Message}");

            // Abandon all messages for retry
            var abandonTasks = messages.Select(m => _receiver.AbandonMessageAsync(m));
            await Task.WhenAll(abandonTasks);
        }
    }
}
```

## Dependency Injection Setup for ASP.NET Core

Register Service Bus components properly in ASP.NET Core applications.

```csharp
using Azure.Messaging.ServiceBus;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

public static class ServiceBusExtensions
{
    public static IServiceCollection AddServiceBus(
        this IServiceCollection services,
        string connectionString)
    {
        // Register ServiceBusClient as singleton (thread-safe, manages connections)
        services.AddSingleton(sp => new ServiceBusClient(connectionString, new ServiceBusClientOptions
        {
            RetryOptions = new ServiceBusRetryOptions
            {
                Mode = ServiceBusRetryMode.Exponential,
                MaxRetries = 5
            }
        }));

        // Register senders as singletons (thread-safe)
        services.AddSingleton(sp =>
        {
            var client = sp.GetRequiredService<ServiceBusClient>();
            return client.CreateSender("orders-queue");
        });

        return services;
    }
}

// Background service for continuous message processing
public class OrderProcessingService : BackgroundService
{
    private readonly ServiceBusProcessor _processor;
    private readonly ILogger<OrderProcessingService> _logger;

    public OrderProcessingService(
        ServiceBusClient client,
        ILogger<OrderProcessingService> logger)
    {
        _logger = logger;
        _processor = client.CreateProcessor("orders-queue", new ServiceBusProcessorOptions
        {
            MaxConcurrentCalls = 10,
            AutoCompleteMessages = false
        });

        _processor.ProcessMessageAsync += ProcessMessageAsync;
        _processor.ProcessErrorAsync += ProcessErrorAsync;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await _processor.StartProcessingAsync(stoppingToken);

        // Keep the service running
        await Task.Delay(Timeout.Infinite, stoppingToken);
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        await _processor.StopProcessingAsync(cancellationToken);
        await base.StopAsync(cancellationToken);
    }

    private async Task ProcessMessageAsync(ProcessMessageEventArgs args)
    {
        _logger.LogInformation("Processing message: {MessageId}", args.Message.MessageId);

        // Process the message
        await args.CompleteMessageAsync(args.Message);
    }

    private Task ProcessErrorAsync(ProcessErrorEventArgs args)
    {
        _logger.LogError(args.Exception, "Error processing message from {EntityPath}", args.EntityPath);
        return Task.CompletedTask;
    }

    public override async ValueTask DisposeAsync()
    {
        await _processor.DisposeAsync();
        await base.DisposeAsync();
    }
}
```

## Best Practices Summary

**Connection Management**
- Create one `ServiceBusClient` per application and reuse it
- `ServiceBusClient`, `ServiceBusSender`, and `ServiceBusReceiver` are all thread-safe
- Dispose clients gracefully on application shutdown

**Message Design**
- Use `MessageId` for duplicate detection
- Set `CorrelationId` to trace messages across services
- Keep message bodies small (under 256KB for Standard tier)
- Use `ApplicationProperties` for routing and filtering metadata

**Error Handling**
- Use `PeekLock` mode and explicitly complete or abandon messages
- Dead letter messages that fail permanently
- Monitor the dead letter queue and alert on growth
- Set appropriate `MaxDeliveryCount` at the queue level

**Performance**
- Enable prefetch (`PrefetchCount`) to reduce round trips
- Use batch operations for high-throughput scenarios
- Tune `MaxConcurrentCalls` based on your processing capacity
- Use sessions only when you need ordering or exclusive access

**Operations**
- Store connection strings in Azure Key Vault
- Use managed identities instead of connection strings when possible
- Monitor queue depth, dead letter count, and processing latency
- Set up alerts for queue backlogs and dead letter growth

Azure Service Bus is a powerful foundation for decoupled, reliable microservices. With proper error handling, batching, and monitoring, it can handle everything from simple work queues to complex event-driven architectures.

For monitoring your Service Bus queues, dead letter growth, and processing latency alongside your other infrastructure, check out [OneUptime](https://oneuptime.com) for unified observability across your entire stack.
