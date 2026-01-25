# How to Build RabbitMQ Consumers with MassTransit in .NET

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: .NET, RabbitMQ, MassTransit, Message Queue, C#, Microservices

Description: Learn how to build reliable RabbitMQ consumers using MassTransit in .NET applications with practical examples covering message handling, retry policies, and error handling.

---

MassTransit is a powerful message bus framework for .NET that abstracts away the complexity of working with message brokers like RabbitMQ. Instead of dealing with raw AMQP protocol details, you work with strongly-typed messages and consumers. This guide walks you through building production-ready RabbitMQ consumers with MassTransit.

## Why MassTransit?

Working directly with RabbitMQ requires handling connections, channels, serialization, error queues, and retry logic manually. MassTransit provides all of this out of the box:

| Feature | Raw RabbitMQ | MassTransit |
|---------|--------------|-------------|
| Connection management | Manual | Automatic |
| Serialization | Manual | Built-in JSON/XML |
| Retry policies | Custom code | Configurable |
| Dead letter queues | Manual setup | Automatic |
| Dependency injection | Manual | Native support |

## Setting Up MassTransit

First, install the required NuGet packages:

```bash
dotnet add package MassTransit
dotnet add package MassTransit.RabbitMQ
```

Configure MassTransit in your application:

```csharp
// Program.cs
using MassTransit;

var builder = WebApplication.CreateBuilder(args);

// Add MassTransit with RabbitMQ
builder.Services.AddMassTransit(config =>
{
    // Register all consumers from this assembly
    config.AddConsumers(typeof(Program).Assembly);

    config.UsingRabbitMq((context, cfg) =>
    {
        // Connection settings
        cfg.Host("localhost", "/", h =>
        {
            h.Username("guest");
            h.Password("guest");
        });

        // Automatically configure endpoints for registered consumers
        cfg.ConfigureEndpoints(context);
    });
});

var app = builder.Build();
app.Run();
```

## Defining Messages

Messages are plain C# classes or records. Use records for immutability:

```csharp
// Messages/OrderSubmitted.cs
namespace MyApp.Messages;

// Event message - something that happened
public record OrderSubmitted
{
    public Guid OrderId { get; init; }
    public string CustomerId { get; init; } = string.Empty;
    public List<OrderItem> Items { get; init; } = new();
    public decimal TotalAmount { get; init; }
    public DateTime SubmittedAt { get; init; }
}

public record OrderItem
{
    public string ProductId { get; init; } = string.Empty;
    public int Quantity { get; init; }
    public decimal UnitPrice { get; init; }
}

// Command message - request for action
public record ProcessPayment
{
    public Guid OrderId { get; init; }
    public decimal Amount { get; init; }
    public string PaymentMethod { get; init; } = string.Empty;
}
```

## Creating a Basic Consumer

A consumer handles a specific message type:

```csharp
// Consumers/OrderSubmittedConsumer.cs
using MassTransit;
using MyApp.Messages;

public class OrderSubmittedConsumer : IConsumer<OrderSubmitted>
{
    private readonly ILogger<OrderSubmittedConsumer> _logger;
    private readonly IOrderRepository _orderRepository;

    public OrderSubmittedConsumer(
        ILogger<OrderSubmittedConsumer> logger,
        IOrderRepository orderRepository)
    {
        _logger = logger;
        _orderRepository = orderRepository;
    }

    public async Task Consume(ConsumeContext<OrderSubmitted> context)
    {
        var message = context.Message;

        _logger.LogInformation(
            "Processing order {OrderId} for customer {CustomerId}",
            message.OrderId,
            message.CustomerId);

        // Save the order to the database
        await _orderRepository.SaveOrderAsync(new Order
        {
            Id = message.OrderId,
            CustomerId = message.CustomerId,
            Items = message.Items,
            TotalAmount = message.TotalAmount,
            Status = OrderStatus.Pending
        });

        // Publish follow-up event
        await context.Publish(new OrderCreated
        {
            OrderId = message.OrderId,
            CreatedAt = DateTime.UtcNow
        });

        _logger.LogInformation("Order {OrderId} processed successfully", message.OrderId);
    }
}
```

## Configuring Consumer Endpoints

Customize queue names and settings:

```csharp
// Program.cs
builder.Services.AddMassTransit(config =>
{
    config.AddConsumer<OrderSubmittedConsumer>();
    config.AddConsumer<PaymentProcessorConsumer>();

    config.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host("localhost", "/", h =>
        {
            h.Username("guest");
            h.Password("guest");
        });

        // Configure specific endpoint for order processing
        cfg.ReceiveEndpoint("order-processing", e =>
        {
            // Prefetch count - how many messages to fetch at once
            e.PrefetchCount = 16;

            // Concurrent message limit
            e.ConcurrentMessageLimit = 8;

            e.ConfigureConsumer<OrderSubmittedConsumer>(context);
        });

        // Configure payment processing endpoint
        cfg.ReceiveEndpoint("payment-processing", e =>
        {
            e.PrefetchCount = 4;
            e.ConcurrentMessageLimit = 2;

            e.ConfigureConsumer<PaymentProcessorConsumer>(context);
        });
    });
});
```

## Implementing Retry Policies

MassTransit supports multiple retry strategies:

```csharp
// Program.cs - Global retry configuration
config.UsingRabbitMq((context, cfg) =>
{
    cfg.Host("localhost");

    // Global retry policy for all consumers
    cfg.UseMessageRetry(r =>
    {
        // Retry 3 times with exponential backoff
        r.Exponential(
            retryLimit: 3,
            minInterval: TimeSpan.FromSeconds(1),
            maxInterval: TimeSpan.FromSeconds(30),
            intervalDelta: TimeSpan.FromSeconds(2));

        // Only retry on specific exceptions
        r.Handle<TimeoutException>();
        r.Handle<HttpRequestException>();

        // Ignore certain exceptions
        r.Ignore<ValidationException>();
    });

    cfg.ConfigureEndpoints(context);
});
```

Consumer-specific retry configuration:

```csharp
// Per-endpoint retry policy
cfg.ReceiveEndpoint("payment-processing", e =>
{
    e.UseMessageRetry(r =>
    {
        // Different retry strategy for payments
        r.Intervals(
            TimeSpan.FromSeconds(5),
            TimeSpan.FromSeconds(15),
            TimeSpan.FromSeconds(30),
            TimeSpan.FromMinutes(1));
    });

    e.ConfigureConsumer<PaymentProcessorConsumer>(context);
});
```

## Error Handling and Dead Letter Queues

Handle errors gracefully in consumers:

```csharp
// Consumers/PaymentProcessorConsumer.cs
public class PaymentProcessorConsumer : IConsumer<ProcessPayment>
{
    private readonly ILogger<PaymentProcessorConsumer> _logger;
    private readonly IPaymentGateway _paymentGateway;

    public PaymentProcessorConsumer(
        ILogger<PaymentProcessorConsumer> logger,
        IPaymentGateway paymentGateway)
    {
        _logger = logger;
        _paymentGateway = paymentGateway;
    }

    public async Task Consume(ConsumeContext<ProcessPayment> context)
    {
        var message = context.Message;

        try
        {
            var result = await _paymentGateway.ProcessAsync(
                message.OrderId,
                message.Amount,
                message.PaymentMethod);

            if (result.Success)
            {
                await context.Publish(new PaymentCompleted
                {
                    OrderId = message.OrderId,
                    TransactionId = result.TransactionId
                });
            }
            else
            {
                // Publish failure event instead of throwing
                await context.Publish(new PaymentFailed
                {
                    OrderId = message.OrderId,
                    Reason = result.ErrorMessage
                });
            }
        }
        catch (PaymentGatewayException ex)
        {
            _logger.LogError(ex, "Payment gateway error for order {OrderId}", message.OrderId);

            // Rethrow to trigger retry
            throw;
        }
    }
}
```

Configure error queue handling:

```csharp
cfg.ReceiveEndpoint("payment-processing", e =>
{
    // Messages that fail all retries go to _error queue
    e.ConfigureError(error =>
    {
        // Custom error handling
        error.UseFilter(new ErrorHandlerFilter<ProcessPayment>());
    });

    // Configure dead letter exchange
    e.BindDeadLetterQueue("payment-dead-letter");

    e.ConfigureConsumer<PaymentProcessorConsumer>(context);
});
```

## Publishing Messages

Send messages from anywhere using the IBus or IPublishEndpoint:

```csharp
// Controllers/OrdersController.cs
[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly IPublishEndpoint _publishEndpoint;

    public OrdersController(IPublishEndpoint publishEndpoint)
    {
        _publishEndpoint = publishEndpoint;
    }

    [HttpPost]
    public async Task<IActionResult> CreateOrder(CreateOrderRequest request)
    {
        var orderId = Guid.NewGuid();

        // Publish the event
        await _publishEndpoint.Publish(new OrderSubmitted
        {
            OrderId = orderId,
            CustomerId = request.CustomerId,
            Items = request.Items.Select(i => new OrderItem
            {
                ProductId = i.ProductId,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice
            }).ToList(),
            TotalAmount = request.Items.Sum(i => i.Quantity * i.UnitPrice),
            SubmittedAt = DateTime.UtcNow
        });

        return Accepted(new { orderId });
    }
}
```

## Request/Response Pattern

For scenarios requiring responses:

```csharp
// Messages/CheckInventory.cs
public record CheckInventory
{
    public string ProductId { get; init; } = string.Empty;
    public int RequestedQuantity { get; init; }
}

public record InventoryResult
{
    public bool Available { get; init; }
    public int CurrentStock { get; init; }
}

// Consumer that responds to requests
public class InventoryCheckConsumer : IConsumer<CheckInventory>
{
    private readonly IInventoryService _inventoryService;

    public InventoryCheckConsumer(IInventoryService inventoryService)
    {
        _inventoryService = inventoryService;
    }

    public async Task Consume(ConsumeContext<CheckInventory> context)
    {
        var stock = await _inventoryService.GetStockAsync(context.Message.ProductId);

        // Send response back to the requestor
        await context.RespondAsync(new InventoryResult
        {
            Available = stock >= context.Message.RequestedQuantity,
            CurrentStock = stock
        });
    }
}
```

Make requests from a client:

```csharp
// Making a request
public class OrderService
{
    private readonly IRequestClient<CheckInventory> _inventoryClient;

    public OrderService(IRequestClient<CheckInventory> inventoryClient)
    {
        _inventoryClient = inventoryClient;
    }

    public async Task<bool> CheckProductAvailability(string productId, int quantity)
    {
        var response = await _inventoryClient.GetResponse<InventoryResult>(
            new CheckInventory
            {
                ProductId = productId,
                RequestedQuantity = quantity
            },
            timeout: TimeSpan.FromSeconds(30));

        return response.Message.Available;
    }
}
```

## Consumer Filters

Add cross-cutting concerns with filters:

```csharp
// Filters/LoggingFilter.cs
public class LoggingFilter<T> : IFilter<ConsumeContext<T>> where T : class
{
    private readonly ILogger _logger;

    public LoggingFilter(ILogger<LoggingFilter<T>> logger)
    {
        _logger = logger;
    }

    public async Task Send(ConsumeContext<T> context, IPipe<ConsumeContext<T>> next)
    {
        var messageType = typeof(T).Name;
        var messageId = context.MessageId;

        _logger.LogInformation(
            "Starting to consume {MessageType} with ID {MessageId}",
            messageType, messageId);

        var stopwatch = Stopwatch.StartNew();

        try
        {
            await next.Send(context);

            _logger.LogInformation(
                "Consumed {MessageType} in {ElapsedMs}ms",
                messageType, stopwatch.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Error consuming {MessageType} after {ElapsedMs}ms",
                messageType, stopwatch.ElapsedMilliseconds);
            throw;
        }
    }

    public void Probe(ProbeContext context)
    {
        context.CreateFilterScope("logging");
    }
}

// Register the filter
cfg.ReceiveEndpoint("order-processing", e =>
{
    e.UseFilter(new LoggingFilter<OrderSubmitted>(logger));
    e.ConfigureConsumer<OrderSubmittedConsumer>(context);
});
```

## Testing Consumers

MassTransit provides test harnesses:

```csharp
// Tests/OrderSubmittedConsumerTests.cs
using MassTransit.Testing;

public class OrderSubmittedConsumerTests
{
    [Fact]
    public async Task Should_Consume_OrderSubmitted_Message()
    {
        // Arrange
        await using var provider = new ServiceCollection()
            .AddMassTransitTestHarness(cfg =>
            {
                cfg.AddConsumer<OrderSubmittedConsumer>();
            })
            .AddScoped<IOrderRepository, FakeOrderRepository>()
            .BuildServiceProvider(true);

        var harness = provider.GetRequiredService<ITestHarness>();
        await harness.Start();

        // Act
        await harness.Bus.Publish(new OrderSubmitted
        {
            OrderId = Guid.NewGuid(),
            CustomerId = "customer-123",
            Items = new List<OrderItem>(),
            TotalAmount = 100m,
            SubmittedAt = DateTime.UtcNow
        });

        // Assert
        Assert.True(await harness.Consumed.Any<OrderSubmitted>());

        var consumerHarness = harness.GetConsumerHarness<OrderSubmittedConsumer>();
        Assert.True(await consumerHarness.Consumed.Any<OrderSubmitted>());
    }
}
```

## Summary

MassTransit simplifies building message-based applications with RabbitMQ by providing a clean abstraction over the messaging infrastructure. With built-in support for retry policies, error handling, and dependency injection, you can focus on business logic instead of plumbing code.

Start with simple consumers and gradually add complexity as needed. The framework scales from simple pub/sub scenarios to complex saga orchestrations. By following the patterns shown here, you will build reliable and maintainable message-driven applications.
