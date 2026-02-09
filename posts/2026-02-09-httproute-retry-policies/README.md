# How to implement HTTPRoute retry policies for resilience

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Gateway API, Reliability

Description: Configure retry policies in Kubernetes Gateway API HTTPRoute to handle transient failures automatically with exponential backoff, retry conditions, and retry budgets for improved application resilience without code changes.

---

Network failures happen. Transient errors, temporary overload, and brief connectivity issues are inevitable in distributed systems. Retry policies at the gateway level provide automatic retry logic without requiring changes to application code. The Kubernetes Gateway API supports retry configuration in HTTPRoute, allowing you to specify retry conditions, backoff strategies, and retry limits. This guide shows you how to implement effective retry policies.

## Understanding Gateway API Retries

Gateway-level retries provide automatic failure recovery for:

- Connection failures
- Timeout errors
- 5xx server errors
- Specific HTTP status codes

Retries happen transparently to clients, improving success rates without application changes.

## Gateway Implementation Support

Retry policy support varies by gateway implementation. Check your gateway documentation:

- **Envoy Gateway**: Full retry support via BackendTrafficPolicy
- **Kong Gateway**: Retry support via annotations and plugins
- **Istio Gateway**: Retry support via VirtualService
- **Traefik**: Retry support via middleware

This guide covers common patterns that work across implementations.

## Basic Retry Configuration with Envoy Gateway

Envoy Gateway provides retry support through BackendTrafficPolicy:

```yaml
# envoy-retry-policy.yaml
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: BackendTrafficPolicy
metadata:
  name: retry-policy
  namespace: default
spec:
  targetRef:
    group: gateway.networking.k8s.io
    kind: HTTPRoute
    name: api-route
  retry:
    numRetries: 3
    retryOn:
      httpStatusCodes:
      - 503
      - 504
      triggers:
      - connect-failure
      - refused-stream
      - reset
```

Create the HTTPRoute:

```yaml
# api-route.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: api-route
  namespace: default
spec:
  parentRefs:
  - name: production-gateway
  hostnames:
  - "api.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api
    backendRefs:
    - name: api-service
      port: 8080
```

The gateway will automatically retry failed requests up to 3 times.

## Retry with Exponential Backoff

Configure exponential backoff to avoid overwhelming failing backends:

```yaml
# exponential-backoff-retry.yaml
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: BackendTrafficPolicy
metadata:
  name: backoff-retry-policy
spec:
  targetRef:
    group: gateway.networking.k8s.io
    kind: HTTPRoute
    name: api-route
  retry:
    numRetries: 3
    perRetryPolicy:
      timeout: 10s  # Timeout per retry attempt
      backoff:
        baseInterval: 1s  # Initial backoff
        maxInterval: 10s  # Maximum backoff
    retryOn:
      httpStatusCodes:
      - 502
      - 503
      - 504
```

Retry schedule:
- First retry: 1s delay
- Second retry: 2s delay
- Third retry: 4s delay

## Kong Gateway Retry Configuration

Kong Gateway uses annotations for retry configuration:

```yaml
# kong-retry-route.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: kong-retry-route
  annotations:
    konghq.com/retries: "3"
spec:
  parentRefs:
  - name: kong-gateway
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api
    backendRefs:
    - name: api-service
      port: 8080
```

For more advanced retry configuration with Kong, use the Retry plugin:

```yaml
# kong-retry-plugin.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: request-retry
config:
  retries: 3
  retry_condition:
  - 500
  - 502
  - 503
  - 504
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: kong-retry-route
  annotations:
    konghq.com/plugins: request-retry
spec:
  parentRefs:
  - name: kong-gateway
  rules:
  - backendRefs:
    - name: api-service
      port: 8080
```

## Selective Retry Conditions

Retry only specific failure types to avoid retrying non-idempotent operations:

```yaml
# selective-retry.yaml
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: BackendTrafficPolicy
metadata:
  name: selective-retry
spec:
  targetRef:
    group: gateway.networking.k8s.io
    kind: HTTPRoute
    name: api-route
  retry:
    numRetries: 2
    retryOn:
      # Retry on connection failures (safe)
      triggers:
      - connect-failure
      - refused-stream
      - reset
      - retriable-4xx  # Only 429 Too Many Requests
      # Retry specific server errors
      httpStatusCodes:
      - 503  # Service Unavailable
      - 504  # Gateway Timeout
      # Do NOT retry on 500 Internal Server Error (might not be transient)
```

## Per-Route Retry Configuration

Different routes need different retry strategies:

```yaml
# per-route-retries.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: mixed-retry-route
spec:
  parentRefs:
  - name: production-gateway
  rules:
  # Read operations - safe to retry
  - matches:
    - path:
        type: PathPrefix
        value: /api/users
      method: GET
    backendRefs:
    - name: user-service
      port: 8080
---
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: BackendTrafficPolicy
metadata:
  name: read-retry-policy
spec:
  targetRef:
    group: gateway.networking.k8s.io
    kind: HTTPRoute
    name: mixed-retry-route
  retry:
    numRetries: 3
    retryOn:
      httpStatusCodes:
      - 502
      - 503
      - 504
```

For write operations, be more conservative:

```yaml
# write-route.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: write-route
spec:
  parentRefs:
  - name: production-gateway
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api/users
      method: POST
    backendRefs:
    - name: user-service
      port: 8080
---
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: BackendTrafficPolicy
metadata:
  name: write-retry-policy
spec:
  targetRef:
    group: gateway.networking.k8s.io
    kind: HTTPRoute
    name: write-route
  retry:
    numRetries: 1  # Only retry once
    retryOn:
      triggers:
      - connect-failure  # Only retry connection failures, not 5xx errors
```

## Idempotency Keys for Safe Retries

Implement idempotency keys to make write operations safely retryable:

```go
// Backend service with idempotency support
package main

import (
    "encoding/json"
    "net/http"
    "sync"
    "time"
)

var (
    processedRequests = make(map[string]*Response)
    mu                sync.RWMutex
)

type Response struct {
    Result    string
    Timestamp time.Time
}

func createUserHandler(w http.ResponseWriter, r *http.Request) {
    // Get idempotency key from header
    idempotencyKey := r.Header.Get("Idempotency-Key")

    if idempotencyKey != "" {
        // Check if already processed
        mu.RLock()
        if cached, exists := processedRequests[idempotencyKey]; exists {
            mu.RUnlock()
            // Return cached response
            w.Header().Set("X-Idempotent-Replayed", "true")
            json.NewEncoder(w).Encode(cached)
            return
        }
        mu.RUnlock()
    }

    // Process request
    result := processCreateUser(r)

    response := &Response{
        Result:    result,
        Timestamp: time.Now(),
    }

    // Cache result
    if idempotencyKey != "" {
        mu.Lock()
        processedRequests[idempotencyKey] = response
        mu.Unlock()
    }

    json.NewEncoder(w).Encode(response)
}

func processCreateUser(r *http.Request) string {
    // Actual user creation logic
    return "user-created-123"
}
```

Configure gateway to add idempotency keys:

```yaml
# idempotency-route.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: idempotent-route
spec:
  parentRefs:
  - name: production-gateway
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api/users
      method: POST
    filters:
    - type: RequestHeaderModifier
      requestHeaderModifier:
        add:
        - name: Idempotency-Key
          value: "${request_id}"  # If supported by gateway
    backendRefs:
    - name: user-service
      port: 8080
```

## Retry Budget Limits

Prevent retry storms by limiting total retry percentage:

```yaml
# retry-budget.yaml
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: BackendTrafficPolicy
metadata:
  name: retry-budget-policy
spec:
  targetRef:
    group: gateway.networking.k8s.io
    kind: HTTPRoute
    name: api-route
  retry:
    numRetries: 3
    retryOn:
      httpStatusCodes:
      - 503
      - 504
    # Retry budget (implementation-specific)
    budget:
      # Max 20% of requests can be retries
      maxRetryRatio: 0.2
      # At least 10 requests before enforcing ratio
      minRetryConcurrency: 10
```

This prevents overwhelming backends when failure rates are high.

## Monitoring Retry Behavior

Track retry metrics to understand effectiveness:

```yaml
# servicemonitor-retries.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: gateway-retry-metrics
spec:
  selector:
    matchLabels:
      app: gateway
  endpoints:
  - port: metrics
    interval: 30s
```

Query retry metrics:

```promql
# Total retry rate
sum(rate(envoy_cluster_upstream_rq_retry[5m])) by (route)

# Retry success rate
sum(rate(envoy_cluster_upstream_rq_retry_success[5m])) by (route) /
sum(rate(envoy_cluster_upstream_rq_retry[5m])) by (route)

# Retry overflow (budget exceeded)
sum(rate(envoy_cluster_upstream_rq_retry_overflow[5m])) by (route)

# Requests with retries vs total
(sum(rate(envoy_cluster_upstream_rq_retry[5m])) by (route)) /
(sum(rate(envoy_cluster_upstream_rq_total[5m])) by (route))
```

Create alerts for retry issues:

```yaml
# prometheusrule-retry-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: retry-alerts
spec:
  groups:
  - name: retries
    interval: 30s
    rules:
    - alert: HighRetryRate
      expr: sum(rate(envoy_cluster_upstream_rq_retry[5m])) by (route) / sum(rate(envoy_cluster_upstream_rq_total[5m])) by (route) > 0.1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High retry rate on route {{ $labels.route }}"
        description: "{{ $value | humanizePercentage }} of requests are being retried"
    - alert: LowRetrySuccess
      expr: sum(rate(envoy_cluster_upstream_rq_retry_success[5m])) by (route) / sum(rate(envoy_cluster_upstream_rq_retry[5m])) by (route) < 0.5
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Low retry success rate on route {{ $labels.route }}"
        description: "Only {{ $value | humanizePercentage }} of retries succeed"
```

## Circuit Breaking with Retries

Combine retries with circuit breaking to prevent cascading failures:

```yaml
# circuit-breaker-with-retry.yaml
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: BackendTrafficPolicy
metadata:
  name: circuit-breaker-retry
spec:
  targetRef:
    group: gateway.networking.k8s.io
    kind: HTTPRoute
    name: api-route
  # Circuit breaker configuration
  circuitBreaker:
    maxConnections: 100
    maxPendingRequests: 50
    maxRequests: 200
    maxRetries: 10  # Max concurrent retries
  # Retry configuration
  retry:
    numRetries: 2
    perRetryPolicy:
      timeout: 5s
    retryOn:
      httpStatusCodes:
      - 503
      - 504
```

The circuit breaker limits total retry load on the backend.

## Testing Retry Behavior

Create a test backend that simulates failures:

```python
# test-retry-backend.py
from flask import Flask, request
import random
import os

app = Flask(__name__)

# Failure rate from environment
FAILURE_RATE = float(os.getenv('FAILURE_RATE', '0.3'))
attempt_counts = {}

@app.route('/api/test')
def test_endpoint():
    request_id = request.headers.get('X-Request-ID', 'unknown')

    # Track attempts for this request
    if request_id not in attempt_counts:
        attempt_counts[request_id] = 0
    attempt_counts[request_id] += 1

    attempt = attempt_counts[request_id]

    # Simulate transient failures
    if attempt == 1 and random.random() < FAILURE_RATE:
        return {"error": "Service temporarily unavailable", "attempt": attempt}, 503

    # Success on retry
    return {
        "message": "Success",
        "attempt": attempt,
        "request_id": request_id
    }, 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

Deploy and test:

```bash
# Deploy test backend
kubectl apply -f test-retry-backend.yaml

# Test retry behavior (requires gateway with retry configured)
for i in {1..100}; do
  curl -H "X-Request-ID: test-$i" http://api.example.com/api/test
done

# Check success rate
# Should be higher than without retries due to automatic retry
```

## Retry Best Practices

Follow these guidelines for effective retry configuration:

1. **Only retry idempotent operations**: GET, HEAD, OPTIONS are safe
2. **Use exponential backoff**: Avoid overwhelming failing services
3. **Set retry budgets**: Limit retry storm impact
4. **Configure appropriate timeouts**: Per-retry timeout < total timeout
5. **Monitor retry metrics**: Track retry rates and success

Calculate optimal retry count:

```
Max retries = log(max_acceptable_latency / base_latency) / log(backoff_multiplier)
```

Example: 30s max latency, 1s base, 2x backoff:
```
Max retries = log(30/1) / log(2) = 4.9 ≈ 5 retries
```

## Avoiding Retry Storms

Implement jitter to prevent synchronized retries:

```yaml
# jittered-retry.yaml
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: BackendTrafficPolicy
metadata:
  name: jittered-retry
spec:
  targetRef:
    group: gateway.networking.k8s.io
    kind: HTTPRoute
    name: api-route
  retry:
    numRetries: 3
    perRetryPolicy:
      timeout: 10s
      backoff:
        baseInterval: 1s
        maxInterval: 10s
        # Add random jitter (implementation-specific)
        jitterPercent: 50  # +/- 50% randomization
```

Jitter spreads retry attempts over time, reducing thundering herd effects.

## Troubleshooting Retry Issues

Debug retry behavior:

```bash
# Check policy configuration
kubectl describe backendtrafficpolicy retry-policy

# View gateway logs with retry info
kubectl logs -n gateway-system -l app=envoy-gateway --tail=100 | grep retry

# Check backend pod logs for retry attempts
kubectl logs -l app=api-service | grep "X-Envoy-Attempt-Count"

# Test retry manually
curl -v http://api.example.com/api/test -H "X-Envoy-Force-Retry: true"
```

Common retry problems:

1. **Retrying non-idempotent operations**: Add idempotency keys
2. **Retry storms**: Implement retry budgets and jitter
3. **Cascading failures**: Add circuit breakers
4. **High latency**: Reduce retry count or use faster backoff
5. **No effect**: Verify gateway implementation supports retries

HTTPRoute retry policies provide automatic failure recovery at the gateway level, improving application resilience without code changes. Configure retries based on operation idempotency, implement exponential backoff to avoid overwhelming backends, set retry budgets to prevent retry storms, and monitor retry metrics to tune configuration. Proper retry policies significantly improve success rates in distributed systems while maintaining good performance characteristics.
