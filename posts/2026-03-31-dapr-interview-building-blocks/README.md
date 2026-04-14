# How to Explain Dapr Building Blocks in an Interview

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Interview, Building Block, API, Microservice

Description: Explain all 10 Dapr building blocks in a technical interview with concrete use cases, API examples, and comparisons to alternative approaches for each building block.

---

## The Building Block Concept

**Interview answer:** "Building blocks are standardized APIs that abstract common distributed system patterns. Each building block has multiple component implementations - for example, the pub/sub building block works with Kafka, Redis Streams, Azure Service Bus, or any other broker by just changing the component YAML."

## 1. Service Invocation

Synchronous service-to-service communication with name resolution, retries, and mTLS:

```bash
# App A calls App B via Dapr
curl http://localhost:3500/v1.0/invoke/orderservice/method/getorder?orderId=123

# Dapr handles: name resolution, load balancing, mTLS, retries
```

Use case: Replace direct HTTP calls between microservices with discoverable, resilient calls.

## 2. State Management

Key/value store abstraction with optional consistency and concurrency control:

```bash
# Save state
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -d '[{"key":"order-123","value":{"status":"created"}}]'

# Get state
curl http://localhost:3500/v1.0/state/statestore/order-123
```

Use case: Cart data, session state, aggregate persistence.

## 3. Publish and Subscribe

Async event-driven messaging with guaranteed delivery and dead letter support:

```bash
# Publish event
curl -X POST http://localhost:3500/v1.0/publish/pubsub/order-created \
  -d '{"orderId":"123"}'

# Subscribe (app registers route in code)
# POST /events/order-created <- Dapr delivers events here
```

Use case: Order created events triggering inventory reservation and notifications.

## 4. Bindings

Connect to external systems (databases, queues, SaaS APIs) as inputs or outputs:

```yaml
# Output binding to send email via SendGrid
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sendgrid-binding
spec:
  type: bindings.twilio.sendgrid
  version: v1
  metadata:
    - name: apiKey
      secretKeyRef: { name: sendgrid-secret, key: apiKey }
```

Use case: Trigger a cron job (input binding), write to S3 (output binding).

## 5. Actors

Stateful, single-threaded virtual objects with timers and reminders:

```csharp
// Actor definition
public interface IOrderActor : IActor
{
    Task<string> GetStatusAsync();
    Task ProcessAsync(string action);
}
```

Use case: IoT device state, shopping cart actor, game character state.

## 6. Secrets Management

Unified API for reading secrets from Vault, Kubernetes Secrets, AWS Secrets Manager:

```bash
curl http://localhost:3500/v1.0/secrets/vault/db-password
```

Use case: Component metadata can reference secrets; app avoids hardcoding credentials.

## 7. Configuration

Read and subscribe to dynamic configuration from config stores:

```go
items, _ := client.GetConfigurationItems(ctx, "configstore", []string{"featureFlag"})
client.SubscribeConfigurationItems(ctx, "configstore", []string{"featureFlag"}, callback)
```

Use case: Feature flags, rate limit thresholds, circuit breaker settings.

## 8. Distributed Lock

Distributed mutex for leader election and critical section protection:

```go
lock, _ := client.TryLockAlpha1(ctx, "lockstore", &dapr.LockRequest{
    LockOwner:         "instance-1",
    ResourceID:        "order-processor",
    ExpiryInSeconds:   30,
})
```

Use case: Ensure only one instance processes a batch job at a time.

## 9. Workflow

Durable, long-running process orchestration with activities, timers, and external events:

```python
@wf.workflow(name="order-workflow")
def order_workflow(ctx: DaprWorkflowContext, order_id: str):
    yield ctx.call_activity(validate_order, input=order_id)
    yield ctx.call_activity(process_payment, input=order_id)
    yield ctx.call_activity(ship_order, input=order_id)
```

Use case: Order fulfillment, multi-step approval processes, ETL pipelines.

## 10. Cryptography

Encrypt/decrypt data and manage keys without exposing key material to the app:

```go
enc, _ := client.Encrypt(ctx, bytes.NewReader([]byte("sensitive data")), dapr.EncryptOptions{
    ComponentName: "vault-crypto",
    KeyName:       "customer-data-key",
    Algorithm:     "RSA",
})
```

Use case: Encrypt PII before storing in state, sign API payloads.

## How to Frame Building Blocks in an Interview

"Each building block solves a specific distributed systems challenge. The key insight is that the API stays the same regardless of the underlying infrastructure. I can develop locally with Redis and deploy to production with Azure Cosmos DB by changing one YAML file - zero code changes."

## Summary

Dapr's 10 building blocks cover the core distributed systems patterns: service invocation, state management, pub/sub, bindings, actors, secrets, configuration, distributed locks, workflow, and cryptography. In an interview, demonstrate depth by giving a concrete use case for each and emphasizing that the portable API surface is what differentiates Dapr from using infrastructure SDKs directly.
