# How to Integration Test Dapr Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Integration Test, Testing, Docker, Test Automation

Description: Learn how to write integration tests for Dapr applications that spin up real Dapr sidecars and component backends to verify end-to-end interactions.

---

## What Integration Tests Verify

Unit tests mock Dapr. Integration tests run against a real Dapr sidecar to verify that your component configuration is correct, state is actually persisted, and pub/sub messages really flow. Integration tests are slower but catch configuration errors that mocks cannot.

## Strategy: dapr run + Test Runner

The simplest approach is to start your service with `dapr run` before running tests, then call its endpoints from a test client.

```bash
# test-setup.sh - start service with real Dapr sidecar
dapr run \
  --app-id order-service \
  --app-port 5000 \
  --dapr-http-port 3500 \
  --resources-path ./components/test \
  -- dotnet run --project OrderService &

APP_PID=$!
sleep 3  # wait for startup
dotnet test --filter "Category=Integration"
kill $APP_PID
```

## Test Components Directory

Use in-memory or local components for integration tests:

```yaml
# components/test/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.in-memory
  version: v1
```

```yaml
# components/test/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.in-memory
  version: v1
```

## Writing the Integration Test

```csharp
// OrderIntegrationTests.cs
[Collection("Integration")]
public class OrderIntegrationTests : IClassFixture<DaprTestFixture>
{
    private readonly HttpClient _client;
    private readonly DaprClient _daprClient;

    public OrderIntegrationTests(DaprTestFixture fixture)
    {
        _client    = fixture.HttpClient;
        _daprClient = fixture.DaprClient;
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task PlaceOrder_PersistsStateInStore()
    {
        // Arrange
        var request = new
        {
            CustomerId = "cust-integration-1",
            Items      = new[] { new { ProductId = "sku-1", Qty = 2 } },
            Total      = 49.98
        };

        // Act
        var response = await _client.PostAsJsonAsync("/orders", request);
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<OrderResponse>();

        // Assert - verify state was actually persisted
        var saved = await _daprClient.GetStateAsync<OrderState>(
            "statestore", body!.OrderId);

        Assert.NotNull(saved);
        Assert.Equal("cust-integration-1", saved.CustomerId);
    }
}
```

## Test Fixture

```csharp
// DaprTestFixture.cs
public class DaprTestFixture : IDisposable
{
    public HttpClient HttpClient { get; }
    public DaprClient DaprClient { get; }

    public DaprTestFixture()
    {
        HttpClient = new HttpClient
        {
            BaseAddress = new Uri("http://localhost:5000")
        };

        DaprClient = new DaprClientBuilder()
            .UseHttpEndpoint("http://localhost:3500")
            .Build();
    }

    public void Dispose()
    {
        HttpClient.Dispose();
        DaprClient.Dispose();
    }
}
```

## Verifying Pub/Sub Messages

```csharp
[Fact]
[Trait("Category", "Integration")]
public async Task PlaceOrder_PublishesOrderCreatedEvent()
{
    // Subscribe to the topic before placing the order
    var received = new List<OrderCreatedEvent>();

    // Use a test subscriber service or check via Dapr state store
    // if your subscriber saves received messages to state for testing

    var response = await _client.PostAsJsonAsync("/orders", testOrder);
    response.EnsureSuccessStatusCode();

    // Poll for the event (in real tests, use a timeout)
    await Task.Delay(500);

    var eventState = await _daprClient.GetStateAsync<OrderCreatedEvent>(
        "statestore", "last-order-event");

    Assert.NotNull(eventState);
}
```

## Summary

Integration tests for Dapr applications use real Dapr sidecars with in-memory components so tests run fast without external infrastructure. Start your service with `dapr run` pointing to a test resources directory, then call its HTTP endpoints and verify state was persisted using the Dapr client directly. In-memory state and pub/sub components are perfect for CI/CD pipelines.
