# How to Configure Port-Level Traffic Policies in DestinationRule

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, DestinationRule, Port-Level Settings, Traffic Policy, Kubernetes

Description: Configure different traffic policies per port in Istio DestinationRule for services that expose multiple ports with different needs.

---

Many services expose more than one port. A typical example is a service with an HTTP API on port 8080 and a gRPC endpoint on port 9090. Or a service with a public API on one port and an admin/metrics endpoint on another. Each port might need different traffic policies - different connection limits, different load balancing, or different TLS settings.

Istio's DestinationRule supports port-level traffic policy overrides through the `portLevelSettings` field. This lets you define a default traffic policy for the service and then override specific settings for individual ports.

## How portLevelSettings Works

Port-level settings are defined within the `trafficPolicy` section. They override the top-level traffic policy for a specific port:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: multi-port-service
spec:
  host: my-service
  trafficPolicy:
    loadBalancer:
      simple: ROUND_ROBIN
    connectionPool:
      tcp:
        maxConnections: 100
    portLevelSettings:
    - port:
        number: 8080
      loadBalancer:
        simple: LEAST_REQUEST
      connectionPool:
        tcp:
          maxConnections: 200
        http:
          http1MaxPendingRequests: 50
    - port:
        number: 9090
      loadBalancer:
        simple: ROUND_ROBIN
      connectionPool:
        tcp:
          maxConnections: 50
```

In this example:
- Port 8080 uses LEAST_REQUEST load balancing with 200 max connections
- Port 9090 uses ROUND_ROBIN with 50 max connections
- Any other port uses the top-level defaults (ROUND_ROBIN, 100 max connections)

## Real-World Example: HTTP + gRPC Service

A common pattern is a service that exposes both HTTP REST and gRPC endpoints:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-service
spec:
  selector:
    app: api-service
  ports:
  - name: http
    port: 8080
    targetPort: 8080
  - name: grpc
    port: 9090
    targetPort: 9090
```

HTTP and gRPC have different connection characteristics. HTTP/1.1 uses one request per connection, while gRPC uses HTTP/2 with multiplexing. The traffic policies should reflect this:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: api-service-dr
spec:
  host: api-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
    portLevelSettings:
    - port:
        number: 8080
      connectionPool:
        tcp:
          maxConnections: 200
          connectTimeout: 3s
        http:
          http1MaxPendingRequests: 100
          maxRequestsPerConnection: 50
    - port:
        number: 9090
      connectionPool:
        tcp:
          maxConnections: 50
          connectTimeout: 3s
        http:
          http2MaxRequests: 500
          maxRetries: 5
```

The HTTP port gets more TCP connections (since each handles one request at a time) and cycles connections after 50 requests. The gRPC port gets fewer TCP connections but allows 500 concurrent HTTP/2 requests multiplexed over those connections.

## TLS Settings Per Port

Different ports might need different TLS configurations. For example, an internal plaintext port and an external encrypted port:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: mixed-tls-service
spec:
  host: my-service
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
    portLevelSettings:
    - port:
        number: 8080
      tls:
        mode: ISTIO_MUTUAL
    - port:
        number: 15021
      tls:
        mode: DISABLE
```

Port 8080 uses Istio mTLS while port 15021 (maybe a health check port) has TLS disabled.

## Port-Level Settings Within Subsets

You can also use port-level settings inside subset-specific traffic policies:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: versioned-multi-port
spec:
  host: my-service
  subsets:
  - name: v1
    labels:
      version: v1
    trafficPolicy:
      portLevelSettings:
      - port:
          number: 8080
        connectionPool:
          tcp:
            maxConnections: 200
      - port:
          number: 9090
        connectionPool:
          tcp:
            maxConnections: 100
  - name: v2
    labels:
      version: v2
    trafficPolicy:
      portLevelSettings:
      - port:
          number: 8080
        connectionPool:
          tcp:
            maxConnections: 50
      - port:
          number: 9090
        connectionPool:
          tcp:
            maxConnections: 25
```

Version v1 gets larger connection pools while v2 (canary) gets tighter limits on both ports.

## Load Balancing Per Port

Maybe your HTTP endpoint benefits from consistent hashing (for caching), while your gRPC endpoint works better with least request:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: lb-per-port
spec:
  host: my-service
  trafficPolicy:
    portLevelSettings:
    - port:
        number: 8080
      loadBalancer:
        consistentHash:
          httpHeaderName: x-cache-key
    - port:
        number: 9090
      loadBalancer:
        simple: LEAST_REQUEST
```

HTTP requests get routed based on a cache key header (same key always hits the same pod). gRPC requests get routed to the pod with the fewest active requests.

## Verifying Port-Level Configuration

Check that Envoy has the correct per-port configuration:

```bash
# Check cluster for port 8080
istioctl proxy-config cluster <pod-name> \
  --port 8080 --fqdn my-service.default.svc.cluster.local -o json

# Check cluster for port 9090
istioctl proxy-config cluster <pod-name> \
  --port 9090 --fqdn my-service.default.svc.cluster.local -o json
```

Each port should show its own traffic policy settings. Compare the `lbPolicy`, `circuitBreakers`, and `outlierDetection` fields between the two.

You should see separate cluster entries like:
```
outbound|8080||my-service.default.svc.cluster.local
outbound|9090||my-service.default.svc.cluster.local
```

## Outlier Detection Per Port

Note that `outlierDetection` is applied at the cluster level in Envoy, and each port creates a separate cluster. So if you set outlier detection at the top level:

```yaml
trafficPolicy:
  outlierDetection:
    consecutive5xxErrors: 5
    interval: 10s
    baseEjectionTime: 30s
```

It applies to both port 8080 and port 9090 independently. A pod that fails on port 8080 might be ejected from the 8080 pool but still serve 9090 traffic normally.

If you want different outlier detection per port:

```yaml
trafficPolicy:
  portLevelSettings:
  - port:
      number: 8080
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 5s
      baseEjectionTime: 60s
  - port:
      number: 9090
    outlierDetection:
      consecutive5xxErrors: 10
      interval: 30s
      baseEjectionTime: 15s
```

The HTTP port has aggressive outlier detection (eject after 3 errors). The gRPC port is more tolerant (eject after 10 errors) because gRPC errors might be more transient.

## Common Mistakes

**Wrong port number**: The port number in `portLevelSettings` must match the port number in the Kubernetes Service, not the targetPort:

```yaml
# If your service has:
# ports:
# - port: 8080
#   targetPort: 80

# Use the service port (8080), not the target port (80):
portLevelSettings:
- port:
    number: 8080  # Correct
```

**Missing port name**: Istio works best when your service ports are named with a protocol prefix (http-, grpc-, tcp-). Without named ports, Istio might not apply some traffic policies correctly.

## Cleanup

```bash
kubectl delete destinationrule api-service-dr
```

Port-level traffic policies give you the granularity to tune each endpoint of a multi-port service independently. Use different connection pool sizes for HTTP vs gRPC, different TLS settings for internal vs external ports, and different load balancing algorithms based on each port's traffic patterns.
