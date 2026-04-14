# How to Unit Test Dapr Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Unit Test, Testing, Mock, Test Automation

Description: Learn how to write unit tests for Dapr applications by mocking the Dapr client so your business logic can be tested without a running Dapr sidecar.

---

## Unit Testing Philosophy for Dapr

Unit tests should verify business logic in isolation. When your service uses `DaprClient` to save state or publish events, the test should not spin up a real Dapr sidecar. Instead, mock the `DaprClient` abstract class so tests run fast and deterministically.

## Mocking DaprClient with Moq (C#)

```csharp
// OrderService.cs - the class under test
public class OrderService
{
    private readonly DaprClient _daprClient;

    public OrderService(DaprClient daprClient)
    {
        _daprClient = daprClient;
    }

    public async Task<string> PlaceOrderAsync(OrderRequest request)
    {
        var orderId = Guid.NewGuid().ToString();

        // Save order state
        await _daprClient.SaveStateAsync("statestore", orderId, request);

        // Publish order-created event
        await _daprClient.PublishEventAsync("pubsub", "order-created", new
        {
            OrderId  = orderId,
            CustomerId = request.CustomerId,
            Total    = request.Total
        });

        return orderId;
    }
}
```

```csharp
// OrderServiceTests.cs
using Moq;
using Xunit;

public class OrderServiceTests
{
    [Fact]
    public async Task PlaceOrderAsync_SavesStateAndPublishesEvent()
    {
        // Arrange
        var mockDapr = new Mock<DaprClient>();

        mockDapr
            .Setup(d => d.SaveStateAsync(
                "statestore",
                It.IsAny<string>(),
                It.IsAny<OrderRequest>(),
                It.IsAny<StateOptions>(),
                It.IsAny<IReadOnlyDictionary<string, string>>(),
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        mockDapr
            .Setup(d => d.PublishEventAsync(
                "pubsub",
                "order-created",
                It.IsAny<object>(),
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var service = new OrderService(mockDapr.Object);
        var request = new OrderRequest { CustomerId = "cust-1", Total = 99.99m };

        // Act
        var orderId = await service.PlaceOrderAsync(request);

        // Assert
        Assert.NotEmpty(orderId);

        mockDapr.Verify(d => d.SaveStateAsync(
            "statestore",
            orderId,
            request,
            It.IsAny<StateOptions>(),
            It.IsAny<IReadOnlyDictionary<string, string>>(),
            It.IsAny<CancellationToken>()), Times.Once);

        mockDapr.Verify(d => d.PublishEventAsync(
            "pubsub",
            "order-created",
            It.IsAny<object>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }
}
```

## Testing Service Invocation Logic

```csharp
[Fact]
public async Task GetInventoryAsync_ReturnsDataFromDapr()
{
    var mockDapr = new Mock<DaprClient>();
    var expected = new InventoryItem { ProductId = "sku-1", Stock = 10 };

    mockDapr
        .Setup(d => d.InvokeMethodAsync<InventoryItem>(
            It.IsAny<HttpRequestMessage>(),
            It.IsAny<CancellationToken>()))
        .ReturnsAsync(expected);

    var service = new InventoryService(mockDapr.Object);
    var result = await service.GetInventoryAsync("sku-1");

    Assert.Equal(10, result.Stock);
}
```

## Mocking Secret Retrieval

```csharp
[Fact]
public async Task Initialize_LoadsSecretsFromDapr()
{
    var mockDapr = new Mock<DaprClient>();

    mockDapr
        .Setup(d => d.GetSecretAsync("secrets", "db-password", null, default))
        .ReturnsAsync(new Dictionary<string, string>
        {
            ["db-password"] = "test-password"
        });

    var config = new AppConfiguration(mockDapr.Object);
    await config.InitializeAsync();

    Assert.Equal("test-password", config.DbPassword);
}
```

## Running Tests

```bash
dotnet test --filter "Category=Unit"
```

## Summary

Unit testing Dapr applications is straightforward with mock frameworks like Moq or NSubstitute. Inject `DaprClient` as a constructor dependency, mock specific method calls in tests, and verify the calls were made with the expected arguments. No Dapr sidecar or Docker is needed for unit tests - they run in milliseconds as pure in-process tests.
