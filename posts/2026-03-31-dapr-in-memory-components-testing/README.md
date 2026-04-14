# How to Use Dapr In-Memory Components for Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, In-Memory, Testing, Component, Fast Test

Description: Learn how to use Dapr's built-in in-memory state store and pub/sub components to run fast integration tests without Redis, Kafka, or other external dependencies.

---

## What Are In-Memory Dapr Components?

Dapr ships with in-memory implementations of its state store and pub/sub components. They behave exactly like Redis or Kafka from your application's perspective but store everything in the Dapr sidecar process's memory. When the sidecar restarts, data is gone - perfect for isolated test runs.

## Why Use In-Memory Components?

| Feature | Redis/Kafka | In-Memory |
|---------|------------|-----------|
| Startup time | 2-10 seconds (Docker) | Instant |
| External dependency | Yes | No |
| Data persistence | Yes | No |
| Test isolation | Manual cleanup needed | Automatic (restart sidecar) |
| CI without Docker | No | Yes |

## Configuring In-Memory State Store

```yaml
# components/test/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.in-memory
  version: v1
  metadata: []
```

That is the entire configuration. No connection strings, no credentials.

## Configuring In-Memory Pub/Sub

```yaml
# components/test/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.in-memory
  version: v1
  metadata: []
```

## Using Both in Tests

Start the sidecar pointing at the test components directory:

```bash
dapr run \
  --app-id myapp \
  --app-port 3000 \
  --dapr-http-port 3500 \
  --resources-path ./components/test \
  -- node server.js
```

Your application code does not change - it still uses the same `statestore` and `pubsub` component names.

## JavaScript Integration Test Example

```javascript
// tests/integration/cart.test.js
const axios = require('axios');

const APP = 'http://localhost:3000';
const DAPR = 'http://localhost:3500';

describe('Cart API - In-Memory Integration', () => {
  afterEach(async () => {
    // Clean up test data after each test
    await axios.delete(`${DAPR}/v1.0/state/statestore/test-user-1`);
  });

  it('saves cart items to state store', async () => {
    const response = await axios.post(`${APP}/cart/test-user-1/items`, {
      productId: 'sku-001',
      quantity: 2
    });

    expect(response.status).toBe(200);

    // Verify directly via Dapr state API
    const state = await axios.get(
      `${DAPR}/v1.0/state/statestore/test-user-1`
    );

    expect(state.data.items).toHaveLength(1);
    expect(state.data.items[0].productId).toBe('sku-001');
  });

  it('pub/sub message reaches subscriber', async () => {
    let receivedMessage = null;

    // The subscriber endpoint is part of the running app
    // After publish, poll a side-effect (state written by subscriber)
    await axios.post(`${DAPR}/v1.0/publish/pubsub/cart-events`, {
      type: 'item-added',
      userId: 'test-user-2',
      productId: 'sku-002'
    });

    // Allow subscriber to process
    await new Promise(r => setTimeout(r, 200));

    const logged = await axios.get(
      `${DAPR}/v1.0/state/statestore/event-log-test-user-2`
    );

    expect(logged.data).toBeDefined();
    expect(logged.data.type).toBe('item-added');
  });
});
```

## C# Example with WebApplicationFactory

```csharp
// InMemoryDaprTests.cs
public class InMemoryDaprTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    private readonly DaprClient _daprClient;

    public InMemoryDaprTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
        _daprClient = new DaprClientBuilder()
            .UseHttpEndpoint("http://localhost:3500")
            .Build();
    }

    [Fact]
    public async Task PostOrder_StatePersistedInMemory()
    {
        var response = await _client.PostAsJsonAsync("/orders",
            new { customerId = "c1", total = 50.0 });

        response.EnsureSuccessStatusCode();
        var order = await response.Content.ReadFromJsonAsync<OrderResponse>();

        // In-memory state store is queryable like any other
        var saved = await _daprClient.GetStateAsync<OrderState>(
            "statestore", order!.OrderId);

        Assert.NotNull(saved);
    }
}
```

## Limitations

In-memory components do not support:
- Cross-process state sharing (each sidecar has its own memory)
- Persistence across test runs

## Summary

In-memory Dapr components eliminate external dependencies from integration tests entirely. State store and pub/sub operations work identically to Redis or Kafka. Tests start faster, run in CI without Docker, and isolate automatically when the sidecar process restarts. The only limitation is that state does not persist across sidecar restarts, which is ideal for test isolation.
