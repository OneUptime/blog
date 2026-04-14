# How to Implement Hedging Requests with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resiliency, Hedging, Latency, Performance

Description: Learn how to implement the hedged request pattern in Dapr to reduce tail latency by sending redundant requests and using the first successful response.

---

## What Is Request Hedging?

Request hedging sends the same request to multiple service instances simultaneously (or with a small delay) and uses whichever response arrives first. Unlike retries (which wait for failure), hedging proactively reduces tail latency - the slow P99/P999 cases where a single instance happens to be slow.

Dapr does not have a built-in hedging policy, but you can implement hedging in application code using Go's goroutines, JavaScript's `Promise.any`, or Python's `asyncio`.

## Pattern 1: Immediate Parallel Hedging

Send the same request to multiple instances at once and take the first response:

```go
package main

import (
    "context"
    "fmt"

    dapr "github.com/dapr/go-sdk/client"
)

type HedgedResult struct {
    Data     []byte
    Instance string
    Err      error
}

// HedgeRequest sends to multiple instances, returns first success
func HedgeRequest(
    ctx context.Context,
    client dapr.Client,
    appIDs []string,
    method string,
    data []byte,
) ([]byte, error) {
    ctx, cancel := context.WithCancel(ctx)
    defer cancel()

    results := make(chan HedgedResult, len(appIDs))

    for _, appID := range appIDs {
        go func(id string) {
            resp, err := client.InvokeMethodWithContent(ctx, id, method, "POST",
                &dapr.DataContent{Data: data, ContentType: "application/json"})
            results <- HedgedResult{Data: resp, Instance: id, Err: err}
        }(appID)
    }

    var lastErr error
    received := 0
    for received < len(appIDs) {
        select {
        case result := <-results:
            received++
            if result.Err == nil {
                cancel() // Cancel remaining in-flight requests
                fmt.Printf("Hedged request won from instance: %s\n", result.Instance)
                return result.Data, nil
            }
            lastErr = result.Err
        case <-ctx.Done():
            return nil, ctx.Err()
        }
    }

    return nil, fmt.Errorf("all hedged requests failed, last error: %w", lastErr)
}

// Usage
result, err := HedgeRequest(ctx, client,
    []string{"search-service-1", "search-service-2", "search-service-3"},
    "search",
    searchParams,
)
```

## Pattern 2: Delayed Hedging (Speculative Execution)

Send the first request, and only hedge if it doesn't respond within a threshold:

```javascript
async function hedgedRequest(client, appIds, method, data, hedgeDelay = 200) {
  return new Promise((resolve, reject) => {
    const errors = [];
    let settled = false;

    function tryInstance(appId, delay) {
      return new Promise((res, rej) => {
        setTimeout(async () => {
          if (settled) return;
          try {
            const result = await client.invoker.invoke(appId, method, "POST", data);
            res({ result, appId });
          } catch (err) {
            rej({ err, appId });
          }
        }, delay);
      });
    }

    // Start first request immediately
    const requests = [tryInstance(appIds[0], 0)];

    // Launch hedges with delays
    for (let i = 1; i < appIds.length; i++) {
      requests.push(tryInstance(appIds[i], hedgeDelay * i));
    }

    Promise.any(requests)
      .then(({ result, appId }) => {
        settled = true;
        console.log(`Hedged request completed by: ${appId}`);
        resolve(result);
      })
      .catch(() => {
        reject(new Error('All hedged requests failed'));
      });
  });
}

// Usage: try 3 instances, hedge after 200ms
const result = await hedgedRequest(
  client,
  ['search-service-a', 'search-service-b', 'search-service-c'],
  'search',
  { query: 'laptops' },
  200  // hedge delay in ms
);
```

## Pattern 3: Python Async Hedging

```python
import asyncio
import json
from dapr.aio.clients import DaprClient

async def hedged_invoke(app_ids: list, method: str, data: dict, hedge_delay: float = 0.1):
    """
    Invoke a method across multiple app instances.
    Returns the first successful response.
    """
    async with DaprClient() as client:
        async def invoke_one(app_id: str, delay: float):
            if delay > 0:
                await asyncio.sleep(delay)
            response = await client.invoke_method(
                app_id=app_id,
                method_name=method,
                data=json.dumps(data),
                content_type="application/json",
            )
            return {"result": response.json(), "app_id": app_id}

        tasks = [
            asyncio.create_task(invoke_one(app_id, i * hedge_delay))
            for i, app_id in enumerate(app_ids)
        ]

        done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)

        # Cancel remaining tasks
        for task in pending:
            task.cancel()

        for task in done:
            result = task.result()
            print(f"Hedged request completed by: {result['app_id']}")
            return result["result"]

    raise RuntimeError("All hedged requests failed")
```

## When to Use Hedging

Hedging is best for:
- Read operations (idempotent requests)
- Search and recommendation APIs with high tail latency
- Latency-sensitive user-facing operations

Do not use hedging for:
- Write operations (non-idempotent)
- Expensive operations where duplicate execution wastes resources
- Payment or order creation endpoints

## Summary

Request hedging in Dapr is implemented in application code by sending the same request to multiple service instances concurrently and returning the first successful response. Use delayed hedging to limit duplicate work while still catching slow instances. Reserve hedging for idempotent read operations where tail latency reduction justifies the added resource usage.
