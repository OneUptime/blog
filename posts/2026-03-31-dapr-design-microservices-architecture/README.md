# How to Design Microservices Architecture with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Microservice, Architecture, Kubernetes, Design Pattern

Description: Learn how to design a production-ready microservices architecture using Dapr building blocks for state, messaging, service invocation, and secrets.

---

Dapr provides a set of building blocks - service invocation, state management, pub/sub, bindings, secrets, and configuration - that map directly to common microservices patterns. Designing around these building blocks produces services that are loosely coupled and infrastructure-agnostic.

## Core Architecture Principles with Dapr

A well-designed Dapr architecture separates concerns by assigning each building block a dedicated responsibility. Services do not communicate with infrastructure directly; they call the local sidecar at `localhost:3500`.

```text
[Order Service] --> Dapr sidecar --> [Inventory Service]
                         |
                    [Redis State]
                    [Kafka Pub/Sub]
                    [Vault Secrets]
```

## Service Invocation Pattern

Use Dapr service invocation for synchronous request/response between services:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "checkout-service"
        dapr.io/app-port: "8080"
        dapr.io/app-protocol: "http"
```

```python
import httpx

async def reserve_inventory(order_id: str, items: list):
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "http://localhost:3500/v1.0/invoke/inventory-service/method/reserve",
            json={"orderId": order_id, "items": items}
        )
        resp.raise_for_status()
        return resp.json()
```

## Event-Driven Communication with Pub/Sub

Use pub/sub for asynchronous workflows to decouple services:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: orders-pubsub
  namespace: production
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: kafka-broker:9092
  - name: consumerGroup
    value: order-processors
```

```go
// Subscriber registers its topic endpoint
func main() {
    http.HandleFunc("/dapr/subscribe", func(w http.ResponseWriter, r *http.Request) {
        subscriptions := []map[string]string{
            {"pubsubname": "orders-pubsub", "topic": "order-placed", "route": "/order-placed"},
        }
        json.NewEncoder(w).Encode(subscriptions)
    })
    http.HandleFunc("/order-placed", handleOrderPlaced)
    http.ListenAndServe(":8080", nil)
}
```

## Distributed State Management

Partition state by service to avoid coupling through a shared database:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: order-state
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
  - name: actorStateStore
    value: "true"
```

```bash
# Save state
curl -X POST http://localhost:3500/v1.0/state/order-state \
  -H "Content-Type: application/json" \
  -d '[{"key":"order-001","value":{"status":"pending","total":99.99}}]'

# Get state
curl http://localhost:3500/v1.0/state/order-state/order-001
```

## Secrets and Configuration

Centralize secrets with a secrets store component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vault
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: https://vault:8200
  - name: vaultToken
    secretKeyRef:
      name: vault-token
      key: token
```

## Resiliency Policies

Apply retries and circuit breakers at the Dapr layer, not in each service:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: myresiliency
spec:
  policies:
    retries:
      retryThrice:
        policy: constant
        duration: 5s
        maxRetries: 3
    circuitBreakers:
      simpleCB:
        maxRequests: 1
        interval: 10s
        trip: consecutiveFailures >= 5
  targets:
    apps:
      inventory-service:
        outbound:
          retry: retryThrice
          circuitBreaker: simpleCB
```

## Summary

Dapr building blocks map cleanly to microservices concerns: service invocation handles synchronous calls, pub/sub handles async events, state management isolates data per service, and resiliency policies protect against cascading failures. Designing with these abstractions makes services portable across cloud providers and infrastructure changes. The result is a consistent, observable architecture where cross-cutting concerns are handled at the platform layer rather than inside each service.
