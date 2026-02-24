# How to Create Istio Best Practices Guide for Developers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Best Practices, Kubernetes, Service Mesh, Developer Guide

Description: A comprehensive set of Istio best practices for application developers covering service deployment, traffic management, security, and observability.

---

Best practices guides are only useful when they are specific and actionable. Generic advice like "use mTLS" does not help a developer who is trying to ship a feature. This guide covers the concrete best practices that application developers should follow when working with Istio, with specific configurations and examples for each recommendation.

## Service Deployment Best Practices

### Always Name Your Ports

Istio uses port names to determine the protocol. If ports are not named, Istio treats all traffic as plain TCP, which means you lose HTTP-level metrics, routing, and policy enforcement.

Bad:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
  - port: 8080
    targetPort: 8080
```

Good:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
  - name: http-api
    port: 8080
    targetPort: 8080
  - name: grpc-internal
    port: 50051
    targetPort: 50051
```

Valid prefixes: `http`, `http2`, `grpc`, `tcp`, `tls`, `https`, `mongo`, `mysql`, `redis`.

### Use app and version Labels

Istio uses `app` and `version` labels for traffic management and telemetry. Every deployment should have both:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-v1
spec:
  selector:
    matchLabels:
      app: checkout
      version: v1
  template:
    metadata:
      labels:
        app: checkout
        version: v1
    spec:
      containers:
      - name: checkout
        image: registry/checkout:1.0
```

Without the `version` label, you cannot do traffic splitting between versions, and Kiali will not show version-specific graphs.

### Configure Health Checks Properly

Istio needs to know when your service is healthy. Kubernetes probes work, but be aware that the sidecar adds a slight delay to startup. Use `holdApplicationUntilProxyStarts` (which should be a platform default) and configure appropriate startup probes:

```yaml
containers:
- name: my-service
  image: registry/my-service:1.0
  ports:
  - containerPort: 8080
  startupProbe:
    httpGet:
      path: /healthz
      port: 8080
    initialDelaySeconds: 5
    periodSeconds: 5
    failureThreshold: 30
  readinessProbe:
    httpGet:
      path: /ready
      port: 8080
    periodSeconds: 10
  livenessProbe:
    httpGet:
      path: /healthz
      port: 8080
    periodSeconds: 15
    failureThreshold: 3
```

The startup probe gives the application time to initialize. The readiness probe tells Kubernetes (and Istio) when the pod can receive traffic.

### Set Explicit Resource Requests

Both your application container and the sidecar need appropriate resources. The sidecar defaults are usually fine, but if your service handles high traffic, consider overriding them:

```yaml
metadata:
  annotations:
    sidecar.istio.io/proxyCPU: "100m"
    sidecar.istio.io/proxyMemory: "128Mi"
    sidecar.istio.io/proxyCPULimit: "1000m"
    sidecar.istio.io/proxyMemoryLimit: "512Mi"
```

## Traffic Management Best Practices

### Always Set Timeouts

Never deploy a VirtualService without an explicit timeout. Without one, requests can hang indefinitely:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
  - my-service
  http:
  - timeout: 10s
    route:
    - destination:
        host: my-service
```

Choose timeouts based on the actual expected response time of your service. If your p99 is 2 seconds, a 10 second timeout is reasonable. Do not set it to 60 seconds "just to be safe" because that means each failing request ties up resources for a full minute.

### Configure Retries Carefully

Retries help with transient failures but can make things worse during outages. Follow these rules:

1. Only retry on connection failures and 503s, not on all 5xx codes
2. Set a perTryTimeout shorter than the overall timeout
3. Keep the retry count low (2-3 attempts max)

```yaml
http:
- timeout: 10s
  retries:
    attempts: 3
    perTryTimeout: 3s
    retryOn: connect-failure,refused-stream,unavailable,retriable-status-codes
    retryRemoteLocalities: true
  route:
  - destination:
      host: my-service
```

Never retry non-idempotent operations (POST requests that create records, for example) unless your service handles duplicate requests gracefully.

### Use Traffic Splitting for Safe Deployments

Instead of deploying a new version and hoping for the best, use traffic splitting:

```yaml
apiVersion: platform.company.com/v1
kind: TrafficRoute
metadata:
  name: my-service
spec:
  service: my-service
  routes:
  - version: v1
    weight: 95
  - version: v2
    weight: 5
  timeout: 10s
```

Start at 5%, monitor for 30 minutes, then increase to 25%, 50%, and finally 100%. This gives you time to spot problems before they affect all users.

## Security Best Practices

### Follow the Principle of Least Privilege

Only allow the specific services that need to call your service:

```yaml
apiVersion: platform.company.com/v1
kind: ServiceAccess
metadata:
  name: my-service-access
spec:
  allowFrom:
  - service: frontend
    namespace: team-frontend
    paths: ["/api/v1/public/*"]
  - service: admin-dashboard
    namespace: team-admin
    paths: ["/api/v1/admin/*"]
```

Do not open your service to an entire namespace unless every service in that namespace genuinely needs access. And never use wildcard namespaces.

### Do Not Disable mTLS

If you are having connectivity issues, the fix is almost never "disable mTLS." Common causes of mTLS-related failures:

- The destination does not have a sidecar (check pod container count)
- The destination namespace does not have injection enabled
- There is a misconfigured DestinationRule overriding the TLS mode

Check with:

```bash
istioctl x describe pod <your-pod>
```

### Secure External Communication

When calling external services, use ServiceEntry with TLS origination:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
  - api.external-service.com
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

This ensures external traffic goes through the sidecar and is visible in metrics and traces.

## Observability Best Practices

### Propagate Trace Headers

For distributed tracing to work across services, your application needs to propagate trace headers. These headers must be forwarded from incoming requests to outgoing requests:

- `x-request-id`
- `x-b3-traceid`
- `x-b3-spanid`
- `x-b3-parentspanid`
- `x-b3-sampled`
- `x-b3-flags`
- `traceparent`
- `tracestate`

In a Go service:

```go
func handler(w http.ResponseWriter, r *http.Request) {
    // Extract trace headers from incoming request
    headers := []string{
        "x-request-id", "x-b3-traceid", "x-b3-spanid",
        "x-b3-parentspanid", "x-b3-sampled", "traceparent", "tracestate",
    }

    // Create outgoing request
    req, _ := http.NewRequest("GET", "http://other-service:8080/api", nil)

    // Propagate trace headers
    for _, h := range headers {
        if v := r.Header.Get(h); v != "" {
            req.Header.Set(h, v)
        }
    }

    client := &http.Client{}
    resp, err := client.Do(req)
    // ...
}
```

Without header propagation, each service-to-service hop appears as a separate trace instead of being connected in a single trace.

### Use Structured Logging with Request IDs

Include the `x-request-id` in your application logs so you can correlate application logs with Istio access logs:

```python
import logging

class RequestIDFilter(logging.Filter):
    def filter(self, record):
        from flask import request
        record.request_id = request.headers.get('x-request-id', 'unknown')
        return True

logging.basicConfig(format='%(asctime)s request_id=%(request_id)s %(message)s')
logger = logging.getLogger()
logger.addFilter(RequestIDFilter())
```

### Check the Right Dashboard

Before investigating an issue:

1. Check the service-level dashboard in Grafana for RED metrics
2. If you see errors, check the access logs for response flags
3. If the issue spans multiple services, use Jaeger to trace the request path
4. If you suspect mesh issues, check the Istio control plane dashboard

## Resilience Best Practices

### Configure Circuit Breaking

Every service should have circuit breaking to prevent cascade failures:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

If your platform provides these as defaults, verify they are appropriate for your service's traffic pattern and adjust if needed.

### Handle Retries Gracefully

Your service will receive retried requests. Make sure your endpoints are idempotent where possible, or handle duplicates:

```python
@app.route('/api/v1/orders', methods=['POST'])
def create_order():
    idempotency_key = request.headers.get('x-request-id')

    # Check if this request was already processed
    existing = db.orders.find_one({'idempotency_key': idempotency_key})
    if existing:
        return jsonify(existing), 200

    # Process the new order
    order = create_new_order(request.json)
    order['idempotency_key'] = idempotency_key
    db.orders.insert_one(order)

    return jsonify(order), 201
```

## Common Mistakes to Avoid

1. **Not naming service ports** - This breaks HTTP-level features
2. **Setting timeout too high** - Causes resource exhaustion during failures
3. **Retrying non-idempotent requests** - Creates duplicate records
4. **Not propagating trace headers** - Breaks distributed tracing
5. **Opening authorization too broadly** - Use specific service and path rules
6. **Ignoring circuit breaker defaults** - Override only if your traffic justifies it
7. **Deploying without version labels** - Makes canary deployments impossible

## Summary

Istio best practices for developers boil down to a few principles: name your ports, label your pods, set explicit timeouts and retries, follow least-privilege for authorization, propagate trace headers, and use traffic splitting for safe deployments. These are not abstract recommendations but concrete configuration patterns that prevent the most common production issues. The platform team should enforce the most critical practices through policy guardrails, but developers who internalize these patterns will build more reliable services and spend less time debugging mesh issues.
