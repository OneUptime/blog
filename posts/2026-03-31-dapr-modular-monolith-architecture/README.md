# How to Use Dapr with Modular Monolith Architecture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Modular Monolith, Architecture, Migration, Microservice

Description: Use Dapr building blocks within a modular monolith to enforce module boundaries and enable incremental extraction to microservices without rewriting inter-module communication.

---

## Why Dapr in a Modular Monolith?

A modular monolith is a single deployable unit organized into well-defined modules with enforced boundaries. Using Dapr as the inter-module communication layer provides two major advantages:
1. Enforced boundaries via Dapr's pub/sub (modules communicate via events, not direct calls)
2. Extraction path - modules can be split into separate services later without changing how they communicate

## Project Structure

```text
ModularMonolith/
- Modules/
  - Orders/
    - OrdersModule.cs
    - Domain/
    - Application/
    - Infrastructure/
      - OrdersDaprPublisher.cs
  - Inventory/
    - InventoryModule.cs
    - Application/
      - InventoryEventHandler.cs
  - Notifications/
    - NotificationsModule.cs
- Host/
  - Program.cs
  - appsettings.json
```

## Define Module Boundaries via Dapr Events

Modules communicate only through Dapr pub/sub events - no direct method calls across modules:

```csharp
// Modules/Orders/Infrastructure/OrdersDaprPublisher.cs
public class OrdersDaprPublisher : IOrderEventPublisher
{
    private readonly DaprClient _dapr;
    private const string PubSubName = "pubsub";

    public OrdersDaprPublisher(DaprClient dapr) => _dapr = dapr;

    public async Task PublishOrderCreatedAsync(string orderId, string customerId)
    {
        await _dapr.PublishEventAsync(PubSubName, "orders.created", new
        {
            OrderId = orderId,
            CustomerId = customerId,
            Timestamp = DateTime.UtcNow,
        });
    }
}
```

## Consume Events in Another Module

```csharp
// Modules/Inventory/Application/InventoryEventHandler.cs
[ApiController]
public class InventoryEventHandler : ControllerBase
{
    private readonly InventoryService _inventoryService;

    public InventoryEventHandler(InventoryService service) => _inventoryService = service;

    [Topic("pubsub", "orders.created")]
    [HttpPost("/internal/inventory/on-order-created")]
    public async Task<IActionResult> OnOrderCreated(OrderCreatedEvent @event)
    {
        await _inventoryService.ReserveItemsAsync(@event.OrderId);
        return Ok();
    }
}
```

## Register Modules in Program.cs

```csharp
// Host/Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDaprClient();
builder.Services.AddControllers().AddDapr();

// Register each module
builder.Services.AddOrdersModule();
builder.Services.AddInventoryModule();
builder.Services.AddNotificationsModule();

var app = builder.Build();
app.UseCloudEvents();
app.MapSubscribeHandler();
app.MapControllers();
app.Run();
```

```csharp
// Modules/Orders/OrdersModule.cs
public static class OrdersModule
{
    public static IServiceCollection AddOrdersModule(this IServiceCollection services)
    {
        services.AddScoped<OrderService>();
        services.AddScoped<IOrderEventPublisher, OrdersDaprPublisher>();
        services.AddScoped<IOrderRepository, DaprOrderRepository>();
        return services;
    }
}
```

## Module-Scoped Dapr Components

Use component name prefixes to keep component ownership clear:

```yaml
# orders-statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: orders-statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: redis:6379
    - name: keyPrefix
      value: name
```

## Extracting a Module to Microservice

When the Inventory module needs to scale independently:

1. Create a new `inventory-service` project
2. Copy the `Inventory` module folder
3. Update the Dapr subscription to point to the new service URL
4. Remove the module from the monolith

No inter-module communication code changes needed - Dapr handles routing automatically.

```bash
# Update subscription routing
kubectl patch subscription inventory-subscription \
  --type merge \
  -p '{"spec":{"routes":{"default":"/inventory/on-order-created"}}}'
```

## Summary

Using Dapr within a modular monolith enforces module boundaries via event-driven communication and provides a zero-cost extraction path to microservices. When a module needs independent scaling, it can be deployed as a separate service without changing how it communicates with other modules - Dapr's pub/sub subscriptions handle the routing transparently.
