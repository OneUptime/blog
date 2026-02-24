# How to Classify Metrics Based on Request or Response in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Metrics Classification, Telemetry, Observability, Prometheus

Description: Use Istio's metric classification to categorize and label metrics based on request attributes like URL paths, headers, and response codes for better analysis.

---

When you look at raw Istio metrics, you see individual URL paths, exact response codes, and other high-cardinality values. For meaningful analysis, you often need to group these into categories. Instead of tracking `/api/users/123` and `/api/users/456` separately, you want them grouped as "user API requests." Instead of distinguishing between HTTP 502 and 503, you might want them all labeled as "server errors." Istio's metric classification capabilities let you do exactly this.

## The Problem with Raw Metrics

Consider a REST API with these endpoints:

```
GET /api/users/123
GET /api/users/456
POST /api/orders/789
GET /api/products/search?q=widget
DELETE /api/users/123/sessions/abc
```

If you track each path as a separate label value, you get an explosion of time series. Each unique user ID, order ID, and search query creates a new series. Prometheus quickly runs out of memory.

What you actually want is:

```
GET /api/users/{id}        -> category: "user-read"
POST /api/orders/{id}      -> category: "order-create"
GET /api/products/search   -> category: "product-search"
DELETE /api/users/*/sessions/* -> category: "session-delete"
```

## Classifying by Request Path

Using the Telemetry API, you can add a custom label that maps URL paths to categories. The trick is using conditional expressions:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: request-classification
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-service
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
            mode: SERVER
          tagOverrides:
            request_operation:
              operation: UPSERT
              value: >-
                request.url_path.startsWith('/api/users') ? 'user-api' :
                request.url_path.startsWith('/api/orders') ? 'order-api' :
                request.url_path.startsWith('/api/products') ? 'product-api' :
                'other'
```

Now instead of thousands of unique path values, you have four categories. Query them cleanly:

```promql
sum(rate(istio_requests_total{
  destination_workload="api-service",
  request_operation="user-api"
}[5m]))
```

## Classifying by HTTP Method and Path

Combine method and path for more specific categories:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: operation-classification
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-service
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
            mode: SERVER
          tagOverrides:
            api_operation:
              operation: UPSERT
              value: >-
                (request.method == 'GET' && request.url_path.startsWith('/api/users')) ? 'list-users' :
                (request.method == 'POST' && request.url_path.startsWith('/api/users')) ? 'create-user' :
                (request.method == 'DELETE' && request.url_path.startsWith('/api/users')) ? 'delete-user' :
                (request.method == 'GET' && request.url_path.startsWith('/api/orders')) ? 'list-orders' :
                (request.method == 'POST' && request.url_path.startsWith('/api/orders')) ? 'create-order' :
                'other'
        - match:
            metric: REQUEST_DURATION
            mode: SERVER
          tagOverrides:
            api_operation:
              operation: UPSERT
              value: >-
                (request.method == 'GET' && request.url_path.startsWith('/api/users')) ? 'list-users' :
                (request.method == 'POST' && request.url_path.startsWith('/api/users')) ? 'create-user' :
                (request.method == 'DELETE' && request.url_path.startsWith('/api/users')) ? 'delete-user' :
                (request.method == 'GET' && request.url_path.startsWith('/api/orders')) ? 'list-orders' :
                (request.method == 'POST' && request.url_path.startsWith('/api/orders')) ? 'create-order' :
                'other'
```

This gives you per-operation latency tracking:

```promql
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{
    destination_workload="api-service",
    api_operation="create-order"
  }[5m])) by (le)
)
```

## Classifying by Response Code

Group response codes into meaningful categories instead of tracking each one individually:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: response-classification
  namespace: production
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
            mode: SERVER
          tagOverrides:
            response_class:
              operation: UPSERT
              value: >-
                response.code >= 500 ? 'server-error' :
                response.code >= 400 ? 'client-error' :
                response.code >= 300 ? 'redirect' :
                response.code >= 200 ? 'success' :
                'informational'
```

Now you can track error categories rather than individual status codes:

```promql
sum(rate(istio_requests_total{
  response_class="server-error"
}[5m])) by (destination_workload)
```

## Classifying by Request Headers

Headers are a rich source of classification data. Common patterns include:

### By Content Type

```yaml
tagOverrides:
  content_class:
    operation: UPSERT
    value: >-
      request.headers['content-type'] == 'application/json' ? 'json' :
      request.headers['content-type'] == 'application/xml' ? 'xml' :
      request.headers['content-type'] == 'multipart/form-data' ? 'file-upload' :
      'other'
```

### By Authentication Method

```yaml
tagOverrides:
  auth_method:
    operation: UPSERT
    value: >-
      request.headers['authorization'].startsWith('Bearer') ? 'jwt' :
      request.headers['authorization'].startsWith('Basic') ? 'basic' :
      request.headers['x-api-key'] != '' ? 'api-key' :
      'unauthenticated'
```

### By Client Type

```yaml
tagOverrides:
  client_type:
    operation: UPSERT
    value: >-
      request.headers['x-client-type'] == 'mobile-ios' ? 'ios' :
      request.headers['x-client-type'] == 'mobile-android' ? 'android' :
      request.headers['x-client-type'] == 'web' ? 'web' :
      'unknown'
```

## Classifying gRPC Methods

For gRPC services, classify by service method:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: grpc-classification
  namespace: production
spec:
  selector:
    matchLabels:
      app: grpc-service
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
            mode: SERVER
          tagOverrides:
            grpc_service:
              operation: UPSERT
              value: >-
                request.url_path.startsWith('/user.UserService') ? 'user-service' :
                request.url_path.startsWith('/order.OrderService') ? 'order-service' :
                request.url_path.startsWith('/payment.PaymentService') ? 'payment-service' :
                'other'
```

## Combining Classifications

You can apply multiple classification labels simultaneously:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: multi-classification
  namespace: production
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
            mode: SERVER
          tagOverrides:
            api_category:
              operation: UPSERT
              value: >-
                request.url_path.startsWith('/api/v1') ? 'v1' :
                request.url_path.startsWith('/api/v2') ? 'v2' :
                'legacy'
            priority:
              operation: UPSERT
              value: >-
                request.headers['x-priority'] == 'high' ? 'high' :
                request.headers['x-priority'] == 'low' ? 'low' :
                'normal'
```

This gives you a two-dimensional view:

```promql
# V2 API high-priority request rate
sum(rate(istio_requests_total{
  api_category="v2",
  priority="high"
}[5m])) by (destination_workload)
```

## Response-Based Classification

Sometimes you need to classify based on what the service returned, not just the status code:

```yaml
tagOverrides:
  cache_hit:
    operation: UPSERT
    value: >-
      response.headers['x-cache'] == 'HIT' ? 'hit' :
      response.headers['x-cache'] == 'MISS' ? 'miss' :
      'none'
  rate_limited:
    operation: UPSERT
    value: >-
      response.code == 429 ? 'true' : 'false'
```

Track cache hit rates across your mesh:

```promql
sum(rate(istio_requests_total{cache_hit="hit"}[5m])) by (destination_workload)
/
sum(rate(istio_requests_total{cache_hit=~"hit|miss"}[5m])) by (destination_workload)
```

## Best Practices for Classification

**Keep categories bounded.** Every unique combination of label values creates a new time series. If you add a label with 10 values and another with 5 values, that's 50x more series than before.

**Use a default/catch-all category.** Always include an "other" or "unknown" category in your classification expressions. Otherwise, requests that don't match any pattern get an empty string label, which can cause confusion.

**Apply the same classification to related metrics.** If you classify `REQUEST_COUNT` by operation, also classify `REQUEST_DURATION` the same way so you can correlate volume with latency.

**Test expressions before deploying.** Check your attribute expressions against actual traffic:

```bash
# See what path values are coming through
kubectl exec <pod> -c istio-proxy -- curl -s localhost:15020/stats/prometheus | \
  grep istio_requests_total | head -10
```

**Document your classifications.** Keep a record of what each category means and which paths/headers map to it. Future you will thank present you.

Metric classification transforms raw, high-cardinality data into meaningful categories that are actually useful for monitoring and alerting. It's one of those features that doesn't seem important until you try to build a dashboard without it and end up with unusable charts full of noise.
