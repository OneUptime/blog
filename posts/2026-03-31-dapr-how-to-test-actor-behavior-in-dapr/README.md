# How to Test Actor Behavior in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Testing, Unit Test, Integration Test, Microservice

Description: Learn how to write unit and integration tests for Dapr virtual actors, covering state management, method behavior, reminders, and timers using mocking and the test actor runtime.

---

Testing Dapr actors presents unique challenges: actors manage persistent state via `StateManager`, interact with the Dapr runtime for reminders and timers, and communicate with other actors through proxies. Without proper test infrastructure, actor tests become slow, flaky integration tests that require a running Dapr sidecar. This guide covers how to unit test actors using mocking, write integration tests with the test actor runtime, and run end-to-end tests with a real sidecar.

## Setting Up the Test Project

```bash
dotnet new xunit -n ActorTests
cd ActorTests
dotnet add package Dapr.Actors
dotnet add package Dapr.Actors.AspNetCore
dotnet add package Moq
dotnet add package Microsoft.Extensions.Logging.Abstractions
dotnet add package FluentAssertions
```

Reference your main project:

```bash
dotnet add reference ../MyActorApp/MyActorApp.csproj
```

## Unit Testing Actor Methods with Mocked StateManager

The key to fast unit tests is mocking `IActorStateManager`. Use `ActorHost.CreateForTest` to create a test host, then inject the mock state manager via reflection since `StateManager` has a protected setter on the `Actor` base class:

```csharp
// Tests/ShoppingCartActorTests.cs
using Dapr.Actors.Runtime;
using Moq;
using FluentAssertions;
using Xunit;

public class ShoppingCartActorTests
{
    private readonly Mock<IActorStateManager> _stateManagerMock;
    private readonly ShoppingCartActor _actor;

    public ShoppingCartActorTests()
    {
        _stateManagerMock = new Mock<IActorStateManager>();
        
        // Create a test actor host
        var host = ActorHost.CreateForTest<ShoppingCartActor>(
            new ActorTestOptions
            {
                ActorId = new ActorId("test-cart-1"),
                LoggerFactory = Microsoft.Extensions.Logging.Abstractions.NullLoggerFactory.Instance
            });

        _actor = new ShoppingCartActor(host);

        // Inject mock state manager (StateManager has a protected setter on the Actor base class)
        typeof(Actor).GetProperty(nameof(Actor.StateManager))!
            .SetValue(_actor, _stateManagerMock.Object);
    }

    [Fact]
    public async Task AddItem_ShouldIncreaseItemCount()
    {
        // Arrange: empty cart
        var cart = new CartState { Items = new List<CartItem>() };
        _stateManagerMock
            .Setup(s => s.GetOrAddStateAsync("cart", It.IsAny<CartState>(), default))
            .ReturnsAsync(cart);
        _stateManagerMock
            .Setup(s => s.SetStateAsync("cart", It.IsAny<CartState>(), default))
            .Returns(Task.CompletedTask);

        // Act
        await _actor.AddItemAsync(new CartItem("sku-123", "Widget", 2, 9.99m));

        // Assert: SetState was called with 1 item
        _stateManagerMock.Verify(s =>
            s.SetStateAsync("cart",
                It.Is<CartState>(c => c.Items.Count == 1),
                default),
            Times.Once);
    }

    [Fact]
    public async Task RemoveItem_WhenItemExists_ShouldDecreaseCount()
    {
        // Arrange: cart with one item
        var cart = new CartState
        {
            Items = new List<CartItem>
            {
                new CartItem("sku-123", "Widget", 2, 9.99m)
            }
        };
        _stateManagerMock
            .Setup(s => s.GetOrAddStateAsync("cart", It.IsAny<CartState>(), default))
            .ReturnsAsync(cart);
        _stateManagerMock
            .Setup(s => s.SetStateAsync("cart", It.IsAny<CartState>(), default))
            .Returns(Task.CompletedTask);

        // Act
        var removed = await _actor.RemoveItemAsync("sku-123");

        // Assert
        removed.Should().BeTrue();
        _stateManagerMock.Verify(s =>
            s.SetStateAsync("cart",
                It.Is<CartState>(c => c.Items.Count == 0),
                default),
            Times.Once);
    }

    [Fact]
    public async Task Checkout_WhenCartEmpty_ShouldThrow()
    {
        // Arrange
        var cart = new CartState { Items = new List<CartItem>() };
        _stateManagerMock
            .Setup(s => s.GetOrAddStateAsync("cart", It.IsAny<CartState>(), default))
            .ReturnsAsync(cart);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _actor.CheckoutAsync());
    }
}
```

## The Actor Under Test

Here is the actor being tested:

```csharp
// Actors/ShoppingCartActor.cs
using Dapr.Actors.Runtime;

public record CartItem(string Sku, string Name, int Quantity, decimal UnitPrice);
public record CartState { public List<CartItem> Items { get; init; } = new(); }

public interface IShoppingCartActor : IActor
{
    Task AddItemAsync(CartItem item);
    Task<bool> RemoveItemAsync(string sku);
    Task<CartState> GetCartAsync();
    Task CheckoutAsync();
}

[Actor(TypeName = "ShoppingCart")]
public class ShoppingCartActor : Actor, IShoppingCartActor
{
    public ShoppingCartActor(ActorHost host) : base(host) { }

    public async Task AddItemAsync(CartItem item)
    {
        var cart = await StateManager.GetOrAddStateAsync("cart", new CartState());
        var items = cart.Items.ToList();
        var existing = items.FirstOrDefault(i => i.Sku == item.Sku);
        if (existing != null)
        {
            items.Remove(existing);
            items.Add(existing with { Quantity = existing.Quantity + item.Quantity });
        }
        else
        {
            items.Add(item);
        }
        await StateManager.SetStateAsync("cart", cart with { Items = items });
    }

    public async Task<bool> RemoveItemAsync(string sku)
    {
        var cart = await StateManager.GetOrAddStateAsync("cart", new CartState());
        var items = cart.Items.ToList();
        var removed = items.RemoveAll(i => i.Sku == sku);
        if (removed > 0)
        {
            await StateManager.SetStateAsync("cart", cart with { Items = items });
            return true;
        }
        return false;
    }

    public async Task<CartState> GetCartAsync()
    {
        return await StateManager.GetOrAddStateAsync("cart", new CartState());
    }

    public async Task CheckoutAsync()
    {
        var cart = await StateManager.GetOrAddStateAsync("cart", new CartState());
        if (!cart.Items.Any())
            throw new InvalidOperationException("Cannot checkout an empty cart");
        // Process checkout logic...
        await StateManager.SetStateAsync("cart", new CartState());
    }
}
```

## Testing Reminders and Timers

Reminders and timers are harder to test because they interact with the Dapr runtime. Use the `IActorReminderManager` abstraction:

```csharp
// Tests/ReminderActorTests.cs
public class ReminderActorTests
{
    [Fact]
    public async Task ReceiveReminderAsync_ShouldProcessReminder()
    {
        var host = ActorHost.CreateForTest<OrderReminderActor>(
            new ActorTestOptions { ActorId = new ActorId("order-1") });
        
        var actor = new OrderReminderActor(host);
        
        // Simulate reminder firing by calling ReceiveReminderAsync directly
        var reminderData = System.Text.Json.JsonSerializer.SerializeToUtf8Bytes(
            new ReminderPayload("order-1", "CheckDelivery"));
        
        // This directly tests the reminder handler logic
        await actor.ReceiveReminderAsync(
            reminderName: "delivery-check",
            state: reminderData,
            dueTime: TimeSpan.Zero,
            period: TimeSpan.FromHours(1));
        
        // Assert that expected actions were taken
        // (verify via StateManager mock or captured side effects)
    }
}
```

## Integration Tests with a Real Dapr Sidecar

For integration tests, use `dapr run` in test setup:

```csharp
// Tests/ActorIntegrationTests.cs
using Dapr.Actors;
using Dapr.Actors.Client;

[Collection("DaprIntegration")]
public class ShoppingCartIntegrationTests : IAsyncLifetime
{
    private Process? _daprProcess;
    private const int DaprPort = 3600;

    public async Task InitializeAsync()
    {
        _daprProcess = Process.Start(new ProcessStartInfo
        {
            FileName = "dapr",
            Arguments = $"run --app-id cart-test --dapr-http-port {DaprPort} --app-port 5099 --resources-path ./components",
            UseShellExecute = false,
            RedirectStandardOutput = true
        });
        
        // Wait for sidecar to be ready
        await Task.Delay(3000);
    }

    [Fact]
    public async Task AddAndRetrieveCartItem_ShouldPersistAcrossActorInstances()
    {
        var options = new ActorProxyOptions { HttpEndpoint = $"http://localhost:{DaprPort}" };
        var proxy = ActorProxy.Create<IShoppingCartActor>(
            new ActorId("integration-cart-1"), "ShoppingCart", options);

        await proxy.AddItemAsync(new CartItem("sku-abc", "TestWidget", 1, 19.99m));
        var cart = await proxy.GetCartAsync();

        cart.Items.Should().HaveCount(1);
        cart.Items[0].Sku.Should().Be("sku-abc");
    }

    public async Task DisposeAsync()
    {
        _daprProcess?.Kill();
        await Task.CompletedTask;
    }
}
```

## Running the Tests

```bash
# Unit tests only (no Dapr sidecar needed)
dotnet test --filter "FullyQualifiedName!~IntegrationTests"

# All tests (requires Dapr installed)
dotnet test

# With verbose output
dotnet test --logger "console;verbosity=detailed"

# Generate code coverage report
dotnet test --collect:"XPlat Code Coverage"
dotnet tool install -g dotnet-reportgenerator-globaltool
reportgenerator -reports:"**/coverage.cobertura.xml" -targetdir:"coverage-report" -reporttypes:Html
```

## Summary

Testing Dapr actors effectively requires a layered approach. Unit tests mock `IActorStateManager` and directly instantiate actors using `ActorHost.CreateForTest` - these run without any Dapr infrastructure and give fast feedback on business logic. Reminder and timer behavior can be tested by directly calling `ReceiveReminderAsync`. Integration tests spin up a real Dapr sidecar and test the full actor proxy communication path. This pyramid approach keeps your test suite fast while ensuring actor behavior is thoroughly validated at every level.
