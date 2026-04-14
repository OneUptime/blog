# How to Use Dapr with Mediator Pattern (MediatR)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Mediator Pattern, MediatR, CQRS, Design Pattern

Description: Combine Dapr building blocks with the MediatR mediator pattern to implement CQRS in microservices, routing commands and queries through handlers that use Dapr for state and events.

---

## MediatR and Dapr Together

MediatR decouples request senders from handlers using an in-process mediator. Combined with Dapr, handlers can use Dapr state management for queries, pub/sub for events, and service invocation for cross-service calls - all behind a consistent command/query interface.

## Install Dependencies

```bash
dotnet add package MediatR
dotnet add package Dapr.AspNetCore
dotnet add package Dapr.Client
```

## CQRS Command - Create Order

```csharp
// Application/Commands/CreateOrderCommand.cs
public record CreateOrderCommand(
    string CustomerId,
    List<string> Items
) : IRequest<CreateOrderResult>;

public record CreateOrderResult(string OrderId, string Status);
```

## Command Handler Using Dapr

```csharp
// Application/Handlers/CreateOrderCommandHandler.cs
using Dapr.Client;
using MediatR;

public class CreateOrderCommandHandler
    : IRequestHandler<CreateOrderCommand, CreateOrderResult>
{
    private readonly DaprClient _dapr;

    public CreateOrderCommandHandler(DaprClient dapr) => _dapr = dapr;

    public async Task<CreateOrderResult> Handle(
        CreateOrderCommand request,
        CancellationToken ct)
    {
        var order = new Order
        {
            Id = Guid.NewGuid().ToString(),
            CustomerId = request.CustomerId,
            Items = request.Items,
            Status = "Created",
        };

        // Write to Dapr state store
        await _dapr.SaveStateAsync("statestore", order.Id, order, cancellationToken: ct);

        // Publish domain event
        await _dapr.PublishEventAsync(
            "pubsub",
            "order-created",
            new OrderCreatedEvent(order.Id, order.CustomerId),
            ct);

        return new CreateOrderResult(order.Id, order.Status);
    }
}
```

## CQRS Query - Get Order

```csharp
// Application/Queries/GetOrderQuery.cs
public record GetOrderQuery(string OrderId) : IRequest<GetOrderResult?>;

public record GetOrderResult(string OrderId, string Status, List<string> Items);

// Application/Handlers/GetOrderQueryHandler.cs
public class GetOrderQueryHandler : IRequestHandler<GetOrderQuery, GetOrderResult?>
{
    private readonly DaprClient _dapr;

    public GetOrderQueryHandler(DaprClient dapr) => _dapr = dapr;

    public async Task<GetOrderResult?> Handle(GetOrderQuery request, CancellationToken ct)
    {
        var order = await _dapr.GetStateAsync<Order>("statestore", request.OrderId, cancellationToken: ct);
        if (order is null) return null;

        return new GetOrderResult(order.Id, order.Status, order.Items);
    }
}
```

## Controller Dispatches via IMediator

```csharp
// Controllers/OrdersController.cs
[ApiController]
[Route("api/orders")]
public class OrdersController : ControllerBase
{
    private readonly IMediator _mediator;

    public OrdersController(IMediator mediator) => _mediator = mediator;

    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderCommand command)
    {
        var result = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetOrder), new { id = result.OrderId }, result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetOrder(string id)
    {
        var result = await _mediator.Send(new GetOrderQuery(id));
        return result is null ? NotFound() : Ok(result);
    }
}
```

## Dapr Subscription Handler via MediatR

Route Dapr pub/sub events through MediatR notifications:

```csharp
// Application/Notifications/OrderConfirmedNotification.cs
public record OrderConfirmedNotification(string OrderId) : INotification;

// Application/Handlers/OrderConfirmedHandler.cs (in notification service)
public class OrderConfirmedHandler : INotificationHandler<OrderConfirmedNotification>
{
    private readonly EmailService _email;

    public OrderConfirmedHandler(EmailService email) => _email = email;

    public async Task Handle(OrderConfirmedNotification notification, CancellationToken ct)
    {
        await _email.SendConfirmationAsync(notification.OrderId);
    }
}

// Controllers/EventsController.cs
[Topic("pubsub", "order-confirmed")]
[HttpPost("/events/order-confirmed")]
public async Task<IActionResult> OnOrderConfirmed(OrderConfirmedEvent @event)
{
    await _mediator.Publish(new OrderConfirmedNotification(@event.OrderId));
    return Ok();
}
```

## Register Services

```csharp
// Program.cs
builder.Services.AddDaprClient();
builder.Services.AddMediatR(cfg =>
    cfg.RegisterServicesFromAssemblyContaining<Program>());
builder.Services.AddControllers().AddDapr();
```

## Summary

Combining MediatR with Dapr creates a clean CQRS architecture where commands and queries are handled by dedicated handlers that use Dapr for state management and event publishing. The mediator pattern decouples controllers from infrastructure concerns, and Dapr provides the portable building blocks that handlers depend on - making each handler independently testable and the overall system highly maintainable.
