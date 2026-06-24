# How to Configure Linkerd Service Profiles for Per-Route Retry Budgets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linkerd, Kubernetes, Service Mesh, Retries, Reliability

Description: Learn how to create Linkerd Service Profiles with per-route retry budgets to automatically retry failed requests while preventing retry storms that can overwhelm your services.

---

Automatic retries improve reliability by recovering from transient failures, but uncontrolled retries can create cascading failures. Linkerd's Service Profiles let you configure intelligent per-route retry policies with service-level retry budgets that retry failures without overwhelming downstream services. This guide shows you how to configure them effectively.

## Understanding Service Profiles in Linkerd

Service Profiles are Linkerd's way of teaching the mesh about your HTTP endpoints. They define routes, set timeouts, configure retries, and mark which requests are retryable. Without a Service Profile, Linkerd can still proxy detected HTTP traffic, but it does not have the user-defined route information needed for ServiceProfile-based per-route metrics, retries, and timeouts.

With a Service Profile, Linkerd understands your route structure and can provide per-route metrics, apply per-route timeouts, and intelligently retry requests. The retry budget prevents retry storms by limiting retries as a percentage of the original request volume for the service.

As of Linkerd 2.16, ServiceProfiles are still supported for backwards compatibility, but Gateway API types are the preferred path for new retry, timeout, and per-route metric configuration.

This is crucial for production reliability. Naive retry logic can turn a small issue into a complete outage as retries multiply through the call chain.

## Prerequisites

You need a Kubernetes cluster with Linkerd installed. Verify Linkerd is running:

```bash
linkerd version
linkerd check
```

Deploy sample applications to test Service Profiles:

```yaml
# sample-apps.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
      annotations:
        linkerd.io/inject: enabled
    spec:
      containers:
      - name: webapp
        image: your-registry/webapp:latest
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: webapp
  namespace: default
spec:
  selector:
    app: webapp
  ports:
  - port: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
      annotations:
        linkerd.io/inject: enabled
    spec:
      containers:
      - name: backend
        image: your-registry/backend:latest
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: default
spec:
  selector:
    app: backend
  ports:
  - port: 8080
```

```bash
kubectl apply -f sample-apps.yaml
```

## Creating a Basic Service Profile

Generate a Service Profile automatically by capturing live traffic:

```bash
linkerd viz profile -n default backend --tap deploy/webapp --tap-duration 60s > backend-profile.yaml
```

This watches traffic from webapp to backend for 60 seconds and generates a profile. Review the generated profile:

```bash
cat backend-profile.yaml
```

You'll see routes discovered from actual traffic patterns. Apply the profile:

```bash
kubectl apply -f backend-profile.yaml
```

## Configuring Retry Budgets

Edit the Service Profile to add retry configuration:

```yaml
# backend-profile-retries.yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: backend.default.svc.cluster.local
  namespace: default
spec:
  # Retry budget limits extra retry load for this service
  retryBudget:
    # Allow retries to add at most 20% of the original request volume
    retryRatio: 0.2
    # Allow 10 additional retries per second
    minRetriesPerSecond: 10
    # Time window for measuring retry ratio
    ttl: 10s
  routes:
  - name: GET /api/users
    condition:
      method: GET
      pathRegex: /api/users
    # Retry configuration for this route
    isRetryable: true
    timeout: 5s
  - name: POST /api/users
    condition:
      method: POST
      pathRegex: /api/users
    # Don't retry POST requests (not idempotent)
    isRetryable: false
    timeout: 10s
  - name: GET /api/products/{id}
    condition:
      method: GET
      pathRegex: /api/products/\d+
    isRetryable: true
    timeout: 3s
```

```bash
kubectl apply -f backend-profile-retries.yaml
```

The retry budget has three parameters:

- **retryRatio**: Maximum ratio of retries to original requests (0.2 = 20%)
- **minRetriesPerSecond**: Additional retry allowance per second regardless of traffic volume
- **ttl**: Time window for calculating the retry ratio

## Understanding Retry Budget Behavior

The retry budget works like a rolling allowance. If you're sending 100 original requests per second with a 0.2 retry ratio and 10 minRetriesPerSecond, retries may add up to about 30 extra requests per second: 20 from the ratio plus 10 from the additional allowance. Once you hit this limit, Linkerd stops retrying additional failures until the budget allows more retries.

This prevents cascading failures. If a backend service starts failing, retries increase but never exceed the budget. The service gets breathing room to recover instead of being overwhelmed by retry traffic.

The minRetriesPerSecond ensures low-traffic services can still retry. A service receiving 10 requests per second with a 0.2 ratio would get 2 retries per second from the ratio, plus the additional minimum allowance.

## Configuring Per-Route Retry Policies

Different routes need different retry behaviors. Make GET requests more aggressive, POST requests conservative:

```yaml
# backend-profile-route-specific.yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: backend.default.svc.cluster.local
  namespace: default
spec:
  retryBudget:
    retryRatio: 0.2
    minRetriesPerSecond: 10
    ttl: 10s
  routes:
  # Idempotent GET - safe to retry aggressively
  - name: GET /health
    condition:
      method: GET
      pathRegex: /health
    isRetryable: true
    timeout: 1s
  # Search endpoint - retryable but with higher timeout
  - name: GET /search
    condition:
      method: GET
      pathRegex: /search
    isRetryable: true
    timeout: 10s
  # Create operations - not retryable
  - name: POST /api/orders
    condition:
      method: POST
      pathRegex: /api/orders
    isRetryable: false
    timeout: 30s
  # Idempotent PUT - safe to retry
  - name: PUT /api/orders/{id}
    condition:
      method: PUT
      pathRegex: /api/orders/\d+
    isRetryable: true
    timeout: 15s
  # Delete operations - retryable (idempotent)
  - name: DELETE /api/orders/{id}
    condition:
      method: DELETE
      pathRegex: /api/orders/\d+
    isRetryable: true
    timeout: 10s
```

```bash
kubectl apply -f backend-profile-route-specific.yaml
```

Set isRetryable based on idempotency. GET, PUT, and DELETE are typically idempotent and safe to retry. POST creates resources and shouldn't retry automatically.

## Monitoring Retry Metrics

Linkerd provides detailed retry metrics. Check retry statistics:

```bash
linkerd viz routes deploy/webapp --to svc/backend -n default -o wide
```

Look for the EFFECTIVE_SUCCESS, EFFECTIVE_RPS, ACTUAL_SUCCESS, and ACTUAL_RPS columns. Compare effective success rate (with retries) to actual success rate (without retries).

View retry metrics in Prometheus:

```promql
# Effective success rate per ServiceProfile route
sum by (rt_route) (
  rate(route_response_total{classification="success", dst="backend:8080"}[1m])
) / sum by (rt_route) (
  rate(route_response_total{dst="backend:8080"}[1m])
)
```

For retry-specific visibility, prefer `linkerd viz routes ... --to ... -o wide`, which shows the effective and actual request rates used to understand retry behavior.

## Testing Retry Behavior

Simulate failures to verify retry configuration. Use fault injection:

```bash
# In your backend service, add an endpoint that fails randomly
# GET /api/flaky returns 500 30% of the time
```

Update the Service Profile to retry flaky endpoints:

```yaml
routes:
- name: GET /api/flaky
  condition:
    method: GET
    pathRegex: /api/flaky
  isRetryable: true
  timeout: 5s
```

Make requests and observe retries:

```bash
# Generate traffic
kubectl run load-test --image=curlimages/curl --rm -it -- sh -c 'while true; do curl -s http://backend:8080/api/flaky; sleep 0.1; done'
```

Check metrics:

```bash
linkerd viz routes deploy/webapp --to svc/backend -n default -o wide
```

You should see higher effective success rates on the /api/flaky route compared to actual success rates, proving retries work.

## Configuring Response Class Retries

Retry only specific HTTP status codes:

```yaml
# backend-profile-status-retries.yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: backend.default.svc.cluster.local
  namespace: default
spec:
  retryBudget:
    retryRatio: 0.2
    minRetriesPerSecond: 10
    ttl: 10s
  routes:
  - name: GET /api/data
    condition:
      method: GET
      pathRegex: /api/data
    isRetryable: true
    timeout: 5s
    # Only retry specific status codes
    responseClasses:
    - condition:
        status:
          min: 500
          max: 599
      isFailure: true
    - condition:
        status:
          min: 400
          max: 499
      isFailure: false
```

This retries 5xx errors but not 4xx errors. Client errors (4xx) shouldn't retry because they won't succeed without changing the request.

## Creating Fallback Routes

Define a catch-all route for unmatched requests:

```yaml
routes:
# Specific routes first
- name: GET /api/users
  condition:
    method: GET
    pathRegex: /api/users
  isRetryable: true
  timeout: 5s
# Catch-all for other GET requests
- name: GET /*
  condition:
    method: GET
    pathRegex: /.*
  isRetryable: true
  timeout: 10s
# Catch-all for POST requests
- name: POST /*
  condition:
    method: POST
    pathRegex: /.*
  isRetryable: false
  timeout: 30s
```

Linkerd matches routes in order. Place specific routes before generic ones.

## Tuning Retry Budget Parameters

Adjust retry budget based on traffic patterns and failure rates. For high-traffic services with occasional failures:

```yaml
retryBudget:
  retryRatio: 0.1  # Lower ratio for high traffic
  minRetriesPerSecond: 50  # Higher minimum
  ttl: 10s
```

For low-traffic services with frequent transient failures:

```yaml
retryBudget:
  retryRatio: 0.5  # Higher ratio for low traffic
  minRetriesPerSecond: 5  # Lower minimum
  ttl: 10s
```

Monitor the gap between effective and actual RPS with `linkerd viz routes ... --to ... -o wide`. If actual RPS is much higher than effective RPS, retries are adding significant load and the budget may be too generous. If retries rarely occur and transient failures are still visible to clients, the budget may be too conservative.

## Debugging Service Profile Issues

If retries don't work as expected, verify the Service Profile is applied:

```bash
kubectl get serviceprofile -n default
kubectl describe serviceprofile backend.default.svc.cluster.local -n default
```

Check that traffic matches your route conditions:

```bash
linkerd viz tap deploy/webapp --to svc/backend -n default -o wide
```

Look for the rt_route label in the output. If rt_route is absent, your route conditions aren't matching.

## Combining Service Profiles with Traffic Splits

If you are using the Linkerd SMI extension, use Service Profiles with TrafficSplit resources for canary deployments:

```yaml
# trafficsplit.yaml
apiVersion: split.smi-spec.io/v1alpha2
kind: TrafficSplit
metadata:
  name: backend-split
  namespace: default
spec:
  service: backend
  backends:
  - service: backend-v1
    weight: 90
  - service: backend-v2
    weight: 10
```

The Service Profile for the apex service applies while traffic is split between versions. In current Linkerd releases, HTTPRoute and GRPCRoute are the preferred resources for new traffic splitting configuration.

## Conclusion

Linkerd Service Profiles with retry budgets provide intelligent automatic retries that improve reliability without causing retry storms. Configure per-route retry policies based on HTTP semantics and idempotency.

The retry budget prevents cascading failures by limiting retry traffic as a percentage of original requests, plus the additional minRetriesPerSecond allowance. Set retryRatio based on your traffic volume and failure patterns. Use minRetriesPerSecond to ensure low-traffic services can still retry.

Mark only idempotent operations as retryable. GET, PUT, and DELETE are typically safe. POST operations usually create resources and shouldn't retry automatically. Monitor retry metrics to tune your budgets and verify effectiveness.

Service Profiles give Linkerd route metadata and enable sophisticated reliability features. Start with conservative retry budgets and increase them as you gain confidence in your system's behavior.
