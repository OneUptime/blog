# How to Build Linkerd ServiceProfile

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Linkerd, Service Mesh, Kubernetes, Observability

Description: Configure Linkerd ServiceProfiles for route-based metrics, retries, and timeouts with per-route traffic policies.

---

## Introduction

Linkerd provides fine-grained traffic management through ServiceProfiles. A ServiceProfile is a custom Kubernetes resource that defines routes for a service, enabling per-route metrics, retries, timeouts, and request classification. Without ServiceProfiles, Linkerd treats all requests to a service the same way. With them, you gain visibility and control at the individual endpoint level.

This guide walks through creating ServiceProfiles from scratch, configuring advanced traffic policies, and generating profiles automatically from OpenAPI specifications.

## Prerequisites

Before starting, ensure you have:

- A Kubernetes cluster (v1.21 or later)
- Linkerd installed and running (v2.14 or later)
- kubectl configured to communicate with your cluster
- A sample application deployed and meshed with Linkerd

Verify your Linkerd installation:

```bash
# Check Linkerd control plane status
linkerd check

# Verify the viz extension is installed (required for per-route metrics)
linkerd viz check
```

## Understanding the ServiceProfile Resource

A ServiceProfile is a namespaced resource that maps to a Kubernetes Service. It defines routes based on HTTP method and path patterns, along with policies for each route.

Here is the basic structure of a ServiceProfile:

```yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: my-service.my-namespace.svc.cluster.local
  namespace: my-namespace
spec:
  routes:
    - name: GET /api/users
      condition:
        method: GET
        pathRegex: /api/users
      responseClasses:
        - condition:
            status:
              min: 200
              max: 299
          isFailure: false
      isRetryable: true
      timeout: 5s
```

### ServiceProfile Naming Convention

The ServiceProfile name must match the fully qualified domain name (FQDN) of the service:

| Component | Example | Description |
|-----------|---------|-------------|
| Service Name | my-service | The name of the Kubernetes Service |
| Namespace | my-namespace | The namespace where the service lives |
| Suffix | svc.cluster.local | Standard Kubernetes service DNS suffix |
| Full FQDN | my-service.my-namespace.svc.cluster.local | Complete name for the ServiceProfile |

## Creating Your First ServiceProfile

Let's create a ServiceProfile for a sample REST API service. This example assumes you have a user service with standard CRUD endpoints.

First, deploy a sample application if you don't have one:

```yaml
# sample-app.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: demo
  annotations:
    linkerd.io/inject: enabled
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: demo
spec:
  replicas: 2
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
        - name: user-service
          image: example/user-service:v1
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
---
apiVersion: v1
kind: Service
metadata:
  name: user-service
  namespace: demo
spec:
  selector:
    app: user-service
  ports:
    - port: 80
      targetPort: 8080
```

Apply the sample application:

```bash
kubectl apply -f sample-app.yaml
```

Now create a ServiceProfile for the user service:

```yaml
# user-service-profile.yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  # The name MUST match the service FQDN
  name: user-service.demo.svc.cluster.local
  namespace: demo
spec:
  routes:
    # Route for listing all users
    - name: GET /api/users
      condition:
        method: GET
        pathRegex: /api/users
      isRetryable: true
      timeout: 10s

    # Route for getting a specific user by ID
    # The regex captures any user ID in the path
    - name: GET /api/users/{id}
      condition:
        method: GET
        pathRegex: /api/users/[^/]+
      isRetryable: true
      timeout: 5s

    # Route for creating a new user
    # POST requests are not retryable by default to avoid duplicates
    - name: POST /api/users
      condition:
        method: POST
        pathRegex: /api/users
      isRetryable: false
      timeout: 15s

    # Route for updating a user
    # PUT is idempotent, so retries are safe
    - name: PUT /api/users/{id}
      condition:
        method: PUT
        pathRegex: /api/users/[^/]+
      isRetryable: true
      timeout: 10s

    # Route for deleting a user
    # DELETE is idempotent, so retries are safe
    - name: DELETE /api/users/{id}
      condition:
        method: DELETE
        pathRegex: /api/users/[^/]+
      isRetryable: true
      timeout: 5s
```

Apply the ServiceProfile:

```bash
kubectl apply -f user-service-profile.yaml
```

Verify the ServiceProfile was created:

```bash
kubectl get serviceprofiles -n demo
```

## Route Conditions and Path Matching

Route conditions determine which requests match a route. Linkerd evaluates conditions using HTTP method and path regex patterns.

### Path Regex Patterns

The `pathRegex` field accepts Go regular expressions. Here are common patterns:

| Pattern | Description | Example Matches |
|---------|-------------|-----------------|
| `/api/users` | Exact match | /api/users |
| `/api/users/[^/]+` | Single path segment | /api/users/123, /api/users/abc |
| `/api/users/[^/]+/orders` | Nested resource | /api/users/123/orders |
| `/api/users/[^/]+/orders/[^/]+` | Deeply nested | /api/users/123/orders/456 |
| `/api/v[0-9]+/users` | Version prefix | /api/v1/users, /api/v2/users |
| `/health.*` | Prefix match | /health, /healthz, /health/ready |

### Complex Route Conditions

You can combine multiple conditions for more precise matching:

```yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: api-gateway.demo.svc.cluster.local
  namespace: demo
spec:
  routes:
    # Match versioned API endpoints
    - name: GET /api/v1/products
      condition:
        method: GET
        pathRegex: /api/v1/products

    # Match any version of the products endpoint
    - name: GET /api/v{version}/products
      condition:
        method: GET
        pathRegex: /api/v[0-9]+/products

    # Match query endpoints with search parameters
    # Note: Linkerd matches on path only, query strings are ignored
    - name: GET /api/search
      condition:
        method: GET
        pathRegex: /api/search

    # Match all HEAD requests to any path
    - name: HEAD requests
      condition:
        method: HEAD
        pathRegex: /.*
```

### Route Matching Priority

Linkerd evaluates routes in the order they appear in the ServiceProfile. The first matching route wins. Place more specific routes before general ones:

```yaml
spec:
  routes:
    # Specific route first - matches /api/users/me exactly
    - name: GET /api/users/me
      condition:
        method: GET
        pathRegex: /api/users/me
      timeout: 2s

    # General route second - matches /api/users/{any-id}
    - name: GET /api/users/{id}
      condition:
        method: GET
        pathRegex: /api/users/[^/]+
      timeout: 5s
```

## Configuring Retries

Retries help your application handle transient failures. Linkerd automatically retries requests when:

1. The route is marked as `isRetryable: true`
2. The request failed due to a connection error or specific HTTP status codes
3. The retry budget has not been exhausted

### Retry Configuration

```yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: payment-service.demo.svc.cluster.local
  namespace: demo
spec:
  # Retry budget controls the maximum percentage of retries
  # relative to the total request volume
  retryBudget:
    # Allow retries up to 20% of total requests
    retryRatio: 0.2
    # Minimum retries per second (useful for low-traffic services)
    minRetriesPerSecond: 10
    # Time window for calculating retry budget
    ttl: 10s

  routes:
    # GET requests are safe to retry
    - name: GET /api/payments/{id}
      condition:
        method: GET
        pathRegex: /api/payments/[^/]+
      isRetryable: true
      timeout: 5s

    # POST creates new resources - do not retry to avoid duplicates
    - name: POST /api/payments
      condition:
        method: POST
        pathRegex: /api/payments
      isRetryable: false
      timeout: 30s

    # Payment confirmation is idempotent (uses idempotency key)
    - name: POST /api/payments/{id}/confirm
      condition:
        method: POST
        pathRegex: /api/payments/[^/]+/confirm
      isRetryable: true
      timeout: 15s
```

### Retry Budget Explained

The retry budget prevents retry storms during widespread failures:

| Parameter | Default | Description |
|-----------|---------|-------------|
| retryRatio | 0.2 | Maximum additional load from retries (20% means max 120 requests for 100 original requests) |
| minRetriesPerSecond | 10 | Minimum retries allowed regardless of ratio |
| ttl | 10s | Time window for tracking request counts |

### Which Requests Get Retried

Linkerd retries requests that:

- Have `isRetryable: true` on their route
- Failed due to connection errors (connection refused, reset, timeout)
- Received a 5xx response (when using response classes)
- Have not exhausted the retry budget

Requests are NOT retried when:

- The route has `isRetryable: false`
- The request body was already streamed (non-bufferable)
- The retry budget is exhausted
- The response was a client error (4xx)

## Setting Timeouts

Timeouts prevent slow requests from consuming resources indefinitely. Set timeouts at the route level based on expected response times.

```yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: search-service.demo.svc.cluster.local
  namespace: demo
spec:
  routes:
    # Simple search - should return quickly
    - name: GET /api/search/quick
      condition:
        method: GET
        pathRegex: /api/search/quick
      timeout: 2s

    # Full text search - needs more time
    - name: GET /api/search/full
      condition:
        method: GET
        pathRegex: /api/search/full
      timeout: 30s

    # Autocomplete - must be fast for good UX
    - name: GET /api/search/autocomplete
      condition:
        method: GET
        pathRegex: /api/search/autocomplete
      timeout: 500ms

    # Bulk search - processing many items
    - name: POST /api/search/bulk
      condition:
        method: POST
        pathRegex: /api/search/bulk
      timeout: 60s

    # Health check - very fast
    - name: GET /health
      condition:
        method: GET
        pathRegex: /health
      timeout: 1s
```

### Timeout Behavior

When a timeout occurs:

1. Linkerd cancels the request to the upstream service
2. Returns a 504 Gateway Timeout to the client
3. Records the timeout in metrics

Timeouts interact with retries:

- Each retry attempt has its own timeout
- Total request time can exceed the timeout if retries occur
- Set timeouts considering the combined effect with retries

## Request Classification with Response Classes

Response classes let you define what constitutes success or failure for metrics purposes. This is useful when:

- Certain 4xx responses are expected (not failures)
- Some 5xx responses should not trigger alerts
- You want custom success rate calculations

### Configuring Response Classes

```yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: inventory-service.demo.svc.cluster.local
  namespace: demo
spec:
  routes:
    # Check if item exists - 404 is expected, not a failure
    - name: GET /api/inventory/{id}
      condition:
        method: GET
        pathRegex: /api/inventory/[^/]+
      responseClasses:
        # 2xx responses are successful
        - condition:
            status:
              min: 200
              max: 299
          isFailure: false
        # 404 Not Found is expected when checking inventory
        - condition:
            status:
              min: 404
              max: 404
          isFailure: false
        # Other 4xx are client errors - still not service failures
        - condition:
            status:
              min: 400
              max: 499
          isFailure: false
        # 5xx are actual failures
        - condition:
            status:
              min: 500
              max: 599
          isFailure: true
      isRetryable: true
      timeout: 5s

    # Reserve inventory - any non-2xx is a failure
    - name: POST /api/inventory/{id}/reserve
      condition:
        method: POST
        pathRegex: /api/inventory/[^/]+/reserve
      responseClasses:
        - condition:
            status:
              min: 200
              max: 299
          isFailure: false
        - condition:
            status:
              min: 300
              max: 599
          isFailure: true
      isRetryable: false
      timeout: 10s
```

### Response Class Matching

Response classes are evaluated in order. The first match determines the classification:

```yaml
responseClasses:
  # Check specific status codes first
  - condition:
      status:
        min: 429
        max: 429
    isFailure: false  # Rate limiting is not a service failure

  # Then check ranges
  - condition:
      status:
        min: 400
        max: 499
    isFailure: false  # Client errors

  - condition:
      status:
        min: 500
        max: 599
    isFailure: true   # Server errors
```

## Generating ServiceProfiles from OpenAPI

If your service has an OpenAPI (Swagger) specification, Linkerd can generate a ServiceProfile automatically. This saves time and ensures accuracy.

### Using linkerd profile Command

Generate a ServiceProfile from an OpenAPI spec file:

```bash
# Generate from a local OpenAPI file
linkerd profile --open-api openapi.yaml user-service -n demo > user-service-profile.yaml

# Generate from a URL
linkerd profile --open-api https://api.example.com/openapi.json user-service -n demo > user-service-profile.yaml
```

### Example OpenAPI Specification

Here is a sample OpenAPI spec for reference:

```yaml
# openapi.yaml
openapi: 3.0.0
info:
  title: User Service API
  version: 1.0.0
paths:
  /api/users:
    get:
      summary: List all users
      operationId: listUsers
      responses:
        '200':
          description: Success
    post:
      summary: Create a user
      operationId: createUser
      responses:
        '201':
          description: Created
        '400':
          description: Invalid input

  /api/users/{id}:
    get:
      summary: Get user by ID
      operationId: getUser
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Success
        '404':
          description: Not found
    put:
      summary: Update user
      operationId: updateUser
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Success
    delete:
      summary: Delete user
      operationId: deleteUser
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '204':
          description: Deleted
```

### Generated ServiceProfile

Running `linkerd profile --open-api openapi.yaml user-service -n demo` produces:

```yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: user-service.demo.svc.cluster.local
  namespace: demo
spec:
  routes:
    - name: DELETE /api/users/{id}
      condition:
        method: DELETE
        pathRegex: /api/users/[^/]+
    - name: GET /api/users
      condition:
        method: GET
        pathRegex: /api/users
    - name: GET /api/users/{id}
      condition:
        method: GET
        pathRegex: /api/users/[^/]+
    - name: POST /api/users
      condition:
        method: POST
        pathRegex: /api/users
    - name: PUT /api/users/{id}
      condition:
        method: PUT
        pathRegex: /api/users/[^/]+
```

After generating, add timeouts, retries, and response classes as needed:

```bash
# Generate base profile
linkerd profile --open-api openapi.yaml user-service -n demo > user-service-profile.yaml

# Edit to add timeouts and retries
kubectl apply -f user-service-profile.yaml
```

### Generating from Protobuf

For gRPC services, generate from Protobuf definitions:

```bash
# Generate from proto file
linkerd profile --proto user.proto user-service -n demo > user-service-profile.yaml
```

Example proto file:

```protobuf
// user.proto
syntax = "proto3";

package user;

service UserService {
  rpc GetUser(GetUserRequest) returns (User);
  rpc ListUsers(ListUsersRequest) returns (ListUsersResponse);
  rpc CreateUser(CreateUserRequest) returns (User);
  rpc UpdateUser(UpdateUserRequest) returns (User);
  rpc DeleteUser(DeleteUserRequest) returns (Empty);
}
```

## Viewing Per-Route Metrics

Once ServiceProfiles are configured, Linkerd collects per-route metrics. Access them through the CLI or dashboard.

### Using linkerd viz Command

View per-route statistics:

```bash
# View routes for a specific service
linkerd viz routes deploy/user-service -n demo

# Sample output:
# ROUTE                       SERVICE          SUCCESS   RPS   LATENCY_P50   LATENCY_P95   LATENCY_P99
# GET /api/users              user-service     100.00%   5.2   12ms          45ms          89ms
# GET /api/users/{id}         user-service     99.85%    23.1  8ms           32ms          67ms
# POST /api/users             user-service     98.50%    2.1   45ms          120ms         250ms
# PUT /api/users/{id}         user-service     99.20%    1.8   38ms          95ms          180ms
# DELETE /api/users/{id}      user-service     100.00%   0.5   15ms          42ms          78ms
# [DEFAULT]                   user-service     95.00%    0.3   25ms          80ms          150ms
```

### Key Metrics Per Route

| Metric | Description |
|--------|-------------|
| SUCCESS | Percentage of successful requests (based on response classes) |
| RPS | Requests per second |
| LATENCY_P50 | 50th percentile latency (median) |
| LATENCY_P95 | 95th percentile latency |
| LATENCY_P99 | 99th percentile latency |

### Viewing Metrics in Grafana

Linkerd's Grafana dashboards show per-route metrics. Access them via:

```bash
# Open the Linkerd dashboard
linkerd viz dashboard

# Navigate to: Namespaces > demo > Deployments > user-service > Routes
```

### Prometheus Queries

Query per-route metrics directly in Prometheus:

```promql
# Success rate by route
sum(rate(route_response_total{direction="outbound",dst_service="user-service",classification="success"}[5m])) by (route)
/
sum(rate(route_response_total{direction="outbound",dst_service="user-service"}[5m])) by (route)

# Latency P99 by route
histogram_quantile(0.99, sum(rate(route_response_latency_ms_bucket{direction="outbound",dst_service="user-service"}[5m])) by (le, route))

# Request rate by route
sum(rate(route_request_total{direction="outbound",dst_service="user-service"}[5m])) by (route)

# Retry rate by route
sum(rate(route_retry_total{direction="outbound",dst_service="user-service"}[5m])) by (route)
/
sum(rate(route_request_total{direction="outbound",dst_service="user-service"}[5m])) by (route)
```

## Complete Example: E-Commerce ServiceProfiles

Here is a complete example for an e-commerce application with multiple services:

### Product Service Profile

```yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: product-service.ecommerce.svc.cluster.local
  namespace: ecommerce
spec:
  retryBudget:
    retryRatio: 0.2
    minRetriesPerSecond: 10
    ttl: 10s

  routes:
    # Product catalog - cacheable, fast
    - name: GET /api/products
      condition:
        method: GET
        pathRegex: /api/products
      isRetryable: true
      timeout: 5s
      responseClasses:
        - condition:
            status:
              min: 200
              max: 299
          isFailure: false
        - condition:
            status:
              min: 500
              max: 599
          isFailure: true

    # Single product details
    - name: GET /api/products/{id}
      condition:
        method: GET
        pathRegex: /api/products/[^/]+
      isRetryable: true
      timeout: 3s

    # Product search
    - name: GET /api/products/search
      condition:
        method: GET
        pathRegex: /api/products/search
      isRetryable: true
      timeout: 10s

    # Admin: Create product
    - name: POST /api/products
      condition:
        method: POST
        pathRegex: /api/products
      isRetryable: false
      timeout: 15s

    # Admin: Update product
    - name: PUT /api/products/{id}
      condition:
        method: PUT
        pathRegex: /api/products/[^/]+
      isRetryable: true
      timeout: 10s
```

### Order Service Profile

```yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: order-service.ecommerce.svc.cluster.local
  namespace: ecommerce
spec:
  retryBudget:
    retryRatio: 0.1  # Lower retry ratio for order service
    minRetriesPerSecond: 5
    ttl: 10s

  routes:
    # List orders for user
    - name: GET /api/orders
      condition:
        method: GET
        pathRegex: /api/orders
      isRetryable: true
      timeout: 10s

    # Get specific order
    - name: GET /api/orders/{id}
      condition:
        method: GET
        pathRegex: /api/orders/[^/]+
      isRetryable: true
      timeout: 5s
      responseClasses:
        - condition:
            status:
              min: 200
              max: 299
          isFailure: false
        - condition:
            status:
              min: 404
              max: 404
          isFailure: false  # Order not found is expected

    # Create new order - NOT retryable
    - name: POST /api/orders
      condition:
        method: POST
        pathRegex: /api/orders
      isRetryable: false
      timeout: 30s

    # Cancel order - idempotent
    - name: POST /api/orders/{id}/cancel
      condition:
        method: POST
        pathRegex: /api/orders/[^/]+/cancel
      isRetryable: true
      timeout: 15s

    # Order status webhook
    - name: POST /api/orders/{id}/status
      condition:
        method: POST
        pathRegex: /api/orders/[^/]+/status
      isRetryable: true
      timeout: 5s
```

### Payment Service Profile

```yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: payment-service.ecommerce.svc.cluster.local
  namespace: ecommerce
spec:
  retryBudget:
    retryRatio: 0.05  # Very conservative for payments
    minRetriesPerSecond: 2
    ttl: 10s

  routes:
    # Process payment - NEVER retry
    - name: POST /api/payments
      condition:
        method: POST
        pathRegex: /api/payments
      isRetryable: false
      timeout: 45s
      responseClasses:
        - condition:
            status:
              min: 200
              max: 299
          isFailure: false
        - condition:
            status:
              min: 402
              max: 402
          isFailure: false  # Payment required is not a service failure
        - condition:
            status:
              min: 500
              max: 599
          isFailure: true

    # Get payment status - safe to retry
    - name: GET /api/payments/{id}
      condition:
        method: GET
        pathRegex: /api/payments/[^/]+
      isRetryable: true
      timeout: 5s

    # Refund - uses idempotency key
    - name: POST /api/payments/{id}/refund
      condition:
        method: POST
        pathRegex: /api/payments/[^/]+/refund
      isRetryable: true
      timeout: 30s
```

## Troubleshooting

### ServiceProfile Not Working

Check that the ServiceProfile name matches the service FQDN exactly:

```bash
# Get the service FQDN
kubectl get svc user-service -n demo -o jsonpath='{.metadata.name}.{.metadata.namespace}.svc.cluster.local'

# Verify ServiceProfile exists with correct name
kubectl get serviceprofile -n demo
```

### Routes Not Matching

If requests are falling through to `[DEFAULT]`:

1. Check path regex syntax
2. Verify method matches exactly (case sensitive)
3. Ensure route order is correct (specific before general)

Debug with tap:

```bash
# Watch live traffic to see actual paths
linkerd viz tap deploy/user-service -n demo

# Filter for unmatched routes
linkerd viz routes deploy/user-service -n demo | grep DEFAULT
```

### Retries Not Happening

Verify retry configuration:

```bash
# Check if route is marked retryable
kubectl get serviceprofile user-service.demo.svc.cluster.local -n demo -o yaml | grep -A5 isRetryable

# Monitor retry metrics
linkerd viz routes deploy/user-service -n demo --to deploy/backend -o wide
```

### Timeout Issues

If requests timeout unexpectedly:

1. Check the timeout value is appropriate for the endpoint
2. Consider network latency and backend processing time
3. Remember that retries each have their own timeout

```bash
# View latency percentiles to set appropriate timeouts
linkerd viz routes deploy/user-service -n demo
```

## Best Practices

### 1. Start with Generated Profiles

Use OpenAPI or Protobuf generation as a starting point, then customize:

```bash
linkerd profile --open-api spec.yaml my-service -n my-ns > profile.yaml
# Edit profile.yaml to add timeouts and retries
kubectl apply -f profile.yaml
```

### 2. Set Conservative Timeouts

Start with generous timeouts and tighten based on observed latencies:

| Percentile | Recommendation |
|------------|----------------|
| P50 | Baseline - most requests complete here |
| P95 | Good timeout starting point |
| P99 | Use for critical paths only |

### 3. Be Careful with Retries

Only enable retries for idempotent operations:

| Method | Typically Retryable |
|--------|---------------------|
| GET | Yes |
| HEAD | Yes |
| OPTIONS | Yes |
| PUT | Yes (idempotent) |
| DELETE | Yes (idempotent) |
| POST | No (unless idempotent via key) |
| PATCH | Maybe (depends on implementation) |

### 4. Use Response Classes Thoughtfully

Don't mark all 4xx as success - only expected ones:

```yaml
# Good: 404 is expected for "check if exists" endpoints
responseClasses:
  - condition:
      status:
        min: 404
        max: 404
    isFailure: false

# Bad: Hiding all client errors masks real problems
responseClasses:
  - condition:
      status:
        min: 400
        max: 499
    isFailure: false  # Don't do this
```

### 5. Monitor and Iterate

Regularly review per-route metrics and adjust:

```bash
# Weekly review command
linkerd viz routes deploy/my-service -n my-ns -o wide
```

## Summary

ServiceProfiles provide granular control over traffic management in Linkerd. Key takeaways:

- ServiceProfiles enable per-route metrics, retries, and timeouts
- Name ServiceProfiles using the full service FQDN
- Use path regex patterns to match routes
- Configure retries only for idempotent operations
- Set timeouts based on observed latency percentiles
- Use response classes to customize success/failure classification
- Generate profiles from OpenAPI or Protobuf to save time
- Monitor per-route metrics and adjust configurations based on data

With properly configured ServiceProfiles, you gain visibility into individual endpoints and can implement intelligent traffic policies that improve reliability without overcomplicating your application code.
