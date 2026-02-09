# How to configure HTTPRoute timeout policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Gateway API, Reliability

Description: Configure request and backend timeout policies in Kubernetes Gateway API HTTPRoute to prevent cascading failures, handle slow backends gracefully, and improve application resilience with per-route timeout configuration and best practices.

---

Timeouts are critical for building resilient applications. Without proper timeout configuration, slow or unresponsive backends can cause cascading failures, resource exhaustion, and poor user experience. The Kubernetes Gateway API provides timeout policies at the HTTPRoute level, allowing you to set request timeouts and backend connection timeouts per route. This guide shows you how to configure and tune timeout policies effectively.

## Understanding Gateway API Timeouts

The Gateway API supports two types of timeouts in HTTPRoute:

1. **Request timeout**: Maximum time for the entire request-response cycle
2. **Backend request timeout**: Maximum time to wait for a backend to respond

These timeouts protect your system from slow or hanging requests and prevent resource exhaustion.

## Basic Request Timeout Configuration

Configure a request timeout for an HTTPRoute. Note that timeout support depends on your gateway implementation (Kong, Envoy, etc.):

```yaml
# basic-timeout.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: api-with-timeout
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
    timeouts:
      request: 30s  # Maximum 30 seconds for entire request
    backendRefs:
    - name: api-service
      port: 8080
```

If the request takes longer than 30 seconds, the gateway returns a 504 Gateway Timeout error.

## Per-Route Timeout Configuration

Different routes have different performance characteristics. Configure timeouts based on route needs:

```yaml
# per-route-timeouts.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: mixed-timeouts
spec:
  parentRefs:
  - name: production-gateway
  hostnames:
  - "api.example.com"
  rules:
  # Fast read operations - short timeout
  - matches:
    - path:
        type: PathPrefix
        value: /api/users
      method: GET
    timeouts:
      request: 5s
    backendRefs:
    - name: user-service
      port: 8080
  # Slow write operations - longer timeout
  - matches:
    - path:
        type: PathPrefix
        value: /api/reports
      method: POST
    timeouts:
      request: 120s  # 2 minutes for report generation
    backendRefs:
    - name: report-service
      port: 8080
  # File uploads - very long timeout
  - matches:
    - path:
        type: PathPrefix
        value: /api/upload
      method: POST
    timeouts:
      request: 300s  # 5 minutes for large file uploads
    backendRefs:
    - name: upload-service
      port: 8080
```

## Backend Request Timeout

Configure how long the gateway waits for a backend connection and response:

```yaml
# backend-timeout.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: backend-timeout-example
spec:
  parentRefs:
  - name: production-gateway
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /
    timeouts:
      request: 60s  # Total request timeout
      backendRequest: 45s  # Backend must respond within 45s
    backendRefs:
    - name: app-service
      port: 8080
```

The `backendRequest` timeout should be shorter than `request` timeout to allow time for processing and retries.

## Implementing Timeout Best Practices

Design timeout hierarchies from client to backend:

```yaml
# timeout-hierarchy.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: timeout-hierarchy
  annotations:
    description: "Client timeout > Gateway timeout > Backend timeout"
spec:
  parentRefs:
  - name: production-gateway
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api
    timeouts:
      # Gateway timeout: 50 seconds
      request: 50s
      # Backend must respond faster
      backendRequest: 45s
    backendRefs:
    - name: api-service
      port: 8080
```

Configure backend service with shorter timeout:

```go
// Go backend service configuration
package main

import (
    "context"
    "net/http"
    "time"
)

func main() {
    mux := http.NewServeMux()

    // Wrap handlers with timeout
    mux.HandleFunc("/api/", timeoutMiddleware(40*time.Second, apiHandler))

    server := &http.Server{
        Addr:         ":8080",
        Handler:      mux,
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 40 * time.Second,
        IdleTimeout:  120 * time.Second,
    }

    server.ListenAndServe()
}

func timeoutMiddleware(timeout time.Duration, next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        ctx, cancel := context.WithTimeout(r.Context(), timeout)
        defer cancel()

        // Pass context to handler
        next(w, r.WithContext(ctx))
    }
}

func apiHandler(w http.ResponseWriter, r *http.Request) {
    // Check context for timeout
    select {
    case <-r.Context().Done():
        http.Error(w, "Request timeout", http.StatusRequestTimeout)
        return
    default:
        // Process request
        w.Write([]byte("Response"))
    }
}
```

Timeout hierarchy: Client (60s) > Gateway (50s) > Backend handler (40s)

## Handling Streaming Requests

For long-lived connections like SSE or streaming APIs, use longer timeouts or disable them:

```yaml
# streaming-timeout.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: streaming-route
spec:
  parentRefs:
  - name: production-gateway
  rules:
  # Regular API - normal timeout
  - matches:
    - path:
        type: Exact
        value: /api/data
    timeouts:
      request: 30s
    backendRefs:
    - name: api-service
      port: 8080
  # Streaming endpoint - long timeout
  - matches:
    - path:
        type: PathPrefix
        value: /api/stream
    timeouts:
      request: 3600s  # 1 hour for streaming
    backendRefs:
    - name: streaming-service
      port: 8080
```

## Timeout with Retry Configuration

Combine timeouts with retries for resilience:

```yaml
# timeout-with-retry.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: resilient-route
spec:
  parentRefs:
  - name: production-gateway
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api
    timeouts:
      request: 60s  # Total time including retries
      backendRequest: 15s  # Per-attempt timeout
    backendRefs:
    - name: api-service
      port: 8080
```

If implemented by your gateway, it can retry on timeout within the overall request timeout.

## Gateway-Specific Timeout Configuration

Different gateway implementations have different timeout configuration methods. For Kong Gateway:

```yaml
# kong-timeout-annotations.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: kong-timeout-example
  annotations:
    konghq.com/connect-timeout: "5000"   # 5 seconds
    konghq.com/write-timeout: "60000"    # 60 seconds
    konghq.com/read-timeout: "60000"     # 60 seconds
spec:
  parentRefs:
  - name: kong-gateway
  rules:
  - backendRefs:
    - name: app-service
      port: 8080
```

For Envoy Gateway, timeouts may be configured via BackendTrafficPolicy:

```yaml
# envoy-timeout-policy.yaml
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: BackendTrafficPolicy
metadata:
  name: timeout-policy
spec:
  targetRef:
    group: gateway.networking.k8s.io
    kind: HTTPRoute
    name: api-route
  timeout:
    tcp:
      connectTimeout: 10s
    http:
      requestTimeout: 60s
```

Check your gateway implementation documentation for specific timeout configuration options.

## Monitoring Timeout Behavior

Track timeout metrics to tune configuration:

```yaml
# servicemonitor-timeouts.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: gateway-timeout-metrics
spec:
  selector:
    matchLabels:
      app: gateway
  endpoints:
  - port: metrics
    interval: 30s
```

Query timeout metrics in Prometheus:

```promql
# Request timeout rate
sum(rate(gateway_http_requests_total{status="504"}[5m])) by (route)

# 95th percentile response time
histogram_quantile(0.95, sum(rate(gateway_http_request_duration_seconds_bucket[5m])) by (le, route))

# Requests approaching timeout
sum(gateway_http_request_duration_seconds_bucket{le="25"} - gateway_http_request_duration_seconds_bucket{le="20"}) by (route)
```

Create alerts for high timeout rates:

```yaml
# prometheusrule-timeout-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: timeout-alerts
spec:
  groups:
  - name: timeouts
    interval: 30s
    rules:
    - alert: HighTimeoutRate
      expr: sum(rate(gateway_http_requests_total{status="504"}[5m])) by (route) > 0.01
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High timeout rate on route {{ $labels.route }}"
        description: "Route {{ $labels.route }} has {{ $value | humanizePercentage }} timeout rate"
    - alert: SlowResponseTime
      expr: histogram_quantile(0.95, sum(rate(gateway_http_request_duration_seconds_bucket[5m])) by (le, route)) > 10
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Slow response time on route {{ $labels.route }}"
        description: "P95 latency on {{ $labels.route }} is {{ $value }}s"
```

## Testing Timeout Configuration

Create a test backend that simulates slow responses:

```go
// test-slow-backend.go
package main

import (
    "fmt"
    "net/http"
    "strconv"
    "time"
)

func slowHandler(w http.ResponseWriter, r *http.Request) {
    // Get delay from query parameter
    delayStr := r.URL.Query().Get("delay")
    delay, err := strconv.Atoi(delayStr)
    if err != nil {
        delay = 0
    }

    // Simulate slow processing
    time.Sleep(time.Duration(delay) * time.Second)

    fmt.Fprintf(w, "Responded after %d seconds", delay)
}

func main() {
    http.HandleFunc("/slow", slowHandler)
    http.ListenAndServe(":8080", nil)
}
```

Deploy and test:

```yaml
# test-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: slow-backend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: slow-backend
  template:
    metadata:
      labels:
        app: slow-backend
    spec:
      containers:
      - name: backend
        image: slow-backend:latest
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: slow-service
spec:
  selector:
    app: slow-backend
  ports:
  - port: 8080
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: timeout-test
spec:
  parentRefs:
  - name: production-gateway
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /test
    timeouts:
      request: 10s  # 10 second timeout
    backendRefs:
    - name: slow-service
      port: 8080
```

Test timeout behavior:

```bash
# Should succeed (5s < 10s timeout)
curl "http://api.example.com/test/slow?delay=5"

# Should timeout (15s > 10s timeout)
curl "http://api.example.com/test/slow?delay=15"

# Measure actual timeout
time curl "http://api.example.com/test/slow?delay=20"
```

## Timeout Tuning Guidelines

Choose appropriate timeout values:

1. **Fast APIs (< 1s)**: Use 5-10s timeouts
2. **Standard APIs (1-5s)**: Use 15-30s timeouts
3. **Slow operations (5-30s)**: Use 60-120s timeouts
4. **Batch/Report generation**: Use 300-600s timeouts
5. **File uploads/downloads**: Base on file size and bandwidth

Calculate timeout from SLA requirements:

```
Required timeout = P99 latency + (retry_attempts * P99 latency) + buffer
```

Example for API with P99 = 2s, 2 retries:
```
Timeout = 2s + (2 * 2s) + 2s buffer = 8s
```

## Graceful Timeout Handling

Implement graceful timeout handling in backend services:

```python
# python-timeout-handler.py
from flask import Flask, request
import signal
import time

app = Flask(__name__)

class TimeoutException(Exception):
    pass

def timeout_handler(signum, frame):
    raise TimeoutException("Request timeout")

@app.route('/api/process')
def process_request():
    # Set alarm for internal timeout (shorter than gateway)
    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(25)  # 25s internal timeout (gateway has 30s)

    try:
        # Long-running operation
        result = expensive_operation()
        signal.alarm(0)  # Cancel alarm
        return {"result": result}
    except TimeoutException:
        signal.alarm(0)
        return {"error": "Processing timeout"}, 408
    except Exception as e:
        signal.alarm(0)
        return {"error": str(e)}, 500

def expensive_operation():
    # Simulate work
    time.sleep(10)
    return "completed"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## Troubleshooting Timeouts

Diagnose timeout issues:

```bash
# Check HTTPRoute status
kubectl describe httproute api-with-timeout

# View gateway logs
kubectl logs -n gateway-system -l app=gateway --tail=100 | grep timeout

# Test backend directly (bypass gateway)
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl -v http://api-service.default.svc.cluster.local:8080/api

# Check backend pod logs
kubectl logs -n default -l app=api-service --tail=100
```

Common timeout problems:

1. **Backend slower than timeout**: Increase timeout or optimize backend
2. **Network latency**: Check pod network performance
3. **Resource contention**: Check CPU/memory usage
4. **Database queries**: Optimize slow queries
5. **External API calls**: Add circuit breakers

HTTPRoute timeout policies provide fine-grained control over request timeouts at the routing layer. Configure timeouts based on route characteristics, implement proper timeout hierarchies from client to backend, monitor timeout metrics, and tune values based on actual performance data. Proper timeout configuration prevents cascading failures and improves overall system resilience.
