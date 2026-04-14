# How to Test Dapr Actor Methods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Testing, Unit Test, State Management

Description: Learn how to unit test Dapr Actor method implementations by mocking ActorStateManager and testing business logic without a running Dapr runtime.

---

## Testing Actors Without Dapr Runtime

Dapr Actors are classes that inherit from `Actor` and use `StateManager` for persistence. Testing them requires mocking `IActorStateManager` so tests do not need a running Dapr sidecar or state store.

## Actor Under Test

```csharp
// OrderActor.cs
public interface IOrderActor : IActor
{
    Task<OrderState> GetOrderAsync();
    Task UpdateStatusAsync(string newStatus);
    Task AddItemAsync(OrderItem item);
    Task<decimal> GetTotalAsync();
}

[Actor(TypeName = "OrderActor")]
public class OrderActor : Actor, IOrderActor
{
    private const string OrderKey = "order";

    public OrderActor(ActorHost host, IActorStateManager stateManager = null)
        : base(host)
    {
        if (stateManager != null)
            StateManager = stateManager;
    }

    public async Task<OrderState> GetOrderAsync()
    {
        var result = await StateManager.TryGetStateAsync<OrderState>(OrderKey);
        return result.HasValue ? result.Value : new OrderState();
    }

    public async Task UpdateStatusAsync(string newStatus)
    {
        var order = await GetOrderAsync();
        var oldStatus = order.Status;
        order.Status = newStatus;
        order.UpdatedAt = DateTime.UtcNow;

        if (!IsValidTransition(oldStatus, newStatus))
            throw new InvalidOperationException(
                $"Cannot transition from {oldStatus} to {newStatus}");

        await StateManager.SetStateAsync(OrderKey, order);
        await StateManager.SaveStateAsync();
    }

    public async Task AddItemAsync(OrderItem item)
    {
        var order = await GetOrderAsync();
        order.Items.Add(item);
        await StateManager.SetStateAsync(OrderKey, order);
        await StateManager.SaveStateAsync();
    }

    public async Task<decimal> GetTotalAsync()
    {
        var order = await GetOrderAsync();
        return order.Items.Sum(i => i.Price * i.Quantity);
    }

    private static bool IsValidTransition(string from, string to)
    {
        return (from, to) switch
        {
            ("Pending", "Processing") => true,
            ("Processing", "Shipped") => true,
            ("Shipped", "Delivered")  => true,
            ("Pending", "Cancelled")  => true,
            _                          => false
        };
    }
}
```

## Unit Tests with Mocked StateManager

```csharp
// OrderActorTests.cs
using Dapr.Actors.Runtime;
using Moq;

public class OrderActorTests
{
    private readonly Mock<IActorStateManager> _mockStateManager;
    private readonly OrderActor _actor;

    public OrderActorTests()
    {
        _mockStateManager = new Mock<IActorStateManager>();

        var host = ActorHost.CreateForTest<OrderActor>();

        _actor = new OrderActor(host, _mockStateManager.Object);
    }

    [Fact]
    public async Task GetOrderAsync_ReturnsEmptyOrderWhenNotFound()
    {
        _mockStateManager
            .Setup(m => m.TryGetStateAsync<OrderState>("order", default))
            .ReturnsAsync(new ConditionalValue<OrderState>(false, default!));

        var order = await _actor.GetOrderAsync();

        Assert.NotNull(order);
        Assert.Empty(order.Items);
    }

    [Fact]
    public async Task UpdateStatusAsync_TransitionsValidStatus()
    {
        var existing = new OrderState { Status = "Pending", Items = new() };

        _mockStateManager
            .Setup(m => m.TryGetStateAsync<OrderState>("order", default))
            .ReturnsAsync(new ConditionalValue<OrderState>(true, existing));

        _mockStateManager
            .Setup(m => m.SetStateAsync("order", It.IsAny<OrderState>(), default))
            .Returns(Task.CompletedTask);

        _mockStateManager
            .Setup(m => m.SaveStateAsync(default))
            .Returns(Task.CompletedTask);

        await _actor.UpdateStatusAsync("Processing");

        _mockStateManager.Verify(
            m => m.SetStateAsync("order",
                It.Is<OrderState>(o => o.Status == "Processing"),
                default),
            Times.Once);
    }

    [Fact]
    public async Task UpdateStatusAsync_ThrowsForInvalidTransition()
    {
        var existing = new OrderState { Status = "Delivered", Items = new() };

        _mockStateManager
            .Setup(m => m.TryGetStateAsync<OrderState>("order", default))
            .ReturnsAsync(new ConditionalValue<OrderState>(true, existing));

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _actor.UpdateStatusAsync("Pending"));
    }

    [Fact]
    public async Task GetTotalAsync_CalculatesItemSum()
    {
        var order = new OrderState
        {
            Items = new List<OrderItem>
            {
                new() { Price = 10.00m, Quantity = 2 },
                new() { Price = 5.50m,  Quantity = 4 }
            }
        };

        _mockStateManager
            .Setup(m => m.TryGetStateAsync<OrderState>("order", default))
            .ReturnsAsync(new ConditionalValue<OrderState>(true, order));

        var total = await _actor.GetTotalAsync();

        Assert.Equal(42.00m, total); // (10 * 2) + (5.5 * 4)
    }
}
```

## Summary

Testing Dapr Actor methods requires mocking `IActorStateManager` and injecting it through the actor constructor, combined with `ActorHost.CreateForTest` to create a test host. All actor business logic - state transitions, calculations, and validations - can be tested without a running Dapr runtime or state store. Use `ConditionalValue` to simulate both found and not-found state scenarios, and verify state save calls with Moq's `Verify`.
