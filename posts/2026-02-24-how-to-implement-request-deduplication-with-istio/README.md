# How to Implement Request Deduplication with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Idempotency, Service Mesh, Envoy, Distributed Systems

Description: Practical approaches to handling duplicate requests in Istio service meshes using idempotency keys, caching layers, and EnvoyFilter configurations.

---

Duplicate requests are a reality in distributed systems. A client retries because it did not get a response in time. A load balancer sends the same request to two backends. Istio's own retry mechanism resends a failed request. A user double-clicks a button. Whatever the cause, your services need to handle duplicates gracefully, or you end up with double charges, duplicate orders, or corrupted data.

Istio does not have a built-in deduplication feature. There is no "deduplicate: true" field in VirtualService. But Istio does give you the building blocks to implement deduplication at the mesh level through header management, routing, and EnvoyFilter. Combined with application-level idempotency, you can build a solid defense against duplicate requests.

## The Idempotency Key Approach

The most reliable deduplication strategy is idempotency keys. The client generates a unique identifier for each logical request and includes it as a header. If the same key arrives twice, the second request returns the cached response from the first.

First, make sure the idempotency key header flows through the mesh. Use VirtualService header configuration to preserve it:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-service
  namespace: production
spec:
  hosts:
  - order-service
  http:
  - route:
    - destination:
        host: order-service
    headers:
      request:
        set:
          x-request-id-preserved: "%REQ(x-idempotency-key)%"
```

## Adding Idempotency Keys at the Gateway

If clients do not always send idempotency keys, generate them at the edge. Use an EnvoyFilter on the ingress gateway to add a key based on request characteristics:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: add-idempotency-key
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: GATEWAY
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
            subFilter:
              name: envoy.filters.http.router
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.lua
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
          inline_code: |
            function envoy_on_request(request_handle)
              local key = request_handle:headers():get("x-idempotency-key")
              if key == nil or key == "" then
                local method = request_handle:headers():get(":method")
                local path = request_handle:headers():get(":path")
                local request_id = request_handle:headers():get("x-request-id")
                if request_id then
                  request_handle:headers():add("x-idempotency-key", request_id)
                end
              end
            end
```

This Lua filter checks if an `x-idempotency-key` header exists. If not, it uses the `x-request-id` that Envoy generates. This is a basic fallback - for truly reliable deduplication, clients should generate their own keys.

## Application-Level Deduplication Service

The most robust deduplication happens at the application layer with a dedicated deduplication service or cache. Here is a pattern using Redis:

```python
import redis
import json
import hashlib
from flask import Flask, request, jsonify

app = Flask(__name__)
redis_client = redis.Redis(host='redis', port=6379, db=0)

DEDUP_TTL = 3600  # 1 hour

@app.route('/api/orders', methods=['POST'])
def create_order():
    idempotency_key = request.headers.get('x-idempotency-key')

    if not idempotency_key:
        return jsonify({"error": "x-idempotency-key header required"}), 400

    # Check if we already processed this key
    cache_key = f"dedup:{idempotency_key}"
    cached_response = redis_client.get(cache_key)

    if cached_response:
        # Return the cached response
        cached = json.loads(cached_response)
        return jsonify(cached['body']), cached['status']

    # Process the order
    try:
        order = process_order(request.json)
        response_body = {"order_id": order.id, "status": "created"}
        status_code = 201

        # Cache the response
        redis_client.setex(
            cache_key,
            DEDUP_TTL,
            json.dumps({"body": response_body, "status": status_code})
        )

        return jsonify(response_body), status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500
```

## Deploying the Redis Cache in the Mesh

Make sure your Redis instance is part of the mesh and accessible:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-dedup
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis-dedup
  template:
    metadata:
      labels:
        app: redis-dedup
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
---
apiVersion: v1
kind: Service
metadata:
  name: redis-dedup
  namespace: production
spec:
  selector:
    app: redis-dedup
  ports:
  - port: 6379
    targetPort: 6379
```

## Preventing Retries on Non-Idempotent Endpoints

One of the easiest ways to reduce duplicates is to prevent Istio from retrying requests that should not be retried. Disable retries for mutation endpoints:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-service
  namespace: production
spec:
  hosts:
  - order-service
  http:
  # POST endpoints - no retries
  - match:
    - method:
        exact: POST
    route:
    - destination:
        host: order-service
    retries:
      attempts: 0
    timeout: 10s
  # GET endpoints - retries are safe
  - match:
    - method:
        exact: GET
    route:
    - destination:
        host: order-service
    retries:
      attempts: 3
      perTryTimeout: 2s
      retryOn: 5xx,reset,connect-failure
  # Everything else - conservative retries
  - route:
    - destination:
        host: order-service
    retries:
      attempts: 1
      perTryTimeout: 5s
```

GET requests are safe to retry because they do not modify state. POST requests get zero retries because they might cause duplicates.

## Deduplication Through Content Hashing

For cases where you cannot use idempotency keys (legacy clients, third-party integrations), you can deduplicate based on request content. Hash the request body and use that as the deduplication key:

```python
def generate_dedup_key(request):
    """Generate a dedup key from request content."""
    content = json.dumps({
        'method': request.method,
        'path': request.path,
        'body': request.get_json(silent=True),
        'user': request.headers.get('x-user-id', 'anonymous'),
    }, sort_keys=True)

    return hashlib.sha256(content.encode()).hexdigest()
```

The downside: two legitimately different requests with the same body will be deduplicated. Use a short TTL (a few seconds) to minimize this risk.

## Handling Duplicate Detection at the Gateway Level

You can implement a lightweight duplicate check at the Istio ingress gateway using an external authorization service. This intercepts requests before they reach your services:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: dedup-check
  namespace: production
spec:
  selector:
    matchLabels:
      app: order-service
  action: CUSTOM
  provider:
    name: dedup-service
  rules:
  - to:
    - operation:
        methods: ["POST", "PUT", "PATCH"]
```

The `dedup-service` is an external authorization provider configured in the mesh config. It checks the idempotency key against a cache and returns allow or deny. This moves deduplication to the infrastructure layer, so your services do not need to implement it individually.

Configure the external authorization provider in the Istio mesh config:

```yaml
extensionProviders:
- name: dedup-service
  envoyExtAuthz:
    service: dedup-service.production.svc.cluster.local
    port: 8080
    includeRequestHeadersInCheck:
    - x-idempotency-key
    - x-request-id
```

## Testing Deduplication

Write a simple test that sends the same request twice with the same idempotency key and verifies the second response is identical to the first without creating a duplicate resource:

```bash
# First request
curl -X POST http://api.example.com/api/orders \
  -H "Content-Type: application/json" \
  -H "x-idempotency-key: test-123" \
  -d '{"item": "widget", "quantity": 1}' \
  -w "\nHTTP Status: %{http_code}\n"

# Same request again
curl -X POST http://api.example.com/api/orders \
  -H "Content-Type: application/json" \
  -H "x-idempotency-key: test-123" \
  -d '{"item": "widget", "quantity": 1}' \
  -w "\nHTTP Status: %{http_code}\n"
```

Both should return the same order ID and status code.

## Summary

Request deduplication in Istio requires a layered approach. At the gateway, ensure idempotency keys are generated and propagated. In VirtualService configuration, disable retries for non-idempotent operations. At the application level, implement idempotency key checking with a cache like Redis. For maximum coverage, consider an external authorization service that deduplicates at the mesh level. The idempotency key pattern is the most reliable approach - have clients generate a unique key per logical operation and check it at every write endpoint.
