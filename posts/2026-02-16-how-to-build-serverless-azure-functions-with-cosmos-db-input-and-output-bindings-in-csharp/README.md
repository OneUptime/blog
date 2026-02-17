# How to Build Serverless Azure Functions with Cosmos DB Input and Output Bindings in C#

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Functions, Cosmos DB, C#, Serverless, Bindings, .NET, Cloud

Description: Use Azure Functions input and output bindings for Cosmos DB in C# to build serverless APIs without writing any database client code.

---

Azure Functions bindings are one of the most underappreciated features in the serverless world. Instead of writing code to connect to Cosmos DB, instantiate a client, execute queries, and handle connections, you declare what data you need in your function signature and the runtime handles the rest. Input bindings fetch data for you. Output bindings write data for you. It is declarative data access at its finest.

In this post, we will build a serverless API using Azure Functions with Cosmos DB input and output bindings in C#. We will cover the different binding types, when to use each one, and how to handle more complex scenarios.

## Prerequisites

- .NET 8 SDK
- Azure Functions Core Tools v4
- An Azure Cosmos DB account (SQL API)
- Visual Studio Code or Visual Studio

## Project Setup

Create a new Azure Functions project.

```bash
# Create a new Azure Functions project
func init CosmosBindingsDemo --dotnet --worker-runtime dotnet-isolated

cd CosmosBindingsDemo

# Add the Cosmos DB extension package
dotnet add package Microsoft.Azure.Functions.Worker.Extensions.CosmosDB
```

## The Simplest Pattern: Output Binding

Let us start with the simplest use case - writing a document to Cosmos DB when an HTTP request comes in. With an output binding, you do not write any Cosmos DB client code at all.

```csharp
// CreateOrder.cs
// HTTP trigger that writes a new order to Cosmos DB using an output binding
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System.Net;

namespace CosmosBindingsDemo;

public class CreateOrder
{
    // The output binding is declared as an attribute on a property
    // The function returns the document, and the runtime writes it to Cosmos DB
    [Function("CreateOrder")]
    [CosmosDBOutput(
        databaseName: "OrdersDB",
        containerName: "Orders",
        Connection = "CosmosDBConnection")]  // References a connection string in settings
    public object Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "orders")] HttpRequestData req)
    {
        // Read the request body
        var order = req.ReadFromJsonAsync<OrderInput>().Result;

        // Return the document - the output binding writes it to Cosmos DB
        return new
        {
            id = Guid.NewGuid().ToString(),
            customerId = order.CustomerId,
            items = order.Items,
            total = order.Items.Sum(i => i.Price * i.Quantity),
            status = "pending",
            createdAt = DateTime.UtcNow
        };
    }
}

// Input model for the HTTP request
public record OrderInput(string CustomerId, List<OrderItem> Items);
public record OrderItem(string ProductId, string Name, decimal Price, int Quantity);
```

That is it. No `CosmosClient`, no `Container.CreateItemAsync()`, no connection management. The runtime handles all of it.

## Input Binding: Read a Single Document

Input bindings fetch data from Cosmos DB before your function code runs. The simplest form reads a single document by ID.

```csharp
// GetOrder.cs
// HTTP trigger that reads a single order from Cosmos DB using an input binding
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System.Net;
using System.Text.Json;

namespace CosmosBindingsDemo;

public class GetOrder
{
    [Function("GetOrder")]
    public HttpResponseData Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "orders/{id}")] HttpRequestData req,
        // Input binding that reads the document by ID from the route parameter
        [CosmosDBInput(
            databaseName: "OrdersDB",
            containerName: "Orders",
            Connection = "CosmosDBConnection",
            Id = "{id}",                         // Binds to the route parameter
            PartitionKey = "{Query.customerId}")] // Partition key from query string
        object order)
    {
        var response = req.CreateResponse();

        if (order == null)
        {
            response.StatusCode = HttpStatusCode.NotFound;
            response.WriteString("Order not found");
            return response;
        }

        response.StatusCode = HttpStatusCode.OK;
        response.Headers.Add("Content-Type", "application/json");
        response.WriteString(JsonSerializer.Serialize(order));
        return response;
    }
}
```

The `{id}` syntax binds to the route parameter, and `{Query.customerId}` binds to a query string parameter. The runtime resolves these at invocation time.

## Input Binding: Query Multiple Documents

You can also use input bindings to run SQL queries against Cosmos DB.

```csharp
// ListOrders.cs
// HTTP trigger that queries orders for a customer using a SQL query input binding
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System.Net;
using System.Text.Json;

namespace CosmosBindingsDemo;

public class ListOrders
{
    [Function("ListOrders")]
    public HttpResponseData Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "customers/{customerId}/orders")]
        HttpRequestData req,
        // Input binding with a SQL query
        [CosmosDBInput(
            databaseName: "OrdersDB",
            containerName: "Orders",
            Connection = "CosmosDBConnection",
            SqlQuery = "SELECT * FROM c WHERE c.customerId = {customerId} ORDER BY c.createdAt DESC",
            PartitionKey = "{customerId}")]
        IEnumerable<object> orders)
    {
        var response = req.CreateResponse();
        response.StatusCode = HttpStatusCode.OK;
        response.Headers.Add("Content-Type", "application/json");
        response.WriteString(JsonSerializer.Serialize(orders));
        return response;
    }
}
```

The `{customerId}` in the SQL query gets replaced with the route parameter value. This is a parameterized query, so it is safe from injection attacks.

## Combined Input and Output Bindings

You can use both bindings in the same function. Here is an example that reads an order, updates its status, and writes the updated document back.

```csharp
// UpdateOrderStatus.cs
// Reads an order, updates its status, and writes it back using both bindings
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System.Net;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace CosmosBindingsDemo;

public class UpdateOrderStatus
{
    [Function("UpdateOrderStatus")]
    [CosmosDBOutput(
        databaseName: "OrdersDB",
        containerName: "Orders",
        Connection = "CosmosDBConnection")]
    public object? Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "patch", Route = "orders/{id}/status")]
        HttpRequestData req,
        [CosmosDBInput(
            databaseName: "OrdersDB",
            containerName: "Orders",
            Connection = "CosmosDBConnection",
            Id = "{id}",
            PartitionKey = "{Query.customerId}")]
        JsonNode order)
    {
        if (order == null)
        {
            return null;  // Nothing to write if order not found
        }

        // Read the new status from the request body
        var body = req.ReadFromJsonAsync<StatusUpdate>().Result;

        // Update the status field
        order["status"] = body.Status;
        order["updatedAt"] = DateTime.UtcNow.ToString("o");

        // Return the modified document - the output binding writes it back
        return JsonSerializer.Deserialize<object>(order.ToJsonString());
    }
}

public record StatusUpdate(string Status);
```

## Cosmos DB Trigger: React to Changes

The Cosmos DB trigger fires whenever documents are created or updated. It uses the Change Feed under the hood.

```csharp
// OrderChangeProcessor.cs
// Cosmos DB trigger that reacts to order changes
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace CosmosBindingsDemo;

public class OrderChangeProcessor
{
    private readonly ILogger<OrderChangeProcessor> _logger;

    public OrderChangeProcessor(ILogger<OrderChangeProcessor> logger)
    {
        _logger = logger;
    }

    [Function("OrderChangeProcessor")]
    // Output binding to write notifications to another container
    [CosmosDBOutput(
        databaseName: "OrdersDB",
        containerName: "Notifications",
        Connection = "CosmosDBConnection",
        CreateIfNotExists = true)]
    public object? Run(
        // Trigger that fires on changes to the Orders container
        [CosmosDBTrigger(
            databaseName: "OrdersDB",
            containerName: "Orders",
            Connection = "CosmosDBConnection",
            LeaseContainerName = "leases",
            CreateLeaseContainerIfNotExists = true)]
        IReadOnlyList<JsonElement> changes)
    {
        if (changes == null || changes.Count == 0) return null;

        _logger.LogInformation("Processing {Count} order changes", changes.Count);

        // Process each changed document
        var notifications = new List<object>();
        foreach (var change in changes)
        {
            var orderId = change.GetProperty("id").GetString();
            var status = change.GetProperty("status").GetString();
            var customerId = change.GetProperty("customerId").GetString();

            _logger.LogInformation("Order {OrderId} status: {Status}", orderId, status);

            // Create a notification for status changes
            if (status == "shipped" || status == "delivered")
            {
                notifications.Add(new
                {
                    id = Guid.NewGuid().ToString(),
                    customerId,
                    orderId,
                    message = $"Your order {orderId} has been {status}",
                    createdAt = DateTime.UtcNow,
                    read = false
                });
            }
        }

        // Return notifications to be written by the output binding
        return notifications.Count > 0 ? notifications : null;
    }
}
```

## Local Settings

Configure the connection string in `local.settings.json` for local development.

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "CosmosDBConnection": "AccountEndpoint=https://your-account.documents.azure.com:443/;AccountKey=your-key;"
  }
}
```

## Deploy to Azure

```bash
# Create a Function App
az functionapp create \
  --resource-group orders-rg \
  --consumption-plan-location eastus \
  --runtime dotnet-isolated \
  --runtime-version 8 \
  --functions-version 4 \
  --name orders-functions-app \
  --storage-account ordersstorage

# Set the Cosmos DB connection string
az functionapp config appsettings set \
  --name orders-functions-app \
  --resource-group orders-rg \
  --settings CosmosDBConnection="AccountEndpoint=https://...;AccountKey=..."

# Deploy the function app
func azure functionapp publish orders-functions-app
```

## When to Use Bindings vs. the SDK

Bindings are great for straightforward CRUD operations and simple queries. But they have limitations:

- No support for transactions or batch operations
- Limited control over consistency levels
- No support for stored procedures or user-defined functions
- Queries in input bindings do not support continuation tokens for pagination

When you need these features, use the Cosmos DB SDK directly alongside bindings. You can inject `CosmosClient` into your functions using dependency injection.

```csharp
// Program.cs
// Configure dependency injection with the Cosmos DB client
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureServices(services =>
    {
        // Register CosmosClient as a singleton for functions that need direct SDK access
        services.AddSingleton(sp =>
        {
            var connectionString = Environment.GetEnvironmentVariable("CosmosDBConnection");
            return new CosmosClient(connectionString);
        });
    })
    .Build();

host.Run();
```

## Summary

Cosmos DB bindings in Azure Functions let you build serverless APIs with minimal boilerplate. The input binding fetches data, the output binding writes data, and the trigger reacts to changes - all without explicit SDK code. For simple CRUD operations, this is the fastest path from idea to production. When your requirements get more complex, you can always fall back to the SDK while still using bindings where they make sense. The combination of Azure Functions and Cosmos DB bindings is particularly well-suited for event-driven architectures where you react to data changes and fan out to other services.
