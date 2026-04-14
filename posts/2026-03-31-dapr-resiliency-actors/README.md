# How to Apply Resiliency Policies to Actors in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resiliency, Actor, Retry, Fault Tolerance

Description: Learn how to apply Dapr resiliency policies to actor method invocations and reminders to handle transient failures in stateful actor workflows.

---

## Overview

Dapr actors are stateful virtual entities that process method calls and reminders. When actor methods fail due to transient errors (network issues, temporary unavailability during rebalancing), resiliency policies automatically retry the operations. Applying resiliency to actors is especially important in long-running workflows where a single transient failure should not abort the entire process.

## Actor Resiliency Configuration

Actor resiliency is configured under `targets.actors` using actor type names:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: actor-resiliency
  namespace: default
spec:
  policies:
    timeouts:
      actorMethodTimeout: 10s
      longActorTimeout: 60s
    retries:
      actorRetry:
        policy: exponential
        initialInterval: 500ms
        multiplier: 2.0
        maxInterval: 30s
        maxRetries: 5
        randomizationFactor: 0.5
      quickActorRetry:
        policy: constant
        duration: 200ms
        maxRetries: 3
    circuitBreakers:
      actorCB:
        maxRequests: 1
        interval: 30s
        timeout: 60s
        trip: consecutiveFailures >= 5
  targets:
    actors:
      OrderActor:
        timeout: actorMethodTimeout
        retry: actorRetry
        circuitBreaker: actorCB
      PaymentActor:
        timeout: longActorTimeout
        retry: actorRetry
      NotificationActor:
        timeout: actorMethodTimeout
        retry: quickActorRetry
```

## Invoking Actor Methods

Actor method invocations are automatically protected by the resiliency policy. No code changes are required in the caller:

```python
import asyncio
from dapr.actor import ActorProxy, ActorId

async def main():
    # If OrderActor is unavailable due to rebalancing,
    # Dapr will retry per the actorRetry policy
    proxy = ActorProxy.create('OrderActor', ActorId('order-123'))
    response = await proxy.invoke_method(
        'processPayment',
        {"amount": 99.99, "currency": "USD"}
    )

asyncio.run(main())
```

In the actor host, implement your method normally:

```go
type OrderActor struct {
    actor.ServerImplBaseCtx
}

func (a *OrderActor) ProcessPayment(ctx context.Context, req *PaymentRequest) ([]byte, error) {
    // If this returns an error, the caller's resiliency policy retries the invocation
    result, err := chargePaymentGateway(req)
    if err != nil {
        return nil, fmt.Errorf("payment failed: %w", err)
    }
    return result, nil
}
```

## Actor Reminder Resiliency

Resiliency policies also apply to actor reminder callbacks. If a reminder fires and the handler returns an error, it will be retried:

```javascript
class OrderActor extends AbstractActor {
  async receiveReminder(state) {
    try {
      await this.checkOrderExpiry(state);
    } catch (err) {
      // Throw to trigger reminder retry
      throw new Error(`Order reminder processing failed: ${err.message}`);
    }
  }
}
```

## Default Actor Policies

Apply a default policy to all actor types using the `default` keyword:

```yaml
targets:
  actors:
    default:
      timeout: actorMethodTimeout
      retry: actorRetry
    CriticalActor:
      timeout: actorMethodTimeout
      retry: quickActorRetry
      circuitBreaker: actorCB
```

## Actors and Placement Service Failures

During placement service rebalancing (e.g., scaling events), actor invocations may temporarily fail. The retry policy handles this case:

```yaml
retries:
  rebalanceRetry:
    policy: constant
    duration: 1s
    maxRetries: 10

targets:
  actors:
    default:
      retry: rebalanceRetry
```

## Monitoring Actor Resiliency

```bash
kubectl logs deployment/actor-host -c daprd \
  | grep -E "actor|retry|circuit" | tail -20

curl http://localhost:9090/metrics \
  | grep "dapr_actor"
```

## Summary

Dapr resiliency policies for actors protect actor method invocations and reminders from transient failures. Configuring retry and circuit breaker policies per actor type ensures that rebalancing events, temporary network issues, and brief actor unavailability are handled automatically, making stateful actor workflows resilient without additional error handling code.
