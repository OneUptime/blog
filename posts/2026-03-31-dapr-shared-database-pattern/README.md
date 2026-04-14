# How to Implement Shared Database Pattern with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Database, Microservice Pattern, State Store, Architecture

Description: Implement a shared database pattern with Dapr where multiple services read from a common state store while maintaining service autonomy through key namespacing.

---

While database-per-service is the ideal microservices pattern, real-world systems often require multiple services to access shared data. Dapr supports a controlled shared database pattern using component scopes, key namespacing, and convention-based write ownership to enable shared reads while protecting data integrity. This guide shows how to implement this safely.

## When to Use the Shared State Store Pattern

The shared state store pattern is appropriate when:
- Read performance is critical and cross-service calls add too much latency
- Multiple services need real-time access to a common reference dataset (product catalog, config)
- You are migrating from a monolith where full service isolation is not yet feasible

## Setting Up a Shared State Store

Create a Component accessible by multiple services, with careful scope management:

```yaml
# components/shared-catalog-store.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: shared-catalog-store
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: redis-shared:6379
    - name: redisDB
      value: "1"
scopes:
  - catalog-service    # Write owner
  - order-service      # Read consumer
  - recommendation-service  # Read consumer
  - search-service     # Read consumer
```

## Key Namespacing for Multi-Service Access

Use consistent key prefixes to avoid collisions:

```python
# catalog_service/state.py (write owner)
STATE_STORE = "shared-catalog-store"
KEY_PREFIX = "catalog"

def save_product(product: dict):
    with DaprClient() as client:
        # Only catalog-service writes to "catalog:" keys
        client.save_state(
            store_name=STATE_STORE,
            key=f"{KEY_PREFIX}:product:{product['id']}",
            value=json.dumps(product)
        )

def publish_catalog_update(product: dict):
    with DaprClient() as client:
        # Notify consumers via pub/sub
        client.publish_event("pubsub", "catalog-updated", json.dumps(product))
```

```python
# order_service/catalog_reader.py (read consumer)
STATE_STORE = "shared-catalog-store"

def get_product(product_id: str) -> dict:
    with DaprClient() as client:
        result = client.get_state(
            store_name=STATE_STORE,
            key=f"catalog:product:{product_id}"  # Read from catalog namespace
        )
        if result.data:
            return json.loads(result.data)
    # Fallback to service invocation if not in shared store
    return invoke_catalog_service(product_id)
```

## Enforcing Write Ownership

Use Dapr's ETag-based optimistic concurrency to make writes safe and ownership clear:

```python
# catalog_service/catalog_writer.py
def update_product_with_version(product: dict):
    with DaprClient() as client:
        # Use ETags for optimistic concurrency - only the write owner does this
        current = client.get_state(
            store_name=STATE_STORE,
            key=f"catalog:product:{product['id']}"
        )
        etag = current.etag

        client.save_state(
            store_name=STATE_STORE,
            key=f"catalog:product:{product['id']}",
            value=json.dumps(product),
            etag=etag,  # Optimistic lock
            options=StateOptions(
                concurrency=Concurrency.first_write,
                consistency=Consistency.strong
            )
        )
```

## Cache-Aside Pattern for Readers

Readers should treat the shared store as a cache and fall back gracefully:

```go
// order_service/product_lookup.go
func getProductWithFallback(ctx context.Context, daprClient dapr.Client, productId string) (*Product, error) {
    // Try shared state store first (fast path)
    result, err := daprClient.GetState(ctx, "shared-catalog-store",
        "catalog:product:"+productId, nil)
    if err == nil && result.Value != nil {
        var product Product
        json.Unmarshal(result.Value, &product)
        return &product, nil
    }

    // Fallback to service invocation (slow path)
    resp, err := daprClient.InvokeMethod(ctx, "catalog-service",
        "products/"+productId, "GET")
    if err != nil {
        return nil, err
    }
    var product Product
    json.Unmarshal(resp, &product)
    return &product, nil
}
```

## Monitoring Shared Store Access

Track which services are reading from the shared store:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dapr-shared-store-alerts
  namespace: monitoring
spec:
  groups:
    - name: dapr.shared.store
      rules:
        - alert: SharedStoreUnauthorizedWrite
          expr: |
            rate(dapr_component_state_count{component="shared-catalog-store", operation="set", app_id!="catalog-service"}[5m]) > 0
          labels:
            severity: critical
          annotations:
            summary: "Unauthorized write to shared catalog store"
            description: "App {{ $labels.app_id }} is writing to the shared catalog store - only catalog-service should write."
```

## Summary

The shared database pattern with Dapr uses component scopes, key namespacing, and pub/sub notifications to let multiple services read common data while enforcing single-service write ownership. Monitoring for unauthorized writes and implementing cache-aside fallbacks prevents read consumers from corrupting shared state.
