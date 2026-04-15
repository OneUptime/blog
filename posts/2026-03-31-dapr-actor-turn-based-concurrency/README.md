# How to Use Actor Turn-Based Concurrency in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Concurrency, Turn-Based, Thread Safety

Description: Understand how Dapr enforces turn-based concurrency for actor method calls, eliminating race conditions in stateful microservices without explicit locking code.

---

Turn-based concurrency is one of the most valuable features of the Dapr actor model. It guarantees that only one method executes at a time per actor instance, eliminating the entire class of concurrency bugs that plague traditional stateful services.

## How Turn-Based Concurrency Works

When multiple callers invoke methods on the same actor simultaneously, Dapr queues the requests and processes them one at a time:

```text
Time -->
Client A: ----[Increment]----done
Client B:                 ---[Increment]----done  (waited for A)
Client C:                                 -[GetCount]--done  (waited for B)
```

This is enforced by the Dapr sidecar before the request even reaches your application code.

## The Problem It Solves

Without turn-based concurrency, a race condition on a simple counter looks like:

```go
// WITHOUT actor model - race condition possible
func (s *CounterService) Increment(delta int) {
  current := s.db.Get("count")  // Both goroutines read 5
  s.db.Set("count", current+delta)  // Both write 6 instead of 7
}
```

With Dapr actors, this is impossible because only one `Increment` call runs at a time per actor ID.

## Verifying Turn-Based Behavior

```go
func (a *CounterActor) Increment(ctx context.Context, req *IncrementRequest) (*CountResponse, error) {
  log.Printf("[%s] Increment called at %v", a.ID(), time.Now())

  var count int
  a.GetStateManager().Get(ctx, "count", &count)
  count += req.Amount

  // Simulate work - concurrent callers will be queued, not parallel
  time.Sleep(100 * time.Millisecond)

  a.GetStateManager().Set(ctx, "count", count)
  return &CountResponse{Count: count}, nil
}
```

Send 5 concurrent requests:

```bash
for i in {1..5}; do
  curl -s -X POST http://localhost:3500/v1.0/actors/Counter/c1/method/Increment \
    -d '{"amount": 1}' &
done
wait
```

The final count will always be 5, never less - turn-based concurrency guarantees sequential execution.

## Reentrancy: The Exception to the Rule

By default, turn-based concurrency is strict - an actor cannot call itself. For scenarios where actor A calls actor B which calls back to actor A, you need reentrancy enabled:

```json
{
  "entities": ["Counter"],
  "reentrancy": {
    "enabled": true,
    "maxStackDepth": 32
  }
}
```

Without reentrancy enabled, such circular calls deadlock.

## Avoiding Long-Held Turns

Since turns are serialized, a slow method blocks all other callers:

```go
// BAD: blocks the actor for seconds
func (a *MyActor) SlowMethod(ctx context.Context) error {
  time.Sleep(10 * time.Second)  // All other calls queued for 10s
  return nil
}

// GOOD: use context deadlines to bound execution time
func (a *MyActor) SlowMethod(ctx context.Context) error {
  ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
  defer cancel()
  return callExternalService(ctx)
}
```

## Turn Queue Depth Monitoring

Track turn queuing pressure with Dapr metrics:

```promql
# High pending call count suggests slow actor methods
dapr_runtime_actor_pending_actor_calls{actor_type="Counter"}
```

Alert if pending calls consistently exceed 10:

```yaml
- alert: ActorTurnQueueDeep
  expr: dapr_runtime_actor_pending_actor_calls{actor_type="Counter"} > 10
  for: 2m
  annotations:
    summary: "Actor turn queue is backing up"
```

## Summary

Dapr's turn-based concurrency eliminates race conditions in stateful actor methods by serializing all calls to the same actor instance. This simplifies state management code dramatically - no mutexes, no optimistic locking, no CAS loops. Keep actor methods fast to avoid blocking the turn queue, and enable reentrancy only when your design genuinely requires recursive actor calls.
