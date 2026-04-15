# How to Use Dapr with Domain-Driven Design (DDD)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Domain-Driven Design, DDD, Aggregate, Event

Description: Apply DDD concepts like aggregates, domain events, and bounded contexts to Dapr microservices, using building blocks to implement event-driven domain models.

---

## DDD and Dapr: A Natural Fit

Domain-Driven Design emphasizes bounded contexts, aggregates, and domain events - concepts that align naturally with Dapr's microservice architecture. Each bounded context maps to a Dapr service, aggregates use Dapr state management, and domain events flow through Dapr pub/sub.

## Bounded Context Mapping

```text
OrderContext (order-service)
  - Order Aggregate
  - Dapr State Store: order state

InventoryContext (inventory-service)
  - Product Aggregate
  - Dapr State Store: inventory state

NotificationContext (notification-service)
  - Subscribes to domain events from OrderContext
```

## Implement an Aggregate with Dapr State

```csharp
// Domain/Aggregates/Order.cs
public class Order : AggregateRoot
{
    public string Id { get; private set; }
    public string CustomerId { get; private set; }
    public OrderStatus Status { get; private set; }
    public List<OrderItem> Items { get; private set; } = new();
    public List<DomainEvent> DomainEvents { get; private set; } = new();

    public static Order Create(string customerId, List<OrderItem> items)
    {
        var order = new Order
        {
            Id = Guid.NewGuid().ToString(),
            CustomerId = customerId,
            Status = OrderStatus.Created,
            Items = items,
        };
        order.DomainEvents.Add(new OrderCreatedEvent(order.Id, customerId));
        return order;
    }

    public void Confirm()
    {
        if (Status != OrderStatus.Created)
            throw new InvalidOperationException("Only created orders can be confirmed");
        Status = OrderStatus.Confirmed;
        DomainEvents.Add(new OrderConfirmedEvent(Id));
    }
}
```

## Aggregate Repository Using Dapr State

```csharp
// Infrastructure/Repositories/DaprOrderRepository.cs
public class DaprOrderRepository : IOrderRepository
{
    private readonly DaprClient _dapr;
    private readonly IEventPublisher _publisher;

    public async Task SaveAsync(Order order)
    {
        // Persist aggregate state
        await _dapr.SaveStateAsync("statestore", order.Id, order);

        // Publish domain events via Dapr pub/sub
        foreach (var domainEvent in order.DomainEvents)
        {
            await _publisher.PublishAsync(domainEvent.EventType, domainEvent);
        }
        order.DomainEvents.Clear();
    }
}
```

## Domain Event Schema

```csharp
// Domain/Events/OrderCreatedEvent.cs
public record OrderCreatedEvent(
    string OrderId,
    string CustomerId,
    DateTime OccurredAt = default
) : DomainEvent("order-created")
{
    public DateTime OccurredAt { get; } = OccurredAt == default ? DateTime.UtcNow : OccurredAt;
}
```

## Subscribe to Domain Events Across Bounded Contexts

In the inventory service, subscribe to order events:

```csharp
// InventoryService/Controllers/OrderEventsController.cs
[ApiController]
public class OrderEventsController : ControllerBase
{
    private readonly InventoryService _inventoryService;

    [Topic("pubsub", "order-created")]
    [HttpPost("/events/order-created")]
    public async Task<IActionResult> OnOrderCreated(OrderCreatedEvent @event)
    {
        await _inventoryService.ReserveItemsForOrder(@event.OrderId, @event.CustomerId);
        return Ok();
    }
}
```

## Dapr Actor for Aggregate Concurrency

Use Dapr Actors to enforce aggregate-level concurrency (turn-based access):

```csharp
// Domain/Actors/IOrderActor.cs
public interface IOrderActor : IActor
{
    Task ConfirmOrderAsync();
    Task<OrderStatus> GetStatusAsync();
}

// Infrastructure/Actors/OrderActor.cs
public class OrderActor : Actor, IOrderActor
{
    private readonly DaprClient _daprClient;

    public OrderActor(ActorHost host, DaprClient daprClient) : base(host)
    {
        _daprClient = daprClient;
    }

    public async Task ConfirmOrderAsync()
    {
        var order = await StateManager.GetStateAsync<Order>("order");
        order.Confirm();
        await StateManager.SetStateAsync("order", order);

        // Publish domain event
        await _daprClient.PublishEventAsync("pubsub", "order-confirmed",
            new OrderConfirmedEvent(order.Id));
    }
}
```

## Summary

Dapr and DDD complement each other: bounded contexts map to Dapr services, aggregates use Dapr state management, and domain events flow through Dapr pub/sub. Using Dapr Actors for aggregates provides built-in turn-based concurrency that matches the single-threaded invariants that DDD aggregates require.
