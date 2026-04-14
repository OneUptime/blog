# How to Test Dapr Service Invocation Calls

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Service Invocation, Testing, Mock, Integration Test

Description: Learn how to test Dapr Service Invocation calls with mocks for unit tests and stub services with real sidecars for integration tests.

---

## Testing Service Invocation Challenges

When Service A calls Service B through Dapr Service Invocation, testing Service A requires either:
1. A mock that returns controlled responses without a running Service B.
2. A real stub of Service B running with its own Dapr sidecar for integration tests.

## Code Under Test

```csharp
// InventoryClient.cs
public class InventoryClient
{
    private readonly DaprClient _daprClient;

    public InventoryClient(DaprClient daprClient)
    {
        _daprClient = daprClient;
    }

    public async Task<StockLevel> GetStockAsync(string productId)
    {
        return await _daprClient.InvokeMethodAsync<StockLevel>(
            HttpMethod.Get,
            "inventory-service",
            $"products/{productId}/stock");
    }

    public async Task<Reservation> ReserveStockAsync(ReservationRequest request)
    {
        return await _daprClient.InvokeMethodAsync<ReservationRequest, Reservation>(
            HttpMethod.Post,
            "inventory-service",
            "reservations",
            request);
    }
}
```

## Unit Tests with Moq

```csharp
// InventoryClientTests.cs
public class InventoryClientTests
{
    private readonly Mock<DaprClient> _mockDapr;
    private readonly InventoryClient _client;

    public InventoryClientTests()
    {
        _mockDapr = new Mock<DaprClient>();
        _client   = new InventoryClient(_mockDapr.Object);
    }

    [Fact]
    public async Task GetStockAsync_ReturnsStockLevel()
    {
        var expected = new StockLevel { ProductId = "sku-1", Available = 50 };

        _mockDapr
            .Setup(d => d.InvokeMethodAsync<StockLevel>(
                HttpMethod.Get,
                "inventory-service",
                "products/sku-1/stock",
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        var result = await _client.GetStockAsync("sku-1");

        Assert.Equal(50, result.Available);
    }

    [Fact]
    public async Task ReserveStockAsync_SendsReservationRequest()
    {
        var request  = new ReservationRequest { ProductId = "sku-1", Quantity = 5 };
        var expected = new Reservation { ReservationId = "res-001", Confirmed = true };

        _mockDapr
            .Setup(d => d.InvokeMethodAsync<ReservationRequest, Reservation>(
                HttpMethod.Post,
                "inventory-service",
                "reservations",
                request,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        var result = await _client.ReserveStockAsync(request);

        Assert.True(result.Confirmed);
        Assert.Equal("res-001", result.ReservationId);
    }
}
```

## Integration Test with a Stub Service

Create a minimal stub for the inventory service:

```csharp
// InventoryStub/Program.cs - minimal stub
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/products/{productId}/stock", (string productId) =>
    Results.Ok(new { productId, available = 100 }));

app.MapPost("/reservations", (ReservationRequest req) =>
    Results.Ok(new { reservationId = Guid.NewGuid(), confirmed = true }));

app.Run("http://localhost:3001");
```

Run both with Dapr Multi-App Run:

```yaml
# dapr-test.yaml
apps:
  - appID: order-service
    appPort: 3000
    daprHTTPPort: 3500
    command: ["dotnet", "run", "--project", "OrderService"]

  - appID: inventory-service
    appPort: 3001
    daprHTTPPort: 3501
    command: ["dotnet", "run", "--project", "InventoryStub"]
```

```bash
dapr run -f dapr-test.yaml
dotnet test --filter "Category=Integration"
```

## Verifying Headers and Metadata

For advanced tests, use WireMock.NET to verify Dapr-specific headers:

```csharp
_server
    .Given(Request.Create()
        .WithPath("/products/sku-1/stock")
        .WithHeader("dapr-app-id", "order-service")
        .UsingGet())
    .RespondWith(Response.Create()
        .WithStatusCode(200)
        .WithBodyAsJson(new { productId = "sku-1", available = 100 }));
```

## Summary

Test Dapr Service Invocation by mocking the `InvokeMethodAsync` calls on `DaprClient` in unit tests. For integration tests, create minimal stub services and run them alongside your service under test using Dapr Multi-App Run. Use WireMock.NET when you need to verify request headers and routing metadata.
