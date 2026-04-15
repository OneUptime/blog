# How to Debug Distributed Lock Issues in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Distributed Lock, Debugging, Redis, Observability

Description: Learn practical techniques for debugging Dapr distributed lock problems including deadlocks, stale locks, unlock failures, and contention using Redis CLI and Dapr logs.

---

Distributed lock bugs are notoriously hard to diagnose. Symptoms include services hanging, tasks not running, or duplicate processing despite locks. This guide provides systematic techniques for identifying and resolving Dapr distributed lock issues.

## Common Lock Problems

| Problem | Symptom | Likely Cause |
|---|---|---|
| Deadlock | Service hangs indefinitely | Lock never released; expiry too high |
| Stale lock | Task not running | Previous owner crashed, TTL not expired |
| Lock leak | Increasing Redis memory | Missing unlock in error path |
| Contention | High latency | Many instances fighting for same key |
| Wrong owner | Unlock fails | Lock owner ID not consistent across retries |

## Inspecting Lock State in Redis

Dapr stores locks as Redis strings. The default key format is `lock||<appID>||<resourceID>`, where the lock owner is stored as the value (not part of the key).

View all current locks held in the lock store:

```bash
# List all lock keys
redis-cli KEYS "lock||*"

# Check TTL on a specific lock
redis-cli TTL "lock||myapp||my-resource"

# View the lock owner
redis-cli GET "lock||myapp||my-resource"
```

## Manually Releasing a Stale Lock

If a lock is stuck and the owner is gone, delete it manually:

```bash
redis-cli DEL "lock||myapp||my-resource"
```

Use this only when the owning process is confirmed dead. Do not delete locks that are actively held.

## Enabling Dapr Debug Logging

Run your app with verbose Dapr logging to see lock API calls:

```bash
dapr run --app-id myapp --log-level debug -- node app.js
```

Look for log lines related to lock operations:

```text
time="2026-03-31T10:00:00Z" level=debug msg="TryLock called" resourceID=my-resource lockOwner=worker-1
time="2026-03-31T10:00:30Z" level=debug msg="Unlock called" resourceID=my-resource lockOwner=worker-1
```

## Tracing Lock Operations with OpenTelemetry

Dapr emits traces for distributed lock calls. Configure Zipkin to capture them:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: tracing
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: http://zipkin:9411/api/v2/spans
```

Traces show `TryLock` and `Unlock` spans, including latency and success/failure.

## Detecting Lock Leaks

Write a health check that reports current lock count:

```bash
# Count active locks in Redis for a store
redis-cli KEYS "lock||*" | wc -l
```

Alert if this count grows monotonically - it indicates locks are not being released.

## Testing Lock Behavior with the HTTP API

Manually test lock acquire and release using curl to isolate application bugs:

```bash
# Acquire
curl -X POST http://localhost:3500/v1.0-alpha1/lock/lockstore \
  -H "Content-Type: application/json" \
  -d '{"resourceId":"debug-resource","lockOwner":"debug-test","expiryInSeconds":60}'

# Verify in Redis
redis-cli TTL "lock||myapp||debug-resource"

# Release
curl -X POST http://localhost:3500/v1.0-alpha1/unlock/lockstore \
  -H "Content-Type: application/json" \
  -d '{"resourceId":"debug-resource","lockOwner":"debug-test"}'
```

## Diagnosing Unlock Failures

Unlock can fail if the lock owner does not match the stored value. Always log the unlock response:

```go
unlockResp, err := client.UnlockAlpha1(ctx, "lockstore", &dapr.UnlockRequest{
    LockOwner:  owner,
    ResourceID: resourceID,
})
if err != nil || unlockResp.Status != "SUCCESS" {
    log.Printf("Unlock failed: status=%v err=%v owner=%s resource=%s",
        unlockResp.Status, err, owner, resourceID)
}
```

## Summary

Debugging Dapr distributed lock issues requires combining Redis CLI inspection, Dapr debug logs, and distributed tracing. The most common problems are stale locks from crashed owners (resolved by waiting for TTL or manual deletion), lock leaks from missing unlock calls, and owner ID mismatches. Systematic logging of every lock acquisition and release outcome makes these issues far easier to diagnose.
