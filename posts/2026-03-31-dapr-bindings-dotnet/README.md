# How to Use Dapr Bindings with .NET

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, .NET, Binding, C#, Integration

Description: Use Dapr input and output bindings in .NET to integrate with external systems like storage, email, Kafka, and cron triggers without coupling to specific SDKs.

---

## Overview

Dapr bindings connect your microservices to external systems. Output bindings let your app send data to external services, while input bindings let external events trigger your app. The .NET SDK handles serialization and binding invocation.

## Setup

```bash
dotnet add package Dapr.Client
dotnet add package Dapr.AspNetCore
```

## Output Bindings

### Invoke a Binding

```csharp
public class NotificationService
{
    private readonly DaprClient _dapr;

    public NotificationService(DaprClient dapr) => _dapr = dapr;

    // Send email via SMTP binding
    public async Task SendEmail(string to, string subject, string body)
    {
        await _dapr.InvokeBindingAsync(
            bindingName: "email-binding",
            operation: "create",
            data: body,
            metadata: new Dictionary<string, string>
            {
                ["emailTo"] = to,
                ["subject"] = subject
            }
        );
    }

    // Write to Azure Blob Storage
    public async Task SaveToBlob(string fileName, byte[] content)
    {
        await _dapr.InvokeBindingAsync(
            bindingName: "blob-storage",
            operation: "create",
            data: content,
            metadata: new Dictionary<string, string>
            {
                ["blobName"] = fileName,
                ["contentType"] = "application/octet-stream"
            }
        );
    }

    // Invoke with typed response
    public async Task<QueryResult> QueryDatabase(SqlQuery query)
    {
        return await _dapr.InvokeBindingAsync<SqlQuery, QueryResult>(
            "sql-binding",
            "query",
            query
        );
    }
}
```

## Input Bindings

Input bindings trigger your app when external events occur. Register a route matching the binding name:

```csharp
// Program.cs
var app = builder.Build();
app.MapControllers();
app.Run();
```

```csharp
[ApiController]
public class BindingController : ControllerBase
{
    // Triggered by a cron binding (e.g., every 5 minutes)
    [HttpPost("/scheduled-job")]
    public async Task<IActionResult> OnSchedule([FromBody] CronEvent evt)
    {
        Console.WriteLine($"Cron triggered at {DateTime.UtcNow}");
        await RunBatchJob();
        return Ok();
    }

    // Triggered by Kafka input binding
    [HttpPost("/kafka-messages")]
    public async Task<IActionResult> OnKafkaMessage([FromBody] KafkaMessage message)
    {
        Console.WriteLine($"Received: {message.Payload}");
        return Ok();
    }
}
```

## Binding Component Configuration

```yaml
# cron-binding.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: scheduled-job
spec:
  type: bindings.cron
  version: v1
  metadata:
    - name: schedule
      value: "@every 5m"
```

## Kafka Output Binding

```csharp
public async Task PublishToKafka(OrderEvent order)
{
    var metadata = new Dictionary<string, string>
    {
        ["partitionKey"] = order.OrderId,
        ["key"] = order.OrderId
    };

    await _dapr.InvokeBindingAsync(
        "kafka-output",
        "create",
        order,
        metadata
    );
}
```

## Using InvokeBindingAsync with Generics

```csharp
// Typed request (single generic parameter, no typed response)
var request = new TwilioMessage
{
    To = "+15551234567",
    Body = "Your order has shipped!"
};

await _dapr.InvokeBindingAsync<TwilioMessage>(
    "twilio-sms",
    "create",
    request
);
```

## Summary

Dapr bindings in .NET decouple your application from specific third-party SDKs. Output bindings use `InvokeBindingAsync` for fire-and-forget or request-response integration with external services, while input bindings trigger controller endpoints when external events arrive. This pattern makes it easy to swap between binding implementations (e.g., Kafka to Service Bus) with only component YAML changes.
