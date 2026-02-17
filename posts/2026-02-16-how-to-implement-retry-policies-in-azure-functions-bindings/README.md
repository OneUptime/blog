# How to Implement Retry Policies in Azure Functions Bindings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Functions, Retry Policies, Error Handling, Resilience, Azure, Fault Tolerance, Serverless

Description: Configure and implement retry policies for Azure Functions triggers and bindings to handle transient failures and build resilient serverless applications.

---

Transient failures happen all the time in distributed systems. A database connection times out, a downstream API returns a 503, a queue message fails to process because of a temporary lock conflict. If your Azure Function does not have a retry strategy, these momentary glitches become permanent failures. Azure Functions provides built-in retry policies that you can configure at the function level, the host level, or within your code to handle these situations gracefully.

In this post, I will cover all the retry mechanisms available in Azure Functions, when to use each one, and how to configure them properly.

## Understanding the Retry Mechanisms

Azure Functions has three layers of retry behavior.

The first layer is **trigger-specific retry behavior**. Queue triggers, Service Bus triggers, and Event Hub triggers each have their own built-in retry logic that is separate from the general retry policy. For example, queue triggers automatically retry messages up to 5 times before sending them to a poison queue.

The second layer is the **function-level retry policy**. This is a general-purpose retry that you configure on individual functions. It applies to any unhandled exception thrown by your function code.

The third layer is **code-level retry logic** that you implement yourself, typically using a library like Polly. This gives you the most control but requires more code.

## Function-Level Retry Policies

Starting with Azure Functions runtime version 4.x, you can configure retry policies directly on functions using the `FixedDelayRetry` or `ExponentialBackoffRetry` attributes.

### Fixed Delay Retry

This retries with a constant delay between attempts. Good for cases where the failure is likely to resolve after a brief wait.

```csharp
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

public class OrderProcessor
{
    private readonly ILogger<OrderProcessor> _logger;
    private readonly IPaymentService _paymentService;

    public OrderProcessor(ILogger<OrderProcessor> logger, IPaymentService paymentService)
    {
        _logger = logger;
        _paymentService = paymentService;
    }

    // Retry up to 3 times with a 5-second delay between each attempt
    // This is useful when the failure is likely transient (network blip, etc.)
    [Function("ProcessPayment")]
    [FixedDelayRetry(3, "00:00:05")]
    public async Task Run(
        [QueueTrigger("payment-requests")] PaymentRequest request)
    {
        _logger.LogInformation("Processing payment for order {OrderId}", request.OrderId);

        // If this throws, the runtime will retry up to 3 times
        await _paymentService.ChargeAsync(request);

        _logger.LogInformation("Payment processed for order {OrderId}", request.OrderId);
    }
}
```

### Exponential Backoff Retry

This increases the delay between retries exponentially. This is the preferred approach for most scenarios because it gives the failing service more time to recover as retries progress.

```csharp
// Exponential backoff: retries with increasing delays
// Attempt 1: immediate
// Attempt 2: ~2 seconds after failure
// Attempt 3: ~4 seconds after failure
// Attempt 4: ~8 seconds after failure (capped at maximumInterval)
// Attempt 5: ~16 seconds after failure (capped at maximumInterval)
[Function("SyncExternalData")]
[ExponentialBackoffRetry(5, "00:00:02", "00:05:00")]
public async Task SyncData(
    [TimerTrigger("0 */5 * * * *")] TimerInfo timer)
{
    _logger.LogInformation("Starting data sync at {Time}", DateTime.UtcNow);

    // Call an external API that might be temporarily unavailable
    var data = await _externalApi.FetchLatestDataAsync();
    await _database.UpsertAsync(data);
}
```

The three parameters are: maximum retry count (5), minimum interval (2 seconds), and maximum interval (5 minutes). The actual delay is randomized between the minimum and a value that doubles with each attempt, up to the maximum.

## Host-Level Retry Configuration

You can also configure retry behavior in `host.json` for specific trigger types.

```json
{
  "version": "2.0",
  "extensions": {
    "serviceBus": {
      "prefetchCount": 10,
      "messageHandlerOptions": {
        "autoComplete": false,
        "maxConcurrentCalls": 16,
        "maxAutoRenewDuration": "00:05:00"
      },
      "sessionHandlerOptions": {
        "autoComplete": false,
        "maxConcurrentSessions": 8
      }
    },
    "queues": {
      "maxPollingInterval": "00:00:02",
      "visibilityTimeout": "00:00:30",
      "batchSize": 16,
      "maxDequeueCount": 5,
      "newBatchThreshold": 8
    }
  },
  "retry": {
    "strategy": "exponentialBackoff",
    "maxRetryCount": 5,
    "minimumInterval": "00:00:02",
    "maximumInterval": "00:15:00"
  }
}
```

The `maxDequeueCount` in the queues section controls how many times a queue message is retried before being moved to the poison queue. This is separate from the function-level retry policy.

## Code-Level Retry with Polly

For fine-grained control, use the Polly resilience library. This lets you define different retry strategies for different operations within the same function.

```csharp
using Polly;
using Polly.Retry;

public class DataSyncFunction
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<DataSyncFunction> _logger;

    // Define a retry policy using Polly for HTTP calls
    // This retries on specific HTTP status codes with exponential backoff
    private readonly AsyncRetryPolicy<HttpResponseMessage> _httpRetryPolicy;

    public DataSyncFunction(HttpClient httpClient, ILogger<DataSyncFunction> logger)
    {
        _httpClient = httpClient;
        _logger = logger;

        // Build the retry policy
        _httpRetryPolicy = Policy
            .HandleResult<HttpResponseMessage>(r =>
                r.StatusCode == System.Net.HttpStatusCode.TooManyRequests ||
                r.StatusCode == System.Net.HttpStatusCode.ServiceUnavailable ||
                r.StatusCode == System.Net.HttpStatusCode.GatewayTimeout)
            .WaitAndRetryAsync(
                retryCount: 3,
                sleepDurationProvider: (retryAttempt, response, context) =>
                {
                    // Check for Retry-After header from the server
                    var retryAfter = response?.Result?.Headers?.RetryAfter;
                    if (retryAfter?.Delta != null)
                        return retryAfter.Delta.Value;

                    // Fall back to exponential backoff
                    return TimeSpan.FromSeconds(Math.Pow(2, retryAttempt));
                },
                onRetryAsync: async (response, timespan, retryAttempt, context) =>
                {
                    _logger.LogWarning(
                        "HTTP request failed with {StatusCode}. " +
                        "Retrying in {Delay}s (attempt {Attempt}/3)",
                        response.Result?.StatusCode,
                        timespan.TotalSeconds,
                        retryAttempt);
                });
    }

    [Function("SyncWithExternalApi")]
    public async Task Run(
        [TimerTrigger("0 */10 * * * *")] TimerInfo timer)
    {
        // Use the Polly policy for the HTTP call
        var response = await _httpRetryPolicy.ExecuteAsync(async () =>
        {
            return await _httpClient.GetAsync("https://api.example.com/data");
        });

        if (response.IsSuccessStatusCode)
        {
            var data = await response.Content.ReadAsStringAsync();
            _logger.LogInformation("Successfully synced {Length} bytes of data", data.Length);
        }
        else
        {
            _logger.LogError("Failed to sync data after all retries: {StatusCode}",
                response.StatusCode);
        }
    }
}
```

## Circuit Breaker Pattern

When a downstream service is consistently failing, retrying every request wastes resources. Combine retries with a circuit breaker to stop calling the failing service for a period.

```csharp
using Polly;
using Polly.CircuitBreaker;

// Register the circuit breaker as a singleton in Program.cs
// so it is shared across all function invocations
services.AddSingleton(sp =>
{
    var logger = sp.GetRequiredService<ILogger<Program>>();

    // Circuit breaker: after 5 consecutive failures, stop trying for 30 seconds
    var circuitBreaker = Policy
        .Handle<HttpRequestException>()
        .Or<TimeoutException>()
        .CircuitBreakerAsync(
            exceptionsAllowedBeforeBreaking: 5,
            durationOfBreak: TimeSpan.FromSeconds(30),
            onBreak: (ex, duration) =>
            {
                logger.LogWarning(
                    "Circuit breaker opened for {Duration}s due to: {Error}",
                    duration.TotalSeconds, ex.Message);
            },
            onReset: () =>
            {
                logger.LogInformation("Circuit breaker reset - resuming calls");
            },
            onHalfOpen: () =>
            {
                logger.LogInformation("Circuit breaker half-open - testing with next call");
            });

    // Wrap the circuit breaker with a retry policy
    var retryPolicy = Policy
        .Handle<HttpRequestException>()
        .Or<TimeoutException>()
        .WaitAndRetryAsync(3, retryAttempt =>
            TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)));

    // Combine: retry first, then circuit breaker
    return Policy.WrapAsync(retryPolicy, circuitBreaker);
});
```

## When Not to Retry

Not every failure should be retried. Retrying is only appropriate for transient errors. Here are cases where retrying makes things worse:

- **Authentication failures (401, 403)**: The credentials are wrong. Retrying will not fix them.
- **Validation errors (400)**: The request is malformed. It will fail every time.
- **Not found (404)**: The resource does not exist. Retrying will not create it.
- **Business logic errors**: If the order has already been processed, retrying will process it again.

```csharp
// Example of selective retry - only retry on transient errors
[Function("CallPartnerApi")]
public async Task ProcessRequest(
    [QueueTrigger("api-requests")] ApiRequest request)
{
    try
    {
        var response = await _httpClient.PostAsJsonAsync(request.Url, request.Body);

        // Only throw (and trigger retry) for transient errors
        if (response.StatusCode == System.Net.HttpStatusCode.ServiceUnavailable ||
            response.StatusCode == System.Net.HttpStatusCode.TooManyRequests ||
            response.StatusCode == System.Net.HttpStatusCode.GatewayTimeout)
        {
            throw new HttpRequestException(
                $"Transient failure: {response.StatusCode}");
        }

        // For non-transient errors, log and move on - do not retry
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError(
                "Non-transient error calling partner API: {StatusCode}",
                response.StatusCode);
            // Do not throw - this will complete the function successfully
            // and the message will be removed from the queue
        }
    }
    catch (TaskCanceledException)
    {
        // Timeout - this is transient, throw to trigger retry
        throw;
    }
}
```

## Monitoring Retry Behavior

Use Application Insights to track retry attempts and identify functions that are failing frequently.

```kusto
// Find functions with high retry rates
requests
| where timestamp > ago(24h)
| where cloud_RoleName == "my-function-app"
| where success == false
| summarize FailureCount = count(), AvgDuration = avg(duration) by name
| order by FailureCount desc
```

## Summary

Azure Functions gives you multiple layers of retry capability. Use function-level attributes (`FixedDelayRetry` or `ExponentialBackoffRetry`) for straightforward retry scenarios. Use host-level configuration for trigger-specific behavior. Use Polly for fine-grained, operation-specific retry and circuit breaker patterns. And always distinguish between transient errors (which should be retried) and permanent errors (which should not). A well-designed retry strategy is the difference between a system that self-heals from temporary failures and one that escalates every blip into an incident.
