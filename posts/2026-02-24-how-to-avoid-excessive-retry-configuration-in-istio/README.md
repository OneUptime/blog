# How to Avoid Excessive Retry Configuration in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Retries, Resilience, Kubernetes, Performance

Description: How excessive retry configuration in Istio causes retry storms and cascading failures, and how to configure retries safely with circuit breakers and budgets.

---

Retries feel like a safety net. If a request fails, just try again, right? That logic works fine for a single service calling another single service. But in a distributed system with dozens of services, each with their own retry configuration, a small failure can turn into a retry storm that overwhelms your infrastructure.

Here is how to configure retries in Istio without accidentally creating a bigger problem than the one you are trying to solve.

## How Retry Storms Happen

Consider a simple chain: Frontend -> API -> Database Service.

If the Database Service has a brief hiccup and returns 503 for a few seconds, here is what happens with aggressive retries:

```
Frontend retries 5 times per request
  -> API retries 5 times per request to Database
    -> Each frontend request generates up to 25 database requests
```

If 100 users are hitting the frontend simultaneously, the Database Service sees up to 2,500 requests instead of 100. That brief hiccup just became a full outage because the service is now drowning in retry traffic.

## Find Excessive Retry Configuration

Audit your current retry settings:

```bash
kubectl get virtualservice -A -o json | jq -r '
  .items[] |
  .metadata.namespace + "/" + .metadata.name + ": " +
  (.spec.http[]? | select(.retries) | "attempts=" + (.retries.attempts | tostring) + " retryOn=" + (.retries.retryOn // "default"))
'
```

Red flags to look for:
- `attempts` greater than 3
- `retryOn` that includes `5xx` (too broad)
- No `perTryTimeout` set
- No overall `timeout` set
- Retry configuration at multiple levels of a call chain

## Set Sensible Retry Defaults

For most services, 2-3 retry attempts is the sweet spot:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-server
  namespace: production
spec:
  hosts:
    - api-server
  http:
    - route:
        - destination:
            host: api-server
      retries:
        attempts: 2
        perTryTimeout: 3s
        retryOn: connect-failure,refused-stream,unavailable,cancelled,retriable-status-codes
      timeout: 10s
```

Important settings:

- `attempts: 2` means one retry after the initial attempt fails (total of 2 tries)
- `perTryTimeout: 3s` prevents a single retry from hanging
- `timeout: 10s` puts an absolute cap on total time including retries
- `retryOn` should be specific about which failures to retry

## Choose retryOn Conditions Carefully

The `retryOn` field determines which failures trigger a retry. Using `5xx` is almost always too broad:

```yaml
# BAD: Retries all 5xx errors
retries:
  attempts: 3
  retryOn: 5xx
```

A 500 Internal Server Error usually means the request is bad and retrying will not help. A 503 Service Unavailable might be temporary, but a 501 Not Implemented never will be.

Be specific:

```yaml
# GOOD: Only retry transient failures
retries:
  attempts: 2
  retryOn: connect-failure,refused-stream,unavailable,cancelled,retriable-status-codes
```

Valid retry conditions include:
- `connect-failure` - TCP connection failed
- `refused-stream` - server returned REFUSED_STREAM
- `unavailable` - gRPC UNAVAILABLE status
- `cancelled` - gRPC CANCELLED status
- `gateway-error` - 502, 503, 504 responses
- `retriable-status-codes` - status codes listed in `x-envoy-retriable-status-codes` header

## Always Set Timeouts with Retries

Retries without timeouts are dangerous. If a service is slow (not failing), retries add more load to an already struggling service:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: slow-service
spec:
  hosts:
    - slow-service
  http:
    - route:
        - destination:
            host: slow-service
      retries:
        attempts: 2
        perTryTimeout: 5s
      timeout: 12s
```

The math works like this:
- First attempt: up to 5 seconds
- Second attempt: up to 5 seconds
- Total timeout: 12 seconds (leaves a 2 second buffer)

If `timeout` is less than `attempts * perTryTimeout`, the overall timeout will cut off retries early, which is actually fine. It means the system fails fast rather than hanging.

## Use Circuit Breakers with Retries

Circuit breakers are the complement to retries. They stop sending traffic to a failing service entirely, instead of hammering it with retries:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: api-server
  namespace: production
spec:
  host: api-server
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
    connectionPool:
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 500
        maxRetries: 3
```

Key settings:

- `consecutive5xxErrors: 3` - eject a pod after 3 consecutive errors
- `interval: 10s` - check every 10 seconds
- `baseEjectionTime: 30s` - keep the pod ejected for at least 30 seconds
- `maxEjectionPercent: 50` - never eject more than half the pods
- `maxRetries: 3` - limit concurrent retries across the connection pool

The `maxRetries` in the connection pool is different from VirtualService retries. It limits the total number of in-flight retries to a destination, acting as a global retry budget.

## Handle Retry Amplification in Deep Call Chains

For services that are deep in a call chain, reduce or disable retries:

```yaml
# Service at the edge (frontend) - can retry
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: frontend
spec:
  hosts:
    - frontend
  http:
    - route:
        - destination:
            host: api-server
      retries:
        attempts: 3
        perTryTimeout: 5s

---
# Service in the middle (API) - minimal retries
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-server
spec:
  hosts:
    - api-server
  http:
    - route:
        - destination:
            host: database-service
      retries:
        attempts: 2
        perTryTimeout: 2s

---
# Service at the bottom (Database) - no Istio retries
# Let the database client handle retries instead
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: database-service
spec:
  hosts:
    - database-service
  http:
    - route:
        - destination:
            host: database-service
      retries:
        attempts: 0
```

The general rule is: retry at the edge, not at every level.

## Monitor Retry Behavior

Track retry metrics to understand what is happening in your mesh:

```bash
# Check for high retry rates
curl -s "http://localhost:9090/api/v1/query?query=sum(rate(istio_requests_total{response_flags=~'.*RR.*'}[5m])) by (destination_service)" | jq '.data.result'
```

Response flags that indicate retries:
- `URX` - upstream request retry limit exceeded
- `UPE` - upstream protocol error (may trigger retries)

Set up alerts for excessive retries:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: retry-alerts
spec:
  groups:
    - name: istio-retries
      rules:
        - alert: HighRetryRate
          expr: |
            sum(rate(istio_requests_total{response_flags=~".*RR.*|.*URX.*"}[5m])) by (destination_service)
            /
            sum(rate(istio_requests_total[5m])) by (destination_service)
            > 0.1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High retry rate to {{ $labels.destination_service }}"
```

## Test Retry Behavior Under Failure

Use fault injection to simulate failures and observe retry behavior:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-server-fault-test
spec:
  hosts:
    - api-server
  http:
    - fault:
        abort:
          httpStatus: 503
          percentage:
            value: 50
      route:
        - destination:
            host: api-server
      retries:
        attempts: 2
        retryOn: gateway-error
```

Monitor the actual request amplification during this test. If your downstream services see a massive spike in traffic, your retry configuration needs tightening.

Retries are a tool, not a solution. They handle transient failures gracefully but make persistent failures worse. Pair them with circuit breakers, use them sparingly in deep call chains, and always set timeouts. When in doubt, fewer retries is better than more.
