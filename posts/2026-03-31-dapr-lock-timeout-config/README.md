# How to Configure Lock Timeout in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Distributed Lock, Timeout, Configuration, Redis

Description: Learn how to configure lock timeouts in Dapr to prevent deadlocks, choose appropriate expiry values, and handle lock expiration gracefully in microservices.

---

Lock timeouts are one of the most important aspects of distributed locking. A lock without a timeout can cause permanent deadlocks if the lock owner crashes before releasing it. Dapr's Distributed Lock API requires you to specify an expiry on every lock acquisition.

## Understanding Lock Expiry

When you acquire a lock with `expiryInSeconds`, Dapr sets a TTL on the underlying store entry (e.g., Redis). If the owner does not explicitly release the lock before TTL expires, the lock is automatically freed. This is essential for fault tolerance.

## Setting Lock Expiry

The expiry is set per lock request, not in the component definition:

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/lock/lockstore \
  -H "Content-Type: application/json" \
  -d '{
    "resourceId": "invoice-generator",
    "lockOwner": "worker-1",
    "expiryInSeconds": 60
  }'
```

## Choosing the Right Timeout Value

Use the following heuristic:

| Workload Type | Suggested Expiry |
|---|---|
| Fast in-memory operation | 5-15 seconds |
| Database write or read | 15-30 seconds |
| External API call | 30-60 seconds |
| Long-running batch job | 120-600 seconds |

Always set the expiry to at least 2x the expected critical section duration. If the section runs longer than expected, the lock may expire early.

## Lock Expiry in Go SDK

```go
resp, err := client.TryLockAlpha1(ctx, "lockstore", &dapr.LockRequest{
    LockOwner:       "worker-go-1",
    ResourceID:      "report-export",
    ExpiryInSeconds: 120,
})
```

## Detecting and Handling Expired Locks

If your critical section might exceed the lock TTL, extend the lock by re-acquiring it before it expires:

```python
import threading
from dapr.clients import DaprClient

def refresh_lock(client, store, resource, owner, interval, expiry):
    def _refresh():
        while True:
            threading.Event().wait(interval)
            client.try_lock(store, resource, owner, expiry_in_seconds=expiry)
    t = threading.Thread(target=_refresh, daemon=True)
    t.start()
    return t
```

Call `refresh_lock` before starting a long critical section to keep renewing the lock every `interval` seconds with a fresh `expiry`.

## Verifying Lock TTL in Redis

Check the remaining TTL on a lock in Redis. The default key format uses the app ID and resource ID:

```bash
redis-cli TTL "lock||<appID>||invoice-generator"
```

Replace `<appID>` with your Dapr application ID. This returns the seconds remaining before the lock auto-expires.

## Summary

Lock timeouts in Dapr are specified per acquisition and serve as the primary defense against deadlocks. Choose expiry values based on your workload characteristics and add a safety margin. For long-running operations, implement lock renewal logic to avoid expiry mid-operation. Always inspect Redis TTL values during debugging to understand lock state.
