# How to Use Dapr with Azure Functions for Event Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure Function, Serverless, Event Processing, Azure

Description: Integrate Dapr with Azure Functions to build event-driven processing workflows combining Azure Functions triggers with Dapr bindings and pub/sub.

---

## Dapr and Azure Functions Together

Azure Functions provides serverless compute with rich trigger and binding support. Combining it with Dapr extends Functions with Dapr's service invocation, state management, and pub/sub capabilities - giving you the best of both: serverless scale-to-zero and Dapr's microservices building blocks.

The Dapr Extension for Azure Functions bridges the two systems.

## Installing the Dapr Functions Extension

```bash
# Install the Dapr extension for Azure Functions
dotnet add package Microsoft.Azure.WebJobs.Extensions.Dapr --prerelease
```

Or add to `extensions.csproj`:

```xml
<ItemGroup>
  <PackageReference Include="Microsoft.Azure.WebJobs.Extensions.Dapr" Version="1.*" />
</ItemGroup>
```

## Function Triggered by Dapr Pub/Sub

```csharp
// C# Azure Function triggered by Dapr pub/sub
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Dapr;
using Microsoft.Extensions.Logging;
using CloudNative.CloudEvents;
using Newtonsoft.Json;

public static class OrderProcessor
{
    [FunctionName("ProcessOrder")]
    public static void Run(
        [DaprTopicTrigger("pubsub", Topic = "orders")] CloudEvent cloudEvent,
        [DaprState("statestore", Key = "{data.orderId}")] out string processedOrder,
        ILogger log)
    {
        var order = JsonConvert.DeserializeObject<Order>(cloudEvent.Data.ToString());

        log.LogInformation($"Processing order {order.OrderId}");

        // Process the order
        order.Status = "processed";
        processedOrder = JsonConvert.SerializeObject(order);

        log.LogInformation($"Order {order.OrderId} processed");
    }
}

public class Order
{
    public string OrderId { get; set; }
    public string Item { get; set; }
    public string Status { get; set; }
}
```

## Function with Dapr Input and Output Bindings

```csharp
[FunctionName("InvoiceGenerator")]
public static IActionResult GenerateInvoice(
    [HttpTrigger(AuthorizationLevel.Function, "post")] HttpRequest req,
    [DaprInvoke(AppId = "invoice-service", MethodName = "create", HttpVerb = "post")]
        out InvokeMethodParameters invokeParams,
    ILogger log)
{
    string requestBody = new StreamReader(req.Body).ReadToEnd();
    var order = JsonConvert.DeserializeObject<Order>(requestBody);

    invokeParams = new InvokeMethodParameters
    {
        Body = new Invoice
        {
            OrderId = order.OrderId,
            Total = order.Total,
            CreatedAt = DateTime.UtcNow
        }
    };

    return new OkObjectResult("Invoice generation initiated");
}
```

## Publishing Events from Azure Functions

```csharp
[FunctionName("PublishNotification")]
public static void Notify(
    [TimerTrigger("0 */5 * * * *")] TimerInfo timer,
    [DaprPublish(PubSubName = "pubsub", Topic = "notifications")]
        out DaprPubSubEvent notification,
    ILogger log)
{
    notification = new DaprPubSubEvent(new
    {
        Message = "Scheduled check completed",
        Timestamp = DateTime.UtcNow
    });
}
```

## Local Development Setup

```json
// local.settings.json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet",
    "DAPR_HTTP_PORT": "3501"
  }
}
```

```bash
# Run Dapr alongside Azure Functions locally
dapr run \
  --app-id order-processor \
  --app-port 7071 \
  --dapr-http-port 3501 \
  --components-path ./components \
  -- func start
```

## Deploying to Azure Container Apps

Azure Container Apps natively supports Dapr:

```bash
az containerapp create \
  --name order-processor \
  --resource-group my-rg \
  --environment my-env \
  --image myorg/order-processor:latest \
  --enable-dapr \
  --dapr-app-id order-processor \
  --dapr-app-port 7071
```

## Summary

The Dapr Extension for Azure Functions provides first-class bindings that let Functions read from Dapr pub/sub topics, write to state stores, and invoke other Dapr services as trigger inputs and outputs. This combination enables event-driven architectures where Azure Functions handles the serverless scaling while Dapr manages the cross-service communication and state management concerns.
