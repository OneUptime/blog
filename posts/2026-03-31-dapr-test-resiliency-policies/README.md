# How to Test Dapr Resiliency Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resiliency, Testing, Retry, Circuit Breaker

Description: Learn how to verify Dapr resiliency policies by injecting faults into services and observing retry, timeout, and circuit breaker behavior in integration tests.

---

## What Are Dapr Resiliency Policies?

Dapr resiliency policies define how the sidecar handles failures in service invocation, state operations, and pub/sub. Policies include retries with backoff, timeouts, and circuit breakers. Testing them means deliberately causing failures and verifying the sidecar behaves as configured.

## Resiliency Configuration Under Test

```yaml
# components/resiliency.yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: app-resiliency
spec:
  policies:
    retries:
      ServiceRetry:
        policy: exponential
        maxRetries: 3
        maxInterval: 5s
    timeouts:
      ServiceTimeout: 2s
    circuitBreakers:
      ServiceCircuitBreaker:
        maxRequests: 1
        interval: 5s
        timeout: 10s
        trip: consecutiveFailures >= 3

  targets:
    apps:
      inventory-service:
        retry: ServiceRetry
        timeout: ServiceTimeout
        circuitBreaker: ServiceCircuitBreaker
```

## Test: Verifying Retry Behavior

Create a fault-injecting stub service that fails a configurable number of times before succeeding:

```csharp
// InventoryStub/FaultController.cs
[ApiController]
[Route("products")]
public class FaultController : ControllerBase
{
    private static int _callCount = 0;
    private static int _failCount = 2;

    [HttpGet("{productId}/stock")]
    public IActionResult GetStock(string productId)
    {
        _callCount++;

        if (_callCount <= _failCount)
        {
            return StatusCode(503, "Service temporarily unavailable");
        }

        _callCount = 0; // Reset for next test
        return Ok(new { productId, available = 100 });
    }

    [HttpPost("reset")]
    public IActionResult Reset([FromQuery] int failCount = 2)
    {
        _callCount = 0;
        _failCount = failCount;
        return Ok();
    }
}
```

```csharp
// ResiliencyTests.cs
[Fact]
[Trait("Category", "Integration")]
public async Task ServiceInvocation_RetriesAfterTransientFailures()
{
    // Configure stub to fail twice then succeed
    await _stubClient.PostAsync(
        "http://localhost:3001/products/reset?failCount=2", null);

    var stopwatch = Stopwatch.StartNew();

    // This call should succeed after 2 retries
    var response = await _orderClient.GetAsync(
        "http://localhost:3000/orders/check-inventory/sku-1");

    stopwatch.Stop();

    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    // Exponential backoff adds measurable delay across retries
    Assert.True(stopwatch.Elapsed > TimeSpan.FromSeconds(1));
}
```

## Test: Timeout Enforcement

```csharp
[Fact]
[Trait("Category", "Integration")]
public async Task ServiceInvocation_TimesOutSlowService()
{
    // Configure stub to delay for 5 seconds (longer than 2s timeout)
    await _stubClient.PostAsync(
        "http://localhost:3001/products/configure-delay?seconds=5", null);

    var response = await _orderClient.GetAsync(
        "http://localhost:3000/orders/check-inventory/sku-timeout");

    // The order service should return an error when Dapr times out
    Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
}
```

## Test: Circuit Breaker Trip

```csharp
[Fact]
[Trait("Category", "Integration")]
public async Task CircuitBreaker_OpensAfterConsecutiveFailures()
{
    // Configure stub to always fail
    await _stubClient.PostAsync(
        "http://localhost:3001/products/reset?failCount=100", null);

    // Make 3 failing calls to trip the circuit breaker
    for (int i = 0; i < 3; i++)
    {
        await _orderClient.GetAsync(
            $"http://localhost:3000/orders/check-inventory/sku-cb-{i}");
        await Task.Delay(100);
    }

    // 4th call should be rejected immediately (circuit open)
    var stopwatch = Stopwatch.StartNew();
    var response = await _orderClient.GetAsync(
        "http://localhost:3000/orders/check-inventory/sku-cb-fast");
    stopwatch.Stop();

    // Circuit open = fast failure, no network call made
    Assert.True(stopwatch.Elapsed < TimeSpan.FromMilliseconds(500));
}
```

## Chaos Testing Beyond Stubs

For more advanced fault injection beyond application-level stubs, consider external chaos engineering tools such as Chaos Mesh or Litmus that can inject network-level faults (latency, packet loss, partition) between your services and the Dapr sidecar. These tools complement the stub-based approach shown above by testing infrastructure-level failures that application code cannot simulate.

## Summary

Testing Dapr resiliency policies requires fault-injecting stub services that return configurable HTTP error codes or delays. Verify retry policies by counting elapsed time (exponential backoff adds measurable delay), timeout policies by confirming fast failure on slow services, and circuit breakers by checking that repeated failures produce near-instant rejections. This confirms your resiliency YAML configuration matches expected behavior.
