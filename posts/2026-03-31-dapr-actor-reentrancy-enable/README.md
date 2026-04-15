# How to Enable Actor Reentrancy in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Reentrancy, Distributed System, Microservice

Description: Learn how to enable and configure actor reentrancy in Dapr to allow actors to call themselves or other actors in a controlled call chain.

---

## Overview

By default, Dapr actors use turn-based concurrency, meaning an actor processes only one request at a time. Actor reentrancy is an optional feature that allows an actor to make reentrant calls within the same call chain without deadlocking, enabling more complex actor interaction patterns.

## When You Need Reentrancy

Without reentrancy, the following scenario causes a deadlock: Actor A calls Actor B, which calls back into Actor A before the first call completes. Actor A is locked waiting for B, and B is waiting for A to release its lock. Reentrancy resolves this by tracking the call chain context.

## Enabling Reentrancy in the Configuration

Enable reentrancy via the Dapr Configuration resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: actorconfig
  namespace: default
spec:
  actor:
    reentrancy:
      enabled: true
      maxStackDepth: 32
```

Apply the configuration:

```bash
kubectl apply -f actorconfig.yaml
```

## Configuring the Application to Use Reentrancy

Your application must return the reentrancy configuration from the actor runtime endpoint:

```python
# Python SDK - return reentrancy config from actor runtime endpoint
from dapr.actor.runtime.config import ActorRuntimeConfig, ActorReentrancyConfig

config = ActorRuntimeConfig(
    reentrancy=ActorReentrancyConfig(enabled=True, maxStackDepth=32)
)
```

```csharp
// .NET SDK - configure in startup
services.AddActors(options =>
{
    options.ReentrancyConfig = new ActorReentrancyConfig
    {
        Enabled = true,
        MaxStackDepth = 32
    };
    options.Actors.RegisterActor<OrderActor>();
});
```

## Understanding maxStackDepth

The `maxStackDepth` setting limits the depth of reentrant call chains to prevent infinite recursion. When the depth is exceeded, Dapr returns an error rather than deadlocking.

```bash
# Check if reentrancy is working by examining sidecar logs
kubectl logs -l app=actor-service -c daprd | grep -i "reentrant\|reentrancy"
```

## Testing Reentrant Calls

```javascript
// Node.js example: Actor A calls Actor B which calls back to Actor A
class ActorA extends AbstractActor {
  async processOrder(orderId) {
    // Call Actor B - B will call back to this actor
    const client = this.getDaprClient();
    const result = await client.actor.invoke("ActorB", "b-1", "validate", {
      orderId,
      callbackActor: this.getActorId(),
    });
    return result;
  }

  async onValidationComplete(data) {
    // This reentrant call works because reentrancy is enabled
    return { status: "completed", data };
  }
}
```

## Summary

Actor reentrancy in Dapr allows actors to participate in complex call chains without deadlocking by tracking a reentrant call context header. Enable it via the Dapr Configuration resource and set an appropriate `maxStackDepth` to guard against infinite recursion. Use reentrancy only when your actor interaction patterns genuinely require it, as it adds overhead compared to standard turn-based concurrency.
