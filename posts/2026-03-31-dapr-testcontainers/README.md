# How to Use Testcontainers with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Testcontainers, Integration Test, Docker, Testing

Description: Learn how to use Testcontainers to spin up Dapr sidecars and backing services in Docker during tests for realistic integration testing without shared infrastructure.

---

## Why Testcontainers with Dapr?

Testcontainers spins up real Docker containers during tests and tears them down when tests finish. For Dapr, this means starting a Redis container (as the state store and pub/sub broker) and the Dapr placement service alongside your service under test. Each test run gets a clean environment.

## Setup

```bash
# Java (Maven)
```

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>testcontainers</artifactId>
    <version>1.19.0</version>
    <scope>test</scope>
</dependency>
```

For .NET:

```bash
dotnet add package Testcontainers --version 3.6.0
dotnet add package Testcontainers.Redis
```

## Writing the Test (C# / .NET)

```csharp
// OrderServiceContainerTests.cs
using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Containers;
using DotNet.Testcontainers.Networks;
using Testcontainers.Redis;

[Collection("Testcontainers")]
public class OrderServiceContainerTests : IAsyncLifetime
{
    private INetwork _network = null!;
    private RedisContainer _redis = null!;
    private IContainer _daprPlacement = null!;
    private IContainer _daprSidecar = null!;
    private HttpClient _client = null!;

    public async Task InitializeAsync()
    {
        // Create a shared Docker network
        _network = new NetworkBuilder()
            .Build();
        await _network.CreateAsync();

        // Start Redis
        _redis = new RedisBuilder()
            .WithImage("redis:7-alpine")
            .WithNetwork(_network)
            .WithNetworkAliases("redis")
            .Build();
        await _redis.StartAsync();

        // Start Dapr placement service
        _daprPlacement = new ContainerBuilder()
            .WithImage("daprio/dapr:1.14")
            .WithCommand("./placement", "--port", "50006")
            .WithNetwork(_network)
            .WithNetworkAliases("placement")
            .WithPortBinding(50006, 50006)
            .Build();
        await _daprPlacement.StartAsync();

        // Start Dapr sidecar
        _daprSidecar = new ContainerBuilder()
            .WithImage("daprio/daprd:1.14")
            .WithCommand(
                "./daprd",
                "--app-id", "order-service",
                "--app-port", "5000",
                "--dapr-http-port", "3500",
                "--placement-host-address", "placement:50006",
                "--components-path", "/components")
            .WithResourceMapping("./components/test", "/components")
            .WithNetwork(_network)
            .WithPortBinding(3500, 3500)
            .Build();
        await _daprSidecar.StartAsync();

        _client = new HttpClient
        {
            BaseAddress = new Uri("http://localhost:5000")
        };
    }

    [Fact]
    public async Task PlaceOrder_StateIsPersistedInRedis()
    {
        var response = await _client.PostAsJsonAsync("/orders", new
        {
            CustomerId = "testcontainer-customer",
            Total = 75.50
        });

        response.EnsureSuccessStatusCode();
        var order = await response.Content.ReadFromJsonAsync<OrderResponse>();

        // Verify via Dapr state API
        var daprClient = new DaprClientBuilder()
            .UseHttpEndpoint("http://localhost:3500")
            .Build();

        var saved = await daprClient.GetStateAsync<OrderState>(
            "statestore", order!.OrderId);

        Assert.NotNull(saved);
        Assert.Equal("testcontainer-customer", saved.CustomerId);
    }

    public async Task DisposeAsync()
    {
        _client.Dispose();
        await _daprSidecar.DisposeAsync();
        await _daprPlacement.DisposeAsync();
        await _redis.DisposeAsync();
        await _network.DisposeAsync();
    }
}
```

## Simplified: Minimal Dapr Sidecar

For simpler tests that do not need actors or the placement service, you can run a standalone Dapr sidecar:

```csharp
var daprSidecar = new ContainerBuilder()
    .WithImage("daprio/daprd:1.14")
    .WithCommand("./daprd", "--app-id", "myapp", "--dapr-http-port", "3500", "--dapr-grpc-port", "50001")
    .WithPortBinding(3500, 3500)
    .WithPortBinding(50001, 50001)
    .Build();

await daprSidecar.StartAsync();
```

## Component Mapping

```yaml
# components/test/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
```

## Running Tests

```bash
dotnet test --filter "FullyQualifiedName~OrderServiceContainerTests" --logger "console;verbosity=normal"
```

## Summary

Testcontainers with Dapr gives you fully isolated integration tests that spin up Redis, the Dapr placement service, and a Dapr sidecar in Docker for each test run. Tests verify real state persistence and pub/sub behavior without relying on shared infrastructure. The containers are torn down automatically after each test class, keeping CI environments clean.
