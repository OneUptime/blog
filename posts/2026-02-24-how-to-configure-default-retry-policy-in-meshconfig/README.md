# How to Configure Default Retry Policy in MeshConfig

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Retry Policy, MeshConfig, Resilience, Traffic Management

Description: Learn how to set up default retry policies in Istio MeshConfig to automatically retry failed requests across your entire mesh without per-service configuration.

---

Retries are a basic resilience pattern. When a request fails due to a transient error - a network blip, a pod restarting, a brief overload - retrying the request often succeeds. Istio can handle retries at the proxy level, so your application does not need to implement retry logic. MeshConfig lets you set a default retry policy that applies to all services in the mesh, giving you a baseline level of resilience without any per-service configuration.

## Default Retry Behavior

Out of the box, Istio retries failed requests twice (for a total of 3 attempts including the original). It retries on specific conditions like connection failures and certain 5xx responses. The default per-retry timeout is 25 seconds.

You can verify the current retry behavior on any proxy:

```bash
istioctl proxy-config routes deploy/sleep -n sample -o json | \
  grep -A10 "retryPolicy"
```

## Setting a Mesh-Wide Default Retry Policy

Configure the default retry policy in MeshConfig:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultHttpRetryPolicy:
      attempts: 3
      perTryTimeout: 2s
      retryOn: connect-failure,refused-stream,unavailable,cancelled,retriable-status-codes
      retryRemoteLocalities: true
```

Apply it:

```bash
istioctl install -f retry-config.yaml
```

This configuration tells every sidecar in the mesh to retry failed HTTP requests up to 3 times, with a 2-second timeout for each attempt.

## Understanding Retry Configuration Options

### attempts

The maximum number of retry attempts. If set to 3, Istio makes up to 3 additional attempts after the original request fails (4 total attempts). Keep this number reasonable - too many retries can amplify load during outages.

### perTryTimeout

How long to wait for each individual retry attempt. If the upstream does not respond within this time, the attempt is considered failed and the next retry begins. Set this based on your service's expected response time. If your service normally responds in 200ms, a perTryTimeout of 2s gives plenty of headroom.

### retryOn

A comma-separated list of conditions that trigger a retry. Common values:

- `connect-failure` - TCP connection failure
- `refused-stream` - Upstream refused the stream (HTTP/2 RST_STREAM)
- `unavailable` - gRPC status UNAVAILABLE
- `cancelled` - gRPC status CANCELLED
- `retriable-status-codes` - Retry on specific HTTP status codes (requires retryRemoteLocalities or a VirtualService to specify which codes)
- `5xx` - Retry on any 5xx response
- `gateway-error` - Retry on 502, 503, 504
- `reset` - Connection reset
- `retriable-4xx` - Retry on 409 responses
- `retriable-headers` - Retry based on response headers

### retryRemoteLocalities

When set to true, retries can be sent to endpoints in different localities (zones/regions). This improves success rates because a failure in one zone might succeed in another.

## Overriding Defaults Per Service

The mesh-wide default is a baseline. You can override it for specific services using VirtualService:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-service-vs
  namespace: default
spec:
  hosts:
    - payment-service
  http:
    - route:
        - destination:
            host: payment-service
      retries:
        attempts: 5
        perTryTimeout: 5s
        retryOn: gateway-error,connect-failure,refused-stream
```

This gives the payment service more retries with a longer timeout, recognizing that payment operations might take longer and are worth retrying more aggressively.

### Disabling Retries for a Service

Some services should not be retried - anything that is not idempotent, for example. Disable retries through VirtualService:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: notification-service-vs
  namespace: default
spec:
  hosts:
    - notification-service
  http:
    - route:
        - destination:
            host: notification-service
      retries:
        attempts: 0
```

Setting attempts to 0 disables retries entirely for that service.

## Retry Budgets

Retries can cause problems during outages. If a service is overwhelmed and every failed request gets retried 3 times, you are tripling the load on an already struggling service. This is called retry amplification.

While Istio does not have a built-in retry budget in MeshConfig, you can mitigate retry amplification with circuit breaking:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service-dr
  namespace: default
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      http:
        maxRequestsPerConnection: 1
        maxRetries: 10
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
```

The `maxRetries` field in the connection pool limits the total number of concurrent retries to an upstream cluster. This prevents retry storms.

## Combining Retries with Timeouts

Retries interact with the overall request timeout. The total time for all retry attempts must fit within the request timeout:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service-vs
spec:
  hosts:
    - my-service
  http:
    - route:
        - destination:
            host: my-service
      timeout: 10s
      retries:
        attempts: 3
        perTryTimeout: 3s
```

With 3 retry attempts and a 3-second per-try timeout, the retries could take up to 9 seconds (3 x 3). The overall timeout is 10 seconds, so there is just enough room. If you set the overall timeout to 5 seconds, only 1-2 retries would have time to complete.

A good formula: `overallTimeout >= attempts * perTryTimeout`

## Monitoring Retries

Istio exposes metrics that show how retries are affecting your traffic:

```bash
# Check retry stats on a proxy
kubectl exec deploy/sleep -c istio-proxy -n sample -- \
  pilot-agent request GET stats | grep retry
```

Key metrics:
- `upstream_rq_retry` - Total number of retries
- `upstream_rq_retry_success` - Retries that succeeded
- `upstream_rq_retry_overflow` - Retries that were not attempted because the retry limit was reached
- `upstream_rq_retry_limit_exceeded` - Requests that exhausted all retry attempts

In Prometheus:

```text
# Retry rate
sum(rate(envoy_cluster_upstream_rq_retry{cluster_name="outbound|8080||my-service.default.svc.cluster.local"}[5m]))

# Retry success rate
sum(rate(envoy_cluster_upstream_rq_retry_success{}[5m])) / sum(rate(envoy_cluster_upstream_rq_retry{}[5m]))
```

If the retry success rate is low, it means the failures are not transient and retrying is just wasting resources. Consider adjusting the retryOn conditions or reducing the attempt count.

## Best Practices

1. Set a conservative mesh-wide default (2-3 attempts, 2s per-try timeout)
2. Only retry on transient errors (connect-failure, refused-stream), not on all 5xx
3. Enable retryRemoteLocalities for better cross-zone resilience
4. Disable retries on non-idempotent operations
5. Combine retries with circuit breaking to prevent retry storms
6. Monitor retry metrics to make sure retries are actually helping
7. Make sure the overall timeout accommodates the retry budget

Default retry policies in MeshConfig give your entire mesh a resilience baseline. Start conservative, monitor the impact, and tune per-service as needed.
