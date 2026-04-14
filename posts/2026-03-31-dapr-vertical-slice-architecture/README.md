# How to Use Dapr with Vertical Slice Architecture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Vertical Slice Architecture, Design Pattern, Feature, Microservice

Description: Organize Dapr microservice code by feature slices rather than technical layers, keeping each feature's handler, Dapr calls, and models co-located for maintainability.

---

## What is Vertical Slice Architecture?

Vertical Slice Architecture organizes code by feature (vertical slice through the tech stack) rather than by technical layer (horizontal layers). Each slice contains everything needed for a single feature: the HTTP handler, business logic, Dapr state/pub-sub calls, and data models - all in one place.

## Project Structure

```text
src/
- Features/
  - Orders/
    - CreateOrder/
      - CreateOrderCommand.cs
      - CreateOrderHandler.cs     # Contains Dapr calls
      - CreateOrderValidator.cs
      - CreateOrderResponse.cs
    - GetOrder/
      - GetOrderQuery.cs
      - GetOrderHandler.cs
    - CancelOrder/
      - CancelOrderCommand.cs
      - CancelOrderHandler.cs
  - Inventory/
    - ReserveItem/
      - ReserveItemCommand.cs
      - ReserveItemHandler.cs
- Shared/
  - DaprClientExtensions.cs
```

## Self-Contained Feature Slice

```csharp
// Features/Orders/CreateOrder/CreateOrderHandler.cs
using Dapr.Client;
using MediatR;

public record CreateOrderCommand(string CustomerId, List<string> Items) : IRequest<CreateOrderResponse>;
public record OrderCreatedEvent(string OrderId, string CustomerId);

public class CreateOrderHandler : IRequestHandler<CreateOrderCommand, CreateOrderResponse>
{
    private readonly DaprClient _dapr;

    public CreateOrderHandler(DaprClient dapr)
    {
        _dapr = dapr;
    }

    public async Task<CreateOrderResponse> Handle(
        CreateOrderCommand command,
        CancellationToken ct)
    {
        // All logic for this feature is here - no layer jumping
        var order = new Order
        {
            Id = Guid.NewGuid().ToString(),
            CustomerId = command.CustomerId,
            Items = command.Items,
            Status = "Created",
            CreatedAt = DateTime.UtcNow,
        };

        // Dapr state save - within the slice
        await _dapr.SaveStateAsync("statestore", order.Id, order, cancellationToken: ct);

        // Dapr pub/sub publish - within the slice
        await _dapr.PublishEventAsync("pubsub", "order-created",
            new OrderCreatedEvent(order.Id, order.CustomerId), ct);

        return new CreateOrderResponse(order.Id, order.Status);
    }
}
```

## Minimal API Endpoint per Slice

```csharp
// Program.cs
app.MapPost("/orders", async (
    CreateOrderCommand command,
    IMediator mediator) =>
{
    var result = await mediator.Send(command);
    return Results.Created($"/orders/{result.OrderId}", result);
});

app.MapGet("/orders/{id}", async (
    string id,
    IMediator mediator) =>
{
    var result = await mediator.Send(new GetOrderQuery(id));
    return result is null ? Results.NotFound() : Results.Ok(result);
});
```

## GetOrder Slice with Dapr State Read

```csharp
// Features/Orders/GetOrder/GetOrderHandler.cs
public record GetOrderQuery(string OrderId) : IRequest<GetOrderResponse?>;

public class GetOrderHandler : IRequestHandler<GetOrderQuery, GetOrderResponse?>
{
    private readonly DaprClient _dapr;

    public GetOrderHandler(DaprClient dapr) => _dapr = dapr;

    public async Task<GetOrderResponse?> Handle(GetOrderQuery query, CancellationToken ct)
    {
        var order = await _dapr.GetStateAsync<Order>("statestore", query.OrderId, cancellationToken: ct);
        if (order is null) return null;

        return new GetOrderResponse(order.Id, order.Status, order.Items);
    }
}
```

## Register Services

```csharp
// Program.cs
builder.Services.AddDaprClient();
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssemblyContaining<Program>());
```

## Benefits for Dapr Services

Vertical slices in Dapr services mean:
- Adding a feature requires changes to one directory only
- Dapr component usage is visible without navigating layers
- Features can be extracted into separate microservices easily
- Testing is simpler - test the handler directly

```csharp
[Fact]
public async Task CreateOrder_SavesStateAndPublishesEvent()
{
    var mockDapr = new Mock<DaprClient>();
    var handler = new CreateOrderHandler(mockDapr.Object);

    var result = await handler.Handle(
        new CreateOrderCommand("cust-1", new List<string> { "item-a" }),
        CancellationToken.None);

    mockDapr.Verify(d => d.SaveStateAsync("statestore", It.IsAny<string>(), It.IsAny<Order>(),
        null, null, It.IsAny<CancellationToken>()), Times.Once);
    mockDapr.Verify(d => d.PublishEventAsync("pubsub", "order-created",
        It.IsAny<OrderCreatedEvent>(), It.IsAny<CancellationToken>()), Times.Once);
}
```

## Summary

Vertical Slice Architecture combined with Dapr organizes microservice code by feature rather than technical layer, keeping each feature's handler, Dapr building block calls, and models co-located. This improves developer velocity by eliminating layer navigation, makes Dapr component usage explicit per feature, and simplifies eventual extraction of slices into separate microservices.
