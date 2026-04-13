# How to Use Dapr with Azure Functions Extension

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Azure Function, Extension, Serverless, Trigger

Description: Use the Dapr Azure Functions extension to trigger functions from Dapr pub/sub events, invoke Dapr services, and manage state from serverless function code.

---

The Dapr Azure Functions extension bridges serverless Azure Functions with the Dapr building blocks. Functions can be triggered by Dapr pub/sub events, invoke Dapr services, and read and write Dapr state stores without managing HTTP calls to the Dapr sidecar.

## Install the Dapr Azure Functions Extension

```bash
# Install the extension in an Azure Functions project
dotnet add package Microsoft.Azure.WebJobs.Extensions.Dapr --version 1.0.0

# Or for isolated worker process
dotnet add package Microsoft.Azure.Functions.Worker.Extensions.Dapr --version 1.0.0
```

For Python Azure Functions, add the Dapr extension bundle to `host.json`:

```json
{
  "version": "2.0",
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.0.0, 5.0.0)"
  }
}
```

## Trigger a Function from a Dapr Pub/Sub Event

```csharp
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Dapr;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;

public static class OrderProcessor
{
    [FunctionName("ProcessOrder")]
    public static void Run(
        [DaprTopicTrigger("orderpubsub", Topic = "orders")] JObject order,
        ILogger log)
    {
        log.LogInformation($"Processing order: {order["id"]}");
        // Process the order...
    }
}
```

Python equivalent:

```python
import azure.functions as func
import logging
import json

app = func.FunctionApp()

@app.function_name("ProcessOrder")
@app.dapr_topic_trigger(
    arg_name="event",
    pub_sub_name="orderpubsub",
    topic="orders"
)
def process_order(event: str) -> None:
    order = json.loads(event)
    logging.info(f"Processing order: {order['id']}")
```

## Invoke a Dapr Service from a Function

```csharp
[FunctionName("CreateOrder")]
public static IActionResult CreateOrder(
    [HttpTrigger(AuthorizationLevel.Function, "post")] HttpRequest req,
    [DaprInvoke(AppId = "inventory-service", MethodName = "reserve", HttpVerb = "POST")]
    out InvokeMethodParameters invokeParams,
    ILogger log)
{
    var order = new JObject {
        ["orderId"] = Guid.NewGuid().ToString(),
        ["items"] = new JArray("item-1", "item-2")
    };

    invokeParams = new InvokeMethodParameters { Body = order };
    return new OkObjectResult(new { orderId = order["orderId"] });
}
```

## Read and Write Dapr State

```csharp
[FunctionName("GetOrderState")]
public static IActionResult GetOrderState(
    [HttpTrigger(AuthorizationLevel.Function, "get", Route = "orders/{orderId}")]
    HttpRequest req,
    [DaprState("statestore", Key = "{orderId}")] JObject order,
    ILogger log)
{
    if (order == null)
        return new NotFoundResult();

    return new OkObjectResult(order);
}

[FunctionName("SaveOrderState")]
public static void SaveOrderState(
    [DaprTopicTrigger("orderpubsub", Topic = "order-confirmed")] JObject order,
    [DaprState("statestore", Key = "{data.id}")] out JObject savedOrder,
    ILogger log)
{
    order["savedAt"] = DateTime.UtcNow.ToString("o");
    savedOrder = order;
}
```

## Publish Events from a Function

```python
@app.function_name("PublishOrderEvent")
@app.route(route="orders", methods=["POST"])
@app.dapr_publish_output(
    arg_name="order_event",
    pub_sub_name="orderpubsub",
    topic="order-placed"
)
def publish_order_event(req: func.HttpRequest, order_event: func.Out[str]) -> func.HttpResponse:
    import json
    order = req.get_json()
    order_event.set(json.dumps(order))
    return func.HttpResponse(f"Order published: {order['id']}", status_code=200)
```

## Deploy Functions with Dapr Sidecar

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-functions
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-functions"
        dapr.io/app-port: "7071"
        dapr.io/app-protocol: "http"
```

## Summary

The Dapr Azure Functions extension integrates pub/sub triggers, service invocation, and state management directly into Azure Functions bindings. Developers write standard Functions code with Dapr-specific attributes or decorators, and the extension handles sidecar communication transparently. This approach combines the serverless execution model of Azure Functions with the Dapr building blocks for distributed application patterns.
