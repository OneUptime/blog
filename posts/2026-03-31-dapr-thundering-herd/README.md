# How to Handle Thundering Herd Problems with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Thundering Herd, Resiliency, Circuit Breaker, Performance

Description: Prevent thundering herd problems in Dapr microservices using circuit breakers, retry jitter, bulkhead patterns, and rate limiting to protect downstream services.

---

## What Is the Thundering Herd Problem?

A thundering herd occurs when many clients simultaneously retry or reconnect after a failure, overwhelming the recovering service. Common causes include: cache invalidation (all requests miss and hit the DB), service restart (all consumers reconnect at once), and synchronized retry loops.

## Adding Jitter to Retries

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: anti-thundering-herd
spec:
  policies:
    retries:
      exponential-with-jitter:
        policy: exponential
        maxRetries: 5
        maxInterval: 30s
        # Dapr's exponential backoff includes jitter automatically
    timeouts:
      service-timeout: 5s
    circuitBreakers:
      shared-cb:
        maxRequests: 5
        interval: 30s
        timeout: 60s
        trip: consecutiveFailures >= 10
  targets:
    apps:
      database-service:
        retry: exponential-with-jitter
        timeout: service-timeout
        circuitBreaker: shared-cb
```

## Cache Stampede Prevention

```python
import asyncio
from dapr.aio.clients import DaprClient
from dapr.clients.grpc._state import StateOptions, Consistency

CACHE_TTL = 300  # 5 minutes
LOCK_TTL = 10    # 10 seconds

class StampedePreventingCache:
    def __init__(self, store: str = "statestore"):
        self.store = store
        self._local_locks: dict[str, asyncio.Lock] = {}

    async def get_or_compute(self, key: str, compute_fn) -> dict:
        # Check cache first
        async with DaprClient() as client:
            cached = await client.get_state(self.store, key)
            if cached.data:
                return cached.json()

            # Acquire distributed lock to prevent stampede
            lock_key = f"lock:{key}"
            lock_acquired = False
            try:
                await client.save_state(self.store, lock_key, "locked",
                    options=StateOptions(consistency=Consistency.strong))
                lock_acquired = True
            except Exception:
                # Lock already held - wait and retry
                await asyncio.sleep(0.5 + (hash(key) % 500) / 1000.0)
                second_check = await client.get_state(self.store, key)
                if second_check.data:
                    return second_check.json()

            if lock_acquired:
                try:
                    # Compute the value (DB query, API call, etc.)
                    value = await compute_fn(key)
                    # Store with TTL
                    await client.save_state(self.store, key, value,
                        state_metadata={"ttlInSeconds": str(CACHE_TTL)})
                    return value
                finally:
                    await client.delete_state(self.store, lock_key)
```

## Bulkhead Pattern to Isolate Call Paths

```go
package bulkhead

import (
    "context"
    "errors"
    "sync"
)

type Bulkhead struct {
    sem chan struct{}
    mu  sync.Mutex
}

func New(maxConcurrent int) *Bulkhead {
    return &Bulkhead{sem: make(chan struct{}, maxConcurrent)}
}

func (b *Bulkhead) Execute(ctx context.Context, fn func() error) error {
    select {
    case b.sem <- struct{}{}:
        defer func() { <-b.sem }()
        return fn()
    case <-ctx.Done():
        return errors.New("bulkhead: circuit full, request rejected")
    default:
        return errors.New("bulkhead: at capacity, request shed")
    }
}
```

```go
// Isolate expensive operations behind separate bulkheads
var (
    dbBulkhead      = bulkhead.New(50)
    externalBulkhead = bulkhead.New(20)
    cacheBulkhead   = bulkhead.New(200)
)

func handleRequest(w http.ResponseWriter, r *http.Request) {
    err := dbBulkhead.Execute(r.Context(), func() error {
        return performDatabaseCall(r.Context())
    })
    if err != nil {
        http.Error(w, "service busy", http.StatusTooManyRequests)
        return
    }
    w.WriteHeader(http.StatusOK)
}
```

## Rate Limiting Incoming Requests

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: rate-limiter
spec:
  type: middleware.http.ratelimit
  version: v1
  metadata:
  - name: maxRequestsPerSecond
    value: "1000"
```

## Testing Thundering Herd Resistance

```bash
# Simulate thundering herd: 500 concurrent requests
seq 1 500 | xargs -P 500 -I{} \
  curl -s -o /dev/null -w "%{http_code}\n" \
  http://localhost:3500/v1.0/invoke/data-service/method/expensive-query | \
  sort | uniq -c

# Expected output:
#  450 200  (successful)
#   50 429  (rate limited - good!)
```

## Summary

Thundering herd problems require multiple overlapping defenses: exponential backoff with jitter prevents synchronized retries, cache stampede prevention serializes cache population under load, bulkheads isolate resource pools from each other, and rate limiters shed excess load at the edge. Dapr's Resiliency policies provide the retry and circuit breaker primitives; the cache and bulkhead patterns are implemented in application code.
