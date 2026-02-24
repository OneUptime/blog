# How to Configure Deadline Propagation with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Deadline Propagation, Timeouts, Kubernetes, Microservices

Description: How to implement deadline propagation in Istio service mesh so downstream services know how much time they have left to process a request in a microservice chain.

---

In a microservice architecture, a single user request often fans out to multiple services. The frontend calls service A, which calls service B, which calls service C. If the user is willing to wait 10 seconds, and service A spends 4 seconds processing before calling B, then B only has 6 seconds left. If B does not know about this deadline, it might spend 8 seconds processing something that the user has already given up on.

Deadline propagation solves this by passing the remaining time budget from service to service. Each service knows exactly how much time it has left, and can decide whether to start processing or fail fast.

## The Problem Without Deadline Propagation

Consider this scenario with simple Istio timeouts:

```yaml
# Frontend to Service A: 10s timeout
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: service-a-vs
spec:
  hosts:
    - service-a.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: service-a.default.svc.cluster.local
      timeout: 10s

---
# Service A to Service B: 8s timeout
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: service-b-vs
spec:
  hosts:
    - service-b.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: service-b.default.svc.cluster.local
      timeout: 8s
```

The problem: Service A takes 5 seconds of processing, then calls Service B with an 8-second timeout. But the frontend only had a 10-second timeout. After 10 seconds, the frontend gives up, but Service A and B keep working on a request nobody is waiting for anymore. That wastes resources and can contribute to cascading failures.

## How Deadline Propagation Works

The idea is simple: each service passes the remaining deadline to the next service as a header. Istio does not have built-in deadline propagation, but you can implement it using a combination of headers and application code.

The common approach uses the `grpc-timeout` header (which works for both gRPC and HTTP) or a custom `x-deadline` header.

## Using grpc-timeout Header

For gRPC services, deadline propagation is built into the protocol. The `grpc-timeout` header carries the remaining deadline automatically. Istio's Envoy proxies understand this header and will apply it.

For HTTP services, you can use the same pattern manually. The `grpc-timeout` header format is `<value><unit>` where unit is one of:
- `H` for hours
- `M` for minutes
- `S` for seconds
- `m` for milliseconds
- `u` for microseconds

Your application code needs to:
1. Read the incoming `grpc-timeout` header
2. Subtract the time spent processing
3. Set the `grpc-timeout` header on outgoing requests

Here is a Go example:

```go
func handler(w http.ResponseWriter, r *http.Request) {
    startTime := time.Now()

    // Parse incoming deadline
    deadline := parseGRPCTimeout(r.Header.Get("grpc-timeout"))
    if deadline == 0 {
        deadline = 10 * time.Second // default deadline
    }

    // Create a context with the deadline
    ctx, cancel := context.WithTimeout(r.Context(), deadline)
    defer cancel()

    // Do some processing
    result := doWork(ctx)

    // Calculate remaining time for downstream call
    elapsed := time.Since(startTime)
    remaining := deadline - elapsed
    if remaining <= 0 {
        http.Error(w, "deadline exceeded", http.StatusGatewayTimeout)
        return
    }

    // Call downstream with remaining deadline
    req, _ := http.NewRequestWithContext(ctx, "GET", "http://service-b:8080/api", nil)
    req.Header.Set("grpc-timeout", formatGRPCTimeout(remaining))

    // Propagate trace headers
    for _, h := range []string{"x-request-id", "x-b3-traceid", "x-b3-spanid", "x-b3-parentspanid", "x-b3-sampled"} {
        if v := r.Header.Get(h); v != "" {
            req.Header.Set(h, v)
        }
    }

    client := &http.Client{Timeout: remaining}
    resp, err := client.Do(req)
    if err != nil {
        http.Error(w, "downstream call failed", http.StatusBadGateway)
        return
    }
    defer resp.Body.Close()
    // ...
}

func parseGRPCTimeout(s string) time.Duration {
    if s == "" {
        return 0
    }
    val := s[:len(s)-1]
    unit := s[len(s)-1:]
    n, _ := strconv.ParseInt(val, 10, 64)
    switch unit {
    case "S":
        return time.Duration(n) * time.Second
    case "m":
        return time.Duration(n) * time.Millisecond
    case "M":
        return time.Duration(n) * time.Minute
    default:
        return 0
    }
}

func formatGRPCTimeout(d time.Duration) string {
    return strconv.FormatInt(d.Milliseconds(), 10) + "m"
}
```

## Using Custom x-deadline Header

An alternative approach is to pass an absolute deadline timestamp. This avoids errors from clock drift between header propagation:

```python
import time
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/api/process')
def process():
    # Read incoming deadline (Unix timestamp in milliseconds)
    deadline_str = request.headers.get('x-deadline')
    if deadline_str:
        deadline = float(deadline_str) / 1000.0
    else:
        deadline = time.time() + 10.0  # Default 10 seconds from now

    remaining = deadline - time.time()
    if remaining <= 0:
        return jsonify({"error": "deadline exceeded"}), 504

    # Do some work
    result = do_processing()

    # Check deadline again before making downstream call
    remaining = deadline - time.time()
    if remaining <= 0.5:  # Need at least 500ms for downstream
        return jsonify({"error": "insufficient time for downstream call"}), 504

    # Propagate deadline to downstream
    headers = {
        'x-deadline': deadline_str,
        'x-request-id': request.headers.get('x-request-id', ''),
        'x-b3-traceid': request.headers.get('x-b3-traceid', ''),
        'x-b3-spanid': request.headers.get('x-b3-spanid', ''),
        'x-b3-parentspanid': request.headers.get('x-b3-parentspanid', ''),
        'x-b3-sampled': request.headers.get('x-b3-sampled', ''),
    }

    resp = requests.get(
        'http://service-b:8080/api/data',
        headers=headers,
        timeout=remaining
    )
    return jsonify(resp.json())
```

## Setting the Initial Deadline with Istio

The initial deadline can be set at the Istio ingress gateway using an EnvoyFilter that adds the deadline header:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: set-deadline-header
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
              name: "envoy.filters.network.http_connection_manager"
              subFilter:
                name: "envoy.filters.http.router"
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.lua
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            inline_code: |
              function envoy_on_request(request_handle)
                local deadline = request_handle:headers():get("x-deadline")
                if not deadline then
                  local now = os.time()
                  local deadline_ms = (now + 30) * 1000
                  request_handle:headers():add("x-deadline", tostring(deadline_ms))
                end
              end
```

This sets a 30-second deadline for all incoming requests that do not already have one.

## Configuring Istio Timeouts to Match Deadlines

Your Istio VirtualService timeouts should be slightly longer than the deadline to allow for cleanup:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: service-a-vs
spec:
  hosts:
    - service-a.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: service-a.default.svc.cluster.local
      timeout: 35s  # 30s deadline + 5s buffer for cleanup
```

The Istio timeout acts as a hard backstop. The application should respect the deadline header and stop processing on its own, but if it does not, the Istio timeout will force-terminate the request.

## Monitoring Deadline Violations

Track how often deadlines are exceeded:

```promql
# Requests that returned 504 (deadline exceeded)
sum(rate(istio_requests_total{response_code="504"}[5m])) by (destination_service_name, source_workload)
```

You can also add the deadline header as a custom metric dimension to track which services are consistently running close to their deadline:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: deadline-metrics
  namespace: default
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
            mode: SERVER
          tagOverrides:
            has_deadline:
              operation: UPSERT
              value: "request.headers['x-deadline'] != '' ? 'true' : 'false'"
```

## Summary

Deadline propagation is not built into Istio natively, but you can implement it effectively using custom headers and application code. The key idea is that each service in the chain knows how much time it has left and can fail fast instead of wasting resources on requests that have already timed out upstream. Set the initial deadline at the ingress gateway, propagate it through every service, and use Istio timeouts as a hard backstop. This prevents wasted work, reduces resource consumption during slowdowns, and helps maintain responsiveness even when downstream services are degraded.
