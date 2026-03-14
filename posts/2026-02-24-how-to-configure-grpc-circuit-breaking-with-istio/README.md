# How to Configure gRPC Circuit Breaking with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, gRPC, Circuit Breaking, Kubernetes, Resilience, Envoy

Description: Set up circuit breaking for gRPC services in Istio using DestinationRule resources to prevent cascading failures and protect your microservices.

---

Circuit breaking is a pattern that stops sending traffic to a backend that is already struggling. The idea comes from electrical circuits: when too much current flows, the breaker trips and cuts the circuit to prevent damage. In microservices, if a backend is returning errors or responding slowly, a circuit breaker stops sending new requests so the backend can recover instead of getting overwhelmed.

Istio implements circuit breaking through Envoy's connection pool limits and outlier detection. For gRPC services, this works particularly well because Envoy understands HTTP/2 and can track request-level metrics.

## Connection Pool Circuit Breaking

The first type of circuit breaking in Istio is connection pool limits. These define hard caps on the number of connections and requests to an upstream:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: grpc-backend-cb
  namespace: default
spec:
  host: grpc-backend.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: UPGRADE
        maxRequestsPerConnection: 0
        maxRetries: 10
```

For gRPC (HTTP/2), the relevant settings are:

- `tcp.maxConnections` - maximum number of TCP connections to the upstream cluster. Since HTTP/2 multiplexes requests over fewer connections, you do not need as many as HTTP/1.1.
- `http.maxRequestsPerConnection` - set to 0 for unlimited (the default for HTTP/2).
- `http.maxRetries` - maximum number of concurrent retries across all hosts in the cluster. This prevents retry storms.

When these limits are hit, Envoy returns an `UNAVAILABLE` gRPC status code to the caller immediately rather than queuing the request. This is the "tripping" of the circuit breaker.

## Outlier Detection

The second, and arguably more useful, type of circuit breaking is outlier detection. This watches for failing endpoints and temporarily removes them from the load balancing pool:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: grpc-backend-outlier
  namespace: default
spec:
  host: grpc-backend.default.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

Here is what each field does:

- `consecutive5xxErrors: 5` - eject an endpoint after 5 consecutive errors. For gRPC, this maps to status codes like `INTERNAL`, `UNAVAILABLE`, and `UNKNOWN`.
- `interval: 10s` - how often Envoy checks for outliers.
- `baseEjectionTime: 30s` - how long an ejected endpoint stays out of the pool. This increases with each ejection (30s, 60s, 90s, etc.).
- `maxEjectionPercent: 50` - never eject more than 50% of endpoints. This prevents ejecting all backends during a widespread issue.

## gRPC-Specific Error Mapping

It is worth understanding how gRPC status codes map to what Envoy considers an error. By default, Envoy counts these gRPC codes as errors for outlier detection:

- `CANCELLED` (1)
- `UNKNOWN` (2)
- `RESOURCE_EXHAUSTED` (8)
- `UNAVAILABLE` (14)
- `INTERNAL` (13)

Status codes like `NOT_FOUND`, `INVALID_ARGUMENT`, and `PERMISSION_DENIED` are not considered errors for outlier detection. This makes sense because a 404 is not a sign that the server is unhealthy.

## A Production-Ready Configuration

Here is a complete configuration that combines connection pool limits and outlier detection:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
  namespace: default
spec:
  host: payment-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
        connectTimeout: 5s
      http:
        h2UpgradePolicy: UPGRADE
        maxRequestsPerConnection: 0
        maxRetries: 15
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 5s
      baseEjectionTime: 30s
      maxEjectionPercent: 40
    loadBalancer:
      simple: LEAST_REQUEST
```

This configuration:
1. Limits TCP connections to 50 per host
2. Allows unlimited requests per HTTP/2 connection
3. Caps concurrent retries at 15 across the cluster
4. Ejects a pod after 3 consecutive errors
5. Checks for outliers every 5 seconds
6. Keeps ejected pods out for at least 30 seconds
7. Never ejects more than 40% of the pool

## Per-Subset Circuit Breaking

If you have multiple versions of a service, you can apply different circuit breaking rules per subset:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: grpc-backend-subsets
  namespace: default
spec:
  host: grpc-backend.default.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
  subsets:
    - name: v1
      labels:
        version: v1
      trafficPolicy:
        outlierDetection:
          consecutive5xxErrors: 3
          interval: 5s
          baseEjectionTime: 60s
    - name: v2
      labels:
        version: v2
```

Subset-level traffic policies override the top-level ones. In this example, v1 has stricter outlier detection (3 errors, checked every 5s) while v2 inherits the default (5 errors, checked every 10s).

## Monitoring Circuit Breaker State

You can check if the circuit breaker has tripped by looking at Envoy stats:

```bash
# Check for overflow (circuit breaker tripped) events
kubectl exec -it <client-pod> -c istio-proxy -- \
  pilot-agent request GET stats | grep "upstream_rq_pending_overflow"

# Check outlier detection ejections
kubectl exec -it <client-pod> -c istio-proxy -- \
  pilot-agent request GET stats | grep "outlier_detection"
```

Key metrics to watch:
- `upstream_rq_pending_overflow` - requests rejected because the connection pool is full
- `upstream_rq_retry_overflow` - retries rejected because the retry budget is exhausted
- `outlier_detection.ejections_active` - number of currently ejected endpoints
- `outlier_detection.ejections_total` - total ejections since the proxy started

## Testing Circuit Breaking

You can test circuit breaking by deploying a faulty version of your service. Here is a quick way using a simple gRPC server that returns errors:

```bash
# Scale to 3 replicas
kubectl scale deployment grpc-backend --replicas=3

# Mark one pod to return errors (assuming your app supports a failure mode)
kubectl exec -it grpc-backend-pod-xyz -- /bin/sh -c "touch /tmp/fail"
```

Then send traffic and watch the outlier detection kick in:

```bash
# Watch ejection events
kubectl exec -it <client-pod> -c istio-proxy -- \
  pilot-agent request GET stats | grep "outlier_detection.ejections"
```

You should see the failing pod get ejected after the configured number of consecutive errors.

## Common Mistakes

**Setting maxEjectionPercent too high.** If you set it to 100% and all your pods start failing, Envoy ejects everything and you have no backends at all. Keep it at 50% or lower.

**Not having enough replicas.** Circuit breaking works best when you have multiple backend pods. With only one pod, ejecting it means zero capacity. Aim for at least 3 replicas for any service with circuit breaking.

**Confusing connection pool limits with outlier detection.** Connection pool limits are static thresholds (hard caps). Outlier detection is dynamic (reacts to actual errors). You usually want both.

**Forgetting about the ejection time multiplier.** Each subsequent ejection increases the ejection time. The first time a pod is ejected for 30s, the second time for 60s, and so on. This is by design but can surprise you if a pod keeps flapping.

Circuit breaking is one of the most important resilience patterns for gRPC services in a service mesh. Getting it right means your services degrade gracefully instead of cascading failures across your entire system.
