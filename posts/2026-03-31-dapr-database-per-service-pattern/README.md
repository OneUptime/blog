# How to Implement Database per Service Pattern with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Database, Microservice Pattern, State Store, Architecture

Description: Implement the database-per-service pattern using Dapr state stores to give each microservice its own isolated data store with consistent API access.

---

The database-per-service pattern is a fundamental microservices best practice: each service owns its data store exclusively. No other service accesses it directly. Dapr makes this pattern straightforward by abstracting state stores behind a uniform API, letting you assign a different backend to each service without changing application code.

## Why Database per Service with Dapr

Without Dapr, implementing database-per-service requires each service to import different database drivers (Redis client, PostgreSQL driver, MongoDB client). With Dapr, all services use the same `GET /v1.0/state/{storeName}/{key}` API, while the backing store differs per service.

Benefits:
- Each service can choose the best storage backend
- Loose coupling - no shared database connections
- Independent scaling and schema evolution
- Consistent observability across all state stores

## Configuring Isolated State Stores Per Service

Create separate Dapr Component configurations for each service:

```yaml
# components/order-statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: order-statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: redis-orders:6379
    - name: redisDB
      value: "0"
auth:
  secretStore: kubernetes
scopes:
  - order-service  # Only accessible by order-service
```

```yaml
# components/product-statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: product-statestore
  namespace: default
spec:
  type: state.postgresql
  version: v1
  metadata:
    - name: connectionString
      secretKeyRef:
        name: postgres-secret
        key: connectionString
scopes:
  - product-service  # Only accessible by product-service
```

```yaml
# components/user-statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: user-statestore
  namespace: default
spec:
  type: state.mongodb
  version: v1
  metadata:
    - name: host
      value: mongodb-users:27017
    - name: databaseName
      value: users
scopes:
  - user-service  # Only accessible by user-service
```

## Accessing Service-Specific State in Application Code

Each service uses its own named state store:

```python
# order_service/main.py
from dapr.clients import DaprClient

STATE_STORE = "order-statestore"  # This service's dedicated store

def get_order(order_id: str):
    with DaprClient() as client:
        result = client.get_state(
            store_name=STATE_STORE,
            key=f"order-{order_id}"
        )
        return result.data

def save_order(order: dict):
    with DaprClient() as client:
        client.save_state(
            store_name=STATE_STORE,
            key=f"order-{order['id']}",
            value=json.dumps(order)
        )
```

```go
// product_service/main.go
const stateStore = "product-statestore" // This service's dedicated store

func getProduct(ctx context.Context, client dapr.Client, productId string) (*Product, error) {
    result, err := client.GetState(ctx, stateStore, "product-"+productId, nil)
    if err != nil {
        return nil, err
    }
    var product Product
    json.Unmarshal(result.Value, &product)
    return &product, nil
}
```

## Cross-Service Data Access via Service Invocation

Since services cannot access each other's state stores directly, cross-service data access goes through service invocation:

```python
# order_service - needs to get product info
def get_product_for_order(product_id: str) -> dict:
    with DaprClient() as client:
        # Invoke product-service API - never access product-statestore directly
        result = client.invoke_method(
            app_id="product-service",
            method_name=f"products/{product_id}",
            http_verb="GET",
            content_type="application/json"
        )
        return json.loads(result.data)
```

## Enforcing Isolation with Dapr Scopes

Verify scope enforcement is working:

```bash
# This should succeed - order-service accessing order-statestore
kubectl exec -it order-service-pod -c daprd -- \
  curl -s "http://localhost:3500/v1.0/state/order-statestore/test-key"

# This should fail - order-service trying to access product-statestore
kubectl exec -it order-service-pod -c daprd -- \
  curl -s "http://localhost:3500/v1.0/state/product-statestore/test-key"
# Expected: 400 Bad Request with ERR_STATE_STORE_NOT_FOUND
# (the component is not loaded for this sidecar due to scoping)
```

## Summary

The database-per-service pattern with Dapr uses Component scopes to enforce that each service can only access its designated state store. This provides true data isolation without complex application-level enforcement, while the uniform Dapr state API means switching from Redis to PostgreSQL only requires a component configuration change.
