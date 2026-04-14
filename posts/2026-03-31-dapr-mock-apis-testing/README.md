# How to Mock Dapr APIs for Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Mock, Testing, Unit Test, Test Double

Description: Learn how to mock Dapr APIs in unit and integration tests using mock HTTP servers and SDK test helpers to isolate services from Dapr infrastructure.

---

## Why Mock Dapr APIs?

In tests, you want to control exactly what Dapr returns. Mocking at the HTTP level (instead of injecting a mock DaprClient) lets you test the serialization, headers, and HTTP plumbing of your Dapr integration - not just the business logic.

## Approach 1: Mock DaprClient (SDK Level)

For C# with Moq:

```csharp
var mockDapr = new Mock<DaprClient>();

// Mock state GET
mockDapr
    .Setup(d => d.GetStateAsync<UserProfile>(
        "statestore",
        "user-123",
        It.IsAny<ConsistencyMode?>(),
        It.IsAny<IReadOnlyDictionary<string, string>>(),
        It.IsAny<CancellationToken>()))
    .ReturnsAsync(new UserProfile { Name = "Alice", Email = "alice@example.com" });

// Mock publish event
mockDapr
    .Setup(d => d.PublishEventAsync(
        It.IsAny<string>(),
        It.IsAny<string>(),
        It.IsAny<object>(),
        It.IsAny<CancellationToken>()))
    .Returns(Task.CompletedTask);

var service = new UserService(mockDapr.Object);
var profile = await service.GetUserAsync("user-123");
Assert.Equal("Alice", profile.Name);
```

## Approach 2: WireMock.NET for HTTP-Level Mocking

WireMock.NET starts a local HTTP server that impersonates the Dapr sidecar:

```bash
dotnet add package WireMock.Net
```

```csharp
// DaprMockServer.cs
using WireMock.Server;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;

public class DaprMockServer : IDisposable
{
    private readonly WireMockServer _server;

    public DaprMockServer()
    {
        _server = WireMockServer.Start(3500);
    }

    public int Port => _server.Port;

    public void MockGetState(string storeName, string key, object value)
    {
        _server
            .Given(Request.Create()
                .WithPath($"/v1.0/state/{storeName}/{key}")
                .UsingGet())
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithBodyAsJson(value));
    }

    public void MockPublishEvent(string pubsubName, string topic)
    {
        _server
            .Given(Request.Create()
                .WithPath($"/v1.0/publish/{pubsubName}/{topic}")
                .UsingPost())
            .RespondWith(Response.Create()
                .WithStatusCode(204));
    }

    public void Dispose() => _server.Stop();
}
```

Using the mock server in tests:

```csharp
public class UserServiceHttpTests : IDisposable
{
    private readonly DaprMockServer _mock;
    private readonly UserService _service;

    public UserServiceHttpTests()
    {
        _mock = new DaprMockServer();

        // Point DaprClient at the mock server
        var daprClient = new DaprClientBuilder()
            .UseHttpEndpoint($"http://localhost:{_mock.Port}")
            .Build();

        _service = new UserService(daprClient);
    }

    [Fact]
    public async Task GetUser_ReturnsProfileFromStateStore()
    {
        _mock.MockGetState("statestore", "user-123", new
        {
            name  = "Alice",
            email = "alice@example.com"
        });

        var profile = await _service.GetUserAsync("user-123");

        Assert.Equal("Alice", profile.Name);
    }

    public void Dispose() => _mock.Dispose();
}
```

## Approach 3: Mocking Dapr in Python

For Python services using the `dapr` SDK:

```python
# test_order_service.py
from unittest.mock import AsyncMock, patch, MagicMock
import pytest

@pytest.mark.asyncio
async def test_place_order_saves_state():
    with patch('dapr.clients.DaprClient') as MockClient:
        mock_instance = MagicMock()
        mock_instance.save_state = AsyncMock(return_value=None)
        mock_instance.publish_event = AsyncMock(return_value=None)
        MockClient.return_value.__aenter__ = AsyncMock(return_value=mock_instance)
        MockClient.return_value.__aexit__ = AsyncMock(return_value=None)

        from order_service import place_order
        order_id = await place_order({'customerId': 'c1', 'total': 50.0})

        mock_instance.save_state.assert_called_once()
        mock_instance.publish_event.assert_called_once()
        assert order_id is not None
```

## Summary

Dapr APIs can be mocked at two levels: the SDK client level using mock frameworks like Moq (C#) or `unittest.mock` (Python), or the HTTP level using WireMock.NET to impersonate the Dapr sidecar. SDK-level mocks are simpler for unit tests. HTTP-level mocks verify serialization and HTTP behavior. Use the approach that matches your test's scope and confidence requirements.
