# How to Configure Envoy Proxy Circuit Breakers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Circuit Breaker, Resilience, Kubernetes

Description: A hands-on guide to configuring Envoy proxy circuit breakers in Istio using DestinationRules, including connection pools, outlier detection, and monitoring.

---

Circuit breakers prevent cascading failures in microservices. When a downstream service starts failing, the circuit breaker trips and stops sending traffic to it, giving it time to recover instead of piling on more requests. In Istio, circuit breaking is handled by Envoy proxy and configured through DestinationRules.

## Two Types of Circuit Breaking in Istio

Istio gives you two different mechanisms that work together:

1. **Connection pool settings** - These limit the volume of connections and requests to a service. When limits are hit, additional requests are rejected immediately.
2. **Outlier detection** - This monitors individual endpoints and ejects unhealthy ones from the load balancing pool.

Both are configured in a DestinationRule resource.

## Connection Pool Circuit Breaking

Connection pool settings act as a hard cap on traffic. Once the threshold is reached, Envoy returns a 503 to the caller instead of forwarding the request.

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-service-circuit-breaker
  namespace: production
spec:
  host: payment-service.production.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 5s
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
        maxRequestsPerConnection: 10
        maxRetries: 3
```

Here's what each field does:

**tcp.maxConnections** - The maximum number of TCP connections to the destination. Once this limit is hit, new connections are queued or rejected.

**tcp.connectTimeout** - How long to wait for a TCP connection to be established before giving up.

**http.http1MaxPendingRequests** - For HTTP/1.1, this is the max number of requests that can be queued waiting for a connection. If you have 100 max connections and all are busy, up to 100 more requests can wait in the queue. Beyond that, requests get a 503.

**http.http2MaxRequests** - For HTTP/2, the max number of concurrent requests. Since HTTP/2 multiplexes requests over fewer connections, this is the main knob to turn.

**http.maxRequestsPerConnection** - After this many requests on a single connection, Envoy closes it and opens a new one. Setting this to 1 disables keep-alive.

**http.maxRetries** - The maximum number of concurrent retries happening across all requests to this service. This prevents retry storms where failed requests trigger retries that overload an already struggling service.

## Outlier Detection

Outlier detection watches individual pods behind a service and temporarily removes unhealthy ones from the pool. This is the "smart" circuit breaker - it doesn't just limit volume, it identifies and avoids problematic endpoints.

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-service-outlier
  namespace: production
spec:
  host: payment-service.production.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
      minHealthPercent: 30
```

**consecutive5xxErrors** - How many consecutive 5xx errors from an endpoint before ejecting it. Setting this to 5 means an endpoint needs to fail 5 times in a row before being removed.

**interval** - How often Envoy checks for outliers. Every 10 seconds in this example.

**baseEjectionTime** - How long an ejected endpoint stays out of the pool. This multiplies with the number of times an endpoint has been ejected. First ejection: 30s. Second: 60s. Third: 90s. And so on.

**maxEjectionPercent** - The maximum percentage of endpoints that can be ejected at once. Setting this to 50 means even if all endpoints are failing, Envoy will keep at least 50% of them in the pool. This prevents a scenario where all endpoints get ejected and traffic has nowhere to go.

**minHealthPercent** - If the percentage of healthy endpoints drops below this threshold, outlier detection is disabled and traffic is distributed across all endpoints. This is a safety net.

## Combining Both Approaches

For production services, you usually want both connection pool limits and outlier detection working together:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-service-full
  namespace: production
spec:
  host: payment-service.production.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
        connectTimeout: 3s
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 500
        maxRequestsPerConnection: 100
        maxRetries: 5
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 15s
      baseEjectionTime: 30s
      maxEjectionPercent: 40
```

## Per-Subset Circuit Breaking

If you're using subsets (for example, different versions of a service), you can configure different circuit breaker settings per subset:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: api-service
  namespace: production
spec:
  host: api-service.production.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
    trafficPolicy:
      connectionPool:
        tcp:
          maxConnections: 50
      outlierDetection:
        consecutive5xxErrors: 3
        interval: 5s
        baseEjectionTime: 60s
```

Here, v2 has stricter limits because it's a newer version and you want to be more cautious.

## Verifying Circuit Breaker Configuration

Check that your DestinationRule was applied correctly:

```bash
kubectl get destinationrule payment-service-full -n production -o yaml
```

Then verify Envoy picked it up:

```bash
istioctl proxy-config cluster <pod-name> -n production --fqdn payment-service.production.svc.cluster.local -o json
```

Look for the `circuitBreakers` and `outlierDetection` sections in the output.

## Monitoring Circuit Breaker Activity

Envoy exposes metrics that tell you when circuit breakers are tripping. These are critical for understanding if your limits are too aggressive or too lenient.

```bash
# Check if requests are being rejected due to connection pool overflow
kubectl exec -it <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep overflow

# Check outlier detection ejections
kubectl exec -it <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep outlier_detection
```

Key Prometheus metrics to watch:

- `envoy_cluster_upstream_cx_overflow` - Connections rejected because maxConnections was hit
- `envoy_cluster_upstream_rq_pending_overflow` - Requests rejected because the pending queue was full
- `envoy_cluster_upstream_rq_retry_overflow` - Retries rejected because maxRetries was hit
- `envoy_cluster_outlier_detection_ejections_active` - Number of currently ejected endpoints
- `envoy_cluster_outlier_detection_ejections_total` - Total number of ejections

If you're seeing a lot of overflow events, your limits might be too tight. If you're not seeing any, they might be so loose that they'll never actually protect you.

## Testing Circuit Breakers

You can test your circuit breakers using a tool like Fortio:

```bash
# Deploy Fortio
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/httpbin/sample-client/fortio-deploy.yaml

# Send 100 concurrent requests
kubectl exec -it deploy/fortio -c fortio -- fortio load -c 100 -qps 0 -n 200 http://payment-service.production:80/
```

With `maxConnections: 100` and `http1MaxPendingRequests: 50`, sending 100 concurrent requests should start hitting the limits. Check the Fortio output for the percentage of 503 responses.

## Practical Tips

**Start loose and tighten gradually.** It's better to have circuit breakers that trip occasionally under extreme load than ones that trip during normal traffic.

**Monitor before configuring.** Look at your current traffic patterns - peak connections, request rates, error rates - before setting limits.

**Account for retries.** If you have retries configured, each failed request generates additional requests. Make sure your connection pool limits account for retry traffic.

**Test in staging first.** Circuit breakers that are too aggressive can cause outages. Always test your settings in a non-production environment.

Circuit breakers are one of the most valuable features of a service mesh. They add a layer of protection that application code often lacks, and in Istio, they're just a DestinationRule away.
