# How to Build a Supply Chain Management System with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Supply Chain, Microservice, Workflow, Event-Driven

Description: Learn how to build a distributed supply chain management system using Dapr workflows, pub/sub, and state management for order tracking.

---

## Overview

Supply chain systems coordinate inventory, procurement, logistics, and fulfillment across multiple services. Dapr's workflow engine and pub/sub capabilities make it straightforward to model these multi-step processes reliably with built-in retries and compensation logic.

## Service Architecture

The system consists of:

- **Order Service** - accepts and tracks customer orders
- **Inventory Service** - manages stock levels
- **Fulfillment Service** - coordinates picking, packing, and shipping
- **Supplier Service** - triggers reorder requests when stock is low

## Multi-App Run Configuration

```yaml
# dapr.yaml
version: 1
apps:
  - appID: order-service
    appDirPath: ./order-service
    appPort: 5001
    command: ["dotnet", "run"]
  - appID: inventory-service
    appDirPath: ./inventory-service
    appPort: 5002
    command: ["dotnet", "run"]
  - appID: fulfillment-service
    appDirPath: ./fulfillment-service
    appPort: 5003
    command: ["dotnet", "run"]
```

```bash
dapr run -f dapr.yaml
```

## Order Placement with Workflow

Use Dapr workflows to orchestrate the order fulfillment process:

```csharp
public class OrderFulfillmentWorkflow : Workflow<OrderRequest, OrderResult>
{
    public override async Task<OrderResult> RunAsync(
        WorkflowContext context, OrderRequest order)
    {
        // Step 1: Reserve inventory
        var reserved = await context.CallActivityAsync<bool>(
            "ReserveInventory",
            new ReserveRequest { Sku = order.Sku, Quantity = order.Quantity }
        );

        if (!reserved)
        {
            return new OrderResult { Status = "out-of-stock" };
        }

        // Step 2: Process payment
        await context.CallActivityAsync("ProcessPayment", order);

        // Step 3: Create shipment
        var shipment = await context.CallActivityAsync<ShipmentInfo>(
            "CreateShipment", order
        );

        return new OrderResult { Status = "fulfilled", TrackingId = shipment.TrackingId };
    }
}
```

## Inventory State Management

```csharp
public async Task<bool> ReserveInventory(ReserveRequest request)
{
    var daprClient = new DaprClientBuilder().Build();

    var current = await daprClient.GetStateAsync<InventoryItem>(
        "inventory-store", request.Sku
    );

    if (current.Quantity < request.Quantity)
        return false;

    current.Quantity -= request.Quantity;
    current.Reserved += request.Quantity;

    await daprClient.SaveStateAsync("inventory-store", request.Sku, current);
    return true;
}
```

## Low-Stock Alerts via Pub/Sub

When inventory falls below threshold, publish a reorder event:

```csharp
async Task PublishLowStockAlert(string sku, int currentQty)
{
    await daprClient.PublishEventAsync("pubsub", "low-stock-alerts", new
    {
        Sku = sku,
        CurrentQuantity = currentQty,
        Timestamp = DateTime.UtcNow
    });
}
```

## Supplier Service Subscription

```csharp
app.MapPost("/low-stock-alerts", [Topic("pubsub", "low-stock-alerts")]
async (LowStockEvent evt, DaprClient dapr) =>
{
    await dapr.InvokeMethodAsync(HttpMethod.Post, "supplier-service",
        "reorder", new ReorderRequest { Sku = evt.Sku, Quantity = 500 });
    return Results.Ok();
});
```

## Summary

Dapr's workflow engine handles the long-running, multi-step nature of supply chain processes with built-in retries and durable state. Combined with pub/sub for event-driven stock alerts and state management for inventory tracking, Dapr lets you build resilient supply chain systems that survive partial failures and restart gracefully.
