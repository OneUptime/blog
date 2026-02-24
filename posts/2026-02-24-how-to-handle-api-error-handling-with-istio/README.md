# How to Handle API Error Handling with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Error Handling, Retries, Circuit Breaking, Service Mesh

Description: Practical techniques for handling API errors in Istio, including automatic retries, circuit breaking, timeout configuration, and custom error responses.

---

When your microservices start failing, the way those failures propagate through your system determines whether you get a minor hiccup or a cascading meltdown. Istio sits between every service call, which makes it the perfect place to handle errors consistently across your entire mesh.

## Automatic Retries

The most basic error handling strategy is retrying failed requests. Istio lets you configure retries in a VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-api
  namespace: default
spec:
  hosts:
  - my-api
  http:
  - route:
    - destination:
        host: my-api
        port:
          number: 8080
    retries:
      attempts: 3
      perTryTimeout: 2s
      retryOn: 5xx,reset,connect-failure,retriable-4xx,refused-stream
```

The `retryOn` field specifies which conditions trigger a retry. The options include:

- `5xx` - Retry on 5xx server errors
- `reset` - Retry when the connection is reset
- `connect-failure` - Retry when the connection fails
- `retriable-4xx` - Retry on 409 responses
- `refused-stream` - Retry when the upstream refuses the stream
- `gateway-error` - Retry on 502, 503, and 504
- `retriable-status-codes` - Retry on specific status codes

Be careful with retries on non-idempotent operations. You probably do not want to retry a POST that creates a payment.

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-api
  namespace: default
spec:
  hosts:
  - my-api
  http:
  - match:
    - method:
        exact: GET
    route:
    - destination:
        host: my-api
    retries:
      attempts: 3
      perTryTimeout: 2s
      retryOn: 5xx,connect-failure,reset
  - match:
    - method:
        exact: POST
    route:
    - destination:
        host: my-api
    retries:
      attempts: 1
      retryOn: connect-failure,reset
```

This retries GET requests up to 3 times on server errors but only retries POST requests once and only on connection failures.

## Timeouts

Timeouts prevent slow services from holding connections open indefinitely:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-api
  namespace: default
spec:
  hosts:
  - my-api
  http:
  - route:
    - destination:
        host: my-api
        port:
          number: 8080
    timeout: 10s
    retries:
      attempts: 3
      perTryTimeout: 3s
```

The `timeout` is the total time allowed for all attempts, including retries. The `perTryTimeout` is the max time for each individual attempt. With the config above, each try gets 3 seconds, and the total budget is 10 seconds. If the first two tries each take 3 seconds, the third try only gets 4 seconds.

## Circuit Breaking

Circuit breaking stops your services from hammering a failing backend:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-api
  namespace: default
spec:
  host: my-api
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
        maxRequestsPerConnection: 10
        maxRetries: 3
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
      minHealthPercent: 30
```

The `outlierDetection` section is the circuit breaker configuration:

- `consecutive5xxErrors: 5` - Eject a pod after 5 consecutive 5xx errors
- `interval: 30s` - Check for errors every 30 seconds
- `baseEjectionTime: 30s` - Keep the pod ejected for at least 30 seconds
- `maxEjectionPercent: 50` - Never eject more than 50% of pods
- `minHealthPercent: 30` - Only apply outlier detection if at least 30% of pods are healthy

The `connectionPool` settings also act as a form of circuit breaking by limiting concurrent connections and pending requests.

## Custom Error Responses with EnvoyFilter

Sometimes you want to return custom error messages instead of generic Envoy error pages:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: custom-error-responses
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-api
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_INBOUND
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
          inlineCode: |
            function envoy_on_response(response_handle)
              local status = response_handle:headers():get(":status")
              if status == "503" then
                response_handle:headers():replace("content-type", "application/json")
                response_handle:body():setBytes('{"error": "service_unavailable", "message": "The service is temporarily unavailable. Please retry in a few seconds.", "retry_after": 5}')
              elseif status == "429" then
                response_handle:headers():replace("content-type", "application/json")
                response_handle:body():setBytes('{"error": "rate_limited", "message": "You have exceeded the rate limit. Please slow down."}')
              elseif status == "504" then
                response_handle:headers():replace("content-type", "application/json")
                response_handle:body():setBytes('{"error": "gateway_timeout", "message": "The request timed out. The upstream service took too long to respond."}')
              end
            end
```

## Fault Injection for Testing

Before you deploy error handling logic, you should test it. Istio can inject faults into your traffic:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-api
  namespace: default
spec:
  hosts:
  - my-api
  http:
  - fault:
      abort:
        httpStatus: 503
        percentage:
          value: 10
      delay:
        fixedDelay: 5s
        percentage:
          value: 20
    route:
    - destination:
        host: my-api
        port:
          number: 8080
```

This injects 503 errors on 10% of requests and a 5-second delay on 20% of requests. Use this to verify that your retry logic, circuit breakers, and timeout configurations work as expected.

## Handling Specific Error Scenarios

### Retry Budget

Retries can amplify traffic during outages. Limit the total retry budget:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-api
  namespace: default
spec:
  hosts:
  - my-api
  http:
  - route:
    - destination:
        host: my-api
    retries:
      attempts: 3
      retryOn: 5xx
      retryRemoteLocalities: true
```

The `retryRemoteLocalities` option tells Istio to try the retry on a different locality (zone or region) if available. This is useful when an entire zone is having problems.

### Connection Draining

When pods are shutting down, in-flight requests need to complete gracefully:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-api
  namespace: default
spec:
  host: my-api
  trafficPolicy:
    connectionPool:
      tcp:
        connectTimeout: 10s
      http:
        idleTimeout: 60s
```

The `idleTimeout` prevents the proxy from holding connections open to pods that are no longer serving traffic.

## Monitoring Error Handling

Track how your error handling is performing:

```bash
# Check retry stats
kubectl exec <pod-name> -c istio-proxy -- \
  curl -s localhost:15000/stats | grep retry

# Check circuit breaker stats
kubectl exec <pod-name> -c istio-proxy -- \
  curl -s localhost:15000/stats | grep outlier

# Check timeout stats
kubectl exec <pod-name> -c istio-proxy -- \
  curl -s localhost:15000/stats | grep timeout
```

Key metrics to watch in Prometheus:

```promql
# Retry rate
sum(rate(envoy_cluster_retry_upstream_rq{cluster_name="outbound|8080||my-api.default.svc.cluster.local"}[5m]))

# Circuit breaker ejections
sum(rate(envoy_cluster_outlier_detection_ejections_total{cluster_name="outbound|8080||my-api.default.svc.cluster.local"}[5m]))
```

## Best Practices

Set timeouts on every service call. Unset timeouts default to 15 seconds in Istio, which might be too long or too short for your needs. Configure retries only for idempotent operations. Use circuit breaking on every DestinationRule. Set your `maxEjectionPercent` thoughtfully so you do not accidentally eject all your backends. And always test your error handling with fault injection before relying on it in production.

Error handling in a service mesh is about layering defenses. Timeouts catch slow responses, retries handle transient failures, and circuit breakers prevent cascade failures. Together, they make your API much more resilient than any single technique alone.
