# How to Apply Traffic Policies to External Services with ServiceEntry

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ServiceEntry, Traffic Policy, DestinationRule, Kubernetes, Service Mesh

Description: Apply Istio traffic policies like circuit breaking, connection pooling, and load balancing to external services registered with ServiceEntry.

---

One of the biggest advantages of registering external services with ServiceEntry is that you can then apply the same traffic policies you use for internal services. Circuit breaking, connection pooling, load balancing algorithms, outlier detection - all of these work on external services once they are in Istio's service registry.

Without traffic policies, your application has to handle all the resilience logic itself. Every service needs its own retry logic, circuit breaker implementation, and connection pool management. That is a lot of duplicated code across microservices. With Istio, you define these policies once at the mesh level and every workload benefits.

## Traffic Policies Through DestinationRule

Traffic policies for external services are configured using DestinationRule resources. The DestinationRule references the same host as your ServiceEntry:

```yaml
# First, the ServiceEntry
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: payment-api
spec:
  hosts:
    - api.payment-provider.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
---
# Then, the DestinationRule with traffic policy
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-api-policy
spec:
  host: api.payment-provider.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 5s
      http:
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 60s
```

The `host` field in the DestinationRule must match a host in the ServiceEntry. Once connected, every Envoy proxy that sends traffic to `api.payment-provider.com` applies these policies.

## Connection Pool Settings

Connection pooling prevents your workloads from overwhelming external services. This is especially important for rate-limited APIs.

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: rate-limited-api
spec:
  host: api.rate-limited-service.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
        connectTimeout: 10s
      http:
        h2UpgradePolicy: DO_NOT_UPGRADE
        maxRequestsPerConnection: 5
        maxPendingRequests: 100
        maxRetries: 3
```

What each setting does:

- **maxConnections** - Maximum TCP connections to the external service. Excess connections queue up.
- **connectTimeout** - How long to wait for a TCP connection to establish.
- **maxRequestsPerConnection** - Close the connection after this many requests. Useful for services that do not handle long-lived connections well.
- **maxPendingRequests** - How many requests can wait in queue when all connections are busy. Requests beyond this get a 503.
- **maxRetries** - Maximum number of concurrent retries across all connections.
- **h2UpgradePolicy** - Whether to upgrade HTTP/1.1 connections to HTTP/2. Set to DO_NOT_UPGRADE for APIs that do not support HTTP/2.

## Circuit Breaking with Outlier Detection

Outlier detection is Istio's circuit breaker. When an endpoint starts failing, Envoy ejects it from the load balancing pool temporarily:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: circuit-breaker
spec:
  host: api.flaky-service.com
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 100
      minHealthPercent: 0
```

How this works:
1. If an endpoint returns 3 consecutive 5xx errors within a 10-second window, it gets ejected
2. The ejected endpoint stays out for 30 seconds
3. After 30 seconds, Envoy lets it back in and monitors it again
4. If it keeps failing, the ejection time increases (30s, 60s, 90s, etc.)

The `maxEjectionPercent: 100` allows ejecting all endpoints. For external services with a single endpoint (resolved through DNS to one IP), you need this or the circuit breaker never triggers.

## Load Balancing Algorithms

By default, Envoy uses round-robin load balancing. You can change this for external services with multiple endpoints:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: lb-policy
spec:
  host: api.multi-region-service.com
  trafficPolicy:
    loadBalancer:
      simple: LEAST_REQUEST
```

Available algorithms:
- **ROUND_ROBIN** - Default. Cycles through endpoints.
- **LEAST_REQUEST** - Sends to the endpoint with the fewest active requests.
- **RANDOM** - Picks a random endpoint.
- **PASSTHROUGH** - Sends directly to the address requested by the caller.

For external services, `LEAST_REQUEST` is often a good choice because it naturally avoids overloading slow endpoints.

## Consistent Hashing for Sticky Sessions

Some external APIs work better with sticky sessions (same client always hits the same endpoint). Use consistent hash load balancing:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: sticky-sessions
spec:
  host: api.stateful-service.com
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpHeaderName: x-user-id
```

This routes all requests with the same `x-user-id` header to the same backend endpoint. Other options for the hash key include:

```yaml
# Hash based on source IP
loadBalancer:
  consistentHash:
    useSourceIp: true

# Hash based on cookie
loadBalancer:
  consistentHash:
    httpCookie:
      name: session-id
      ttl: 3600s
```

## Port-Level Traffic Policies

If your ServiceEntry defines multiple ports, you can set different policies per port:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: per-port-policy
spec:
  host: api.multi-port-service.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
    portLevelSettings:
      - port:
          number: 443
        connectionPool:
          tcp:
            maxConnections: 200
          http:
            maxRequestsPerConnection: 20
        tls:
          mode: SIMPLE
      - port:
          number: 8443
        connectionPool:
          tcp:
            maxConnections: 50
        tls:
          mode: SIMPLE
```

Port-level settings override the top-level traffic policy for that specific port.

## Combining Multiple Policies

In practice, you often combine connection pools, circuit breaking, load balancing, and TLS settings together:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: comprehensive-policy
spec:
  host: api.critical-service.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
        connectTimeout: 5s
      http:
        maxRequestsPerConnection: 100
        maxPendingRequests: 50
        maxRetries: 5
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 60s
      maxEjectionPercent: 50
    loadBalancer:
      simple: LEAST_REQUEST
    tls:
      mode: SIMPLE
      sni: api.critical-service.com
```

## Verifying Traffic Policies

Check that your policies are applied in Envoy:

```bash
# View cluster configuration with policies
istioctl proxy-config cluster deploy/my-app \
  --fqdn "outbound|443||api.payment-provider.com" -o json
```

Look for the `circuitBreakers`, `connectionPool`, and `loadBalancingPolicy` sections in the output.

You can also test circuit breaking by sending traffic and watching for 503 responses:

```bash
# Generate some traffic
for i in $(seq 1 100); do
  kubectl exec deploy/my-app -- curl -s -o /dev/null -w "%{http_code}\n" \
    https://api.payment-provider.com/health
done
```

If the circuit breaker triggers, you start seeing 503 responses.

## Monitoring Traffic Policies

Prometheus metrics track circuit breaker and connection pool behavior:

```bash
# Circuit breaker ejections
envoy_cluster_outlier_detection_ejections_active{cluster_name="outbound|443||api.payment-provider.com"}

# Connection pool overflow (requests rejected)
envoy_cluster_upstream_rq_pending_overflow{cluster_name="outbound|443||api.payment-provider.com"}

# Connection pool active connections
envoy_cluster_upstream_cx_active{cluster_name="outbound|443||api.payment-provider.com"}
```

These metrics tell you if your policies are too aggressive (too many rejections) or too lenient (no protection during failures).

Traffic policies make external service calls resilient without changing application code. Start with connection pool limits to prevent overloading external APIs, add outlier detection for automatic failure recovery, and tune from there based on your actual traffic patterns.
