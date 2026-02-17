# How to Create Azure Functions in C# with Queue Triggers and Table Storage Bindings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Functions, C#, Serverless, Queue Trigger, Table Storage, Bindings, .NET

Description: Build serverless Azure Functions in C# using queue triggers and Azure Table Storage bindings for event-driven processing workflows.

---

Azure Functions shines when you need to react to events without managing infrastructure. In .NET, the isolated worker model gives you a clean, dependency-injection-friendly way to write functions. Queue triggers and Table Storage bindings are a common combination - a message arrives on a queue, your function processes it, and the result gets written to Table Storage. No SDK boilerplate, no connection management, just business logic.

In this post, I will build functions that use Azure Storage Queue triggers and Table Storage bindings in C#.

## Setting Up the Project

Create an Azure Functions project using the isolated worker model.

```bash
# Create the project
func init QueueFunctions --dotnet-isolated --target-framework net8.0
cd QueueFunctions

# Add required packages
dotnet add package Microsoft.Azure.Functions.Worker
dotnet add package Microsoft.Azure.Functions.Worker.Extensions.Storage.Queues
dotnet add package Microsoft.Azure.Functions.Worker.Extensions.Tables
dotnet add package Microsoft.Azure.Functions.Worker.Extensions.Http
```

## Basic Queue Trigger

A queue trigger fires whenever a new message appears in an Azure Storage Queue.

```csharp
// Functions/OrderProcessor.cs
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

public class OrderProcessor
{
    private readonly ILogger<OrderProcessor> _logger;

    public OrderProcessor(ILogger<OrderProcessor> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Triggered when a new message arrives in the "orders" queue.
    /// The message body is automatically deserialized to the Order type.
    /// </summary>
    [Function("ProcessOrder")]
    public void ProcessOrder(
        [QueueTrigger("orders", Connection = "AzureWebJobsStorage")] Order order)
    {
        _logger.LogInformation(
            "Processing order {OrderId} for customer {CustomerId}, total: ${Total}",
            order.OrderId, order.CustomerId, order.Total);

        // Your business logic here
        // Validate the order, charge the payment, etc.
    }
}

// Models
public class Order
{
    public string OrderId { get; set; } = string.Empty;
    public string CustomerId { get; set; } = string.Empty;
    public decimal Total { get; set; }
    public string Status { get; set; } = "pending";
    public List<OrderItem> Items { get; set; } = new();
}

public class OrderItem
{
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal Price { get; set; }
}
```

## Queue Output Binding

You can write messages to a queue using an output binding. This is useful for chaining functions together.

```csharp
// Functions/OrderReceiver.cs
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Text.Json;

public class OrderReceiver
{
    private readonly ILogger<OrderReceiver> _logger;

    public OrderReceiver(ILogger<OrderReceiver> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// HTTP endpoint that receives orders and places them on a queue.
    /// The queue output binding handles serialization and delivery.
    /// </summary>
    [Function("ReceiveOrder")]
    public OrderReceiverOutput ReceiveOrder(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "orders")] HttpRequestData req)
    {
        var order = req.ReadFromJsonAsync<Order>().Result;

        if (order == null || string.IsNullOrEmpty(order.OrderId))
        {
            var badResponse = req.CreateResponse(HttpStatusCode.BadRequest);
            badResponse.WriteString("Invalid order data");
            return new OrderReceiverOutput { HttpResponse = badResponse };
        }

        order.Status = "queued";
        _logger.LogInformation("Order {OrderId} queued for processing", order.OrderId);

        var response = req.CreateResponse(HttpStatusCode.Accepted);
        response.WriteAsJsonAsync(new { message = "Order accepted", orderId = order.OrderId });

        return new OrderReceiverOutput
        {
            HttpResponse = response,
            QueueMessage = order  // This gets placed on the queue automatically
        };
    }
}

/// <summary>
/// Output type that includes both the HTTP response and the queue message.
/// The framework handles routing each output to the right destination.
/// </summary>
public class OrderReceiverOutput
{
    [HttpResult]
    public HttpResponseData HttpResponse { get; set; } = null!;

    [QueueOutput("orders", Connection = "AzureWebJobsStorage")]
    public Order? QueueMessage { get; set; }
}
```

## Table Storage Bindings

Table Storage is a NoSQL key-value store built into Azure Storage accounts. It is perfect for storing processing results, audit logs, and lookup data.

```csharp
// Functions/OrderProcessorWithTable.cs
using Azure.Data.Tables;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

public class OrderProcessorWithTable
{
    private readonly ILogger<OrderProcessorWithTable> _logger;

    public OrderProcessorWithTable(ILogger<OrderProcessorWithTable> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Process an order from the queue and save the result to Table Storage.
    /// The table output binding creates the table and inserts the entity automatically.
    /// </summary>
    [Function("ProcessAndStore")]
    [TableOutput("ProcessedOrders", Connection = "AzureWebJobsStorage")]
    public ProcessedOrderEntity ProcessAndStore(
        [QueueTrigger("orders", Connection = "AzureWebJobsStorage")] Order order)
    {
        _logger.LogInformation("Processing order {OrderId}", order.OrderId);

        // Simulate processing
        var isValid = order.Total > 0 && order.Items.Count > 0;
        var status = isValid ? "completed" : "rejected";

        _logger.LogInformation(
            "Order {OrderId} processed: {Status}",
            order.OrderId, status);

        // Return the entity to be written to Table Storage
        return new ProcessedOrderEntity
        {
            PartitionKey = order.CustomerId,
            RowKey = order.OrderId,
            Total = order.Total,
            ItemCount = order.Items.Count,
            Status = status,
            ProcessedAt = DateTime.UtcNow
        };
    }
}

/// <summary>
/// Table Storage entity for processed orders.
/// PartitionKey groups related entities for efficient queries.
/// RowKey is unique within a partition.
/// </summary>
public class ProcessedOrderEntity : ITableEntity
{
    public string PartitionKey { get; set; } = string.Empty;
    public string RowKey { get; set; } = string.Empty;
    public DateTimeOffset? Timestamp { get; set; }
    public Azure.ETag ETag { get; set; }

    // Custom properties
    public decimal Total { get; set; }
    public int ItemCount { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime ProcessedAt { get; set; }
}
```

## Table Storage Input Binding

Read data from Table Storage using input bindings.

```csharp
// Functions/OrderLookup.cs
using Azure.Data.Tables;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System.Net;

public class OrderLookup
{
    /// <summary>
    /// Look up a processed order from Table Storage by customer ID and order ID.
    /// The input binding retrieves the entity using PartitionKey and RowKey.
    /// </summary>
    [Function("GetOrder")]
    public HttpResponseData GetOrder(
        [HttpTrigger(AuthorizationLevel.Function, "get", Route = "orders/{customerId}/{orderId}")] HttpRequestData req,
        [TableInput("ProcessedOrders", "{customerId}", "{orderId}", Connection = "AzureWebJobsStorage")] ProcessedOrderEntity? entity)
    {
        if (entity == null)
        {
            var notFound = req.CreateResponse(HttpStatusCode.NotFound);
            return notFound;
        }

        var response = req.CreateResponse(HttpStatusCode.OK);
        response.WriteAsJsonAsync(new
        {
            orderId = entity.RowKey,
            customerId = entity.PartitionKey,
            total = entity.Total,
            status = entity.Status,
            processedAt = entity.ProcessedAt
        });

        return response;
    }
}
```

## Querying Table Storage

For more complex queries, inject the TableClient directly.

```csharp
// Functions/OrderReport.cs
using Azure.Data.Tables;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System.Net;

public class OrderReport
{
    private readonly TableClient _tableClient;

    public OrderReport(TableServiceClient tableServiceClient)
    {
        _tableClient = tableServiceClient.GetTableClient("ProcessedOrders");
    }

    /// <summary>
    /// Get all orders for a specific customer from Table Storage.
    /// Uses the TableClient for querying by partition key.
    /// </summary>
    [Function("GetCustomerOrders")]
    public async Task<HttpResponseData> GetCustomerOrders(
        [HttpTrigger(AuthorizationLevel.Function, "get", Route = "customers/{customerId}/orders")] HttpRequestData req,
        string customerId)
    {
        var orders = new List<object>();

        // Query all entities in the customer's partition
        await foreach (var entity in _tableClient.QueryAsync<ProcessedOrderEntity>(
            filter: $"PartitionKey eq '{customerId}'"))
        {
            orders.Add(new
            {
                orderId = entity.RowKey,
                total = entity.Total,
                status = entity.Status,
                processedAt = entity.ProcessedAt
            });
        }

        var response = req.CreateResponse(HttpStatusCode.OK);
        await response.WriteAsJsonAsync(new
        {
            customerId,
            orderCount = orders.Count,
            orders
        });

        return response;
    }
}
```

## Configuring Dependency Injection

Register services in Program.cs.

```csharp
// Program.cs
using Azure.Data.Tables;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureServices(services =>
    {
        // Register TableServiceClient for direct table queries
        services.AddSingleton(new TableServiceClient(
            Environment.GetEnvironmentVariable("AzureWebJobsStorage")
        ));

        // Add Application Insights
        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();
    })
    .Build();

host.Run();
```

## Poison Message Handling

When a queue message fails processing repeatedly, it goes to a poison queue. Handle these separately.

```csharp
// Functions/PoisonMessageHandler.cs
public class PoisonMessageHandler
{
    private readonly ILogger<PoisonMessageHandler> _logger;

    public PoisonMessageHandler(ILogger<PoisonMessageHandler> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Handle messages that failed processing 5 times.
    /// Azure Functions automatically moves them to the "orders-poison" queue.
    /// </summary>
    [Function("HandlePoisonOrder")]
    [TableOutput("FailedOrders", Connection = "AzureWebJobsStorage")]
    public FailedOrderEntity HandlePoisonOrder(
        [QueueTrigger("orders-poison", Connection = "AzureWebJobsStorage")] string poisonMessage)
    {
        _logger.LogWarning("Poison message received: {Message}", poisonMessage);

        // Log the failure for investigation
        return new FailedOrderEntity
        {
            PartitionKey = "poison",
            RowKey = Guid.NewGuid().ToString(),
            OriginalMessage = poisonMessage,
            FailedAt = DateTime.UtcNow
        };
    }
}

public class FailedOrderEntity : ITableEntity
{
    public string PartitionKey { get; set; } = string.Empty;
    public string RowKey { get; set; } = string.Empty;
    public DateTimeOffset? Timestamp { get; set; }
    public Azure.ETag ETag { get; set; }
    public string OriginalMessage { get; set; } = string.Empty;
    public DateTime FailedAt { get; set; }
}
```

## Local Development

Configure local.settings.json for development.

```json
{
    "IsEncrypted": false,
    "Values": {
        "AzureWebJobsStorage": "UseDevelopmentStorage=true",
        "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated"
    }
}
```

Run with Azurite for local storage emulation.

```bash
# Start Azurite
azurite --silent --location /tmp/azurite

# Start the functions
func start

# Send a test message to the queue
az storage message put \
    --queue-name orders \
    --content '{"OrderId":"TEST-001","CustomerId":"CUST-1","Total":99.99,"Items":[{"ProductName":"Widget","Quantity":2,"Price":49.99}]}' \
    --connection-string "UseDevelopmentStorage=true"
```

## Deploying to Azure

```bash
# Create the function app
az functionapp create \
    --name order-functions \
    --resource-group my-rg \
    --storage-account myfuncstorage \
    --consumption-plan-location eastus \
    --runtime dotnet-isolated \
    --functions-version 4

# Deploy
func azure functionapp publish order-functions
```

## Best Practices

1. **Use the isolated worker model.** It gives you full control over dependency injection and middleware.
2. **Handle poison messages.** Do not let failed messages disappear silently.
3. **Choose partition keys wisely** for Table Storage. Queries within a partition are fast; cross-partition queries are slow.
4. **Use output bindings** instead of creating SDK clients manually when possible.
5. **Monitor queue length** to detect processing bottlenecks.
6. **Set appropriate visibility timeouts** on queues to prevent duplicate processing.

## Wrapping Up

Queue triggers and Table Storage bindings make Azure Functions an efficient tool for event-driven processing in .NET. The queue handles work distribution and retry logic, your function contains the business logic, and Table Storage provides cheap, fast storage for results. The binding model means you write less infrastructure code and more business logic.
