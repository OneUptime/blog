# How to Handle Keep-Alive Connections in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Keep-Alive, Connection Management, Envoy, Kubernetes

Description: Guide to configuring TCP and HTTP keep-alive settings in Istio to manage long-lived connections and prevent resource exhaustion.

---

Keep-alive connections are a double-edged sword. On one hand, they improve performance by reusing TCP connections instead of creating new ones for every request. On the other hand, they can cause problems with load balancing, resource exhaustion, and silent connection failures. In an Istio mesh, keep-alive behavior needs to be tuned at multiple levels - the application, the Envoy proxy, and the underlying TCP stack.

If you've ever seen requests getting stuck, uneven load distribution, or mysterious connection timeouts, keep-alive misconfiguration is often the culprit.

## HTTP Keep-Alive vs TCP Keep-Alive

These are two different things, and confusing them is a common mistake.

**HTTP Keep-Alive** (also called persistent connections) means reusing the same TCP connection for multiple HTTP requests. In HTTP/1.1, this is the default behavior. The `Connection: keep-alive` header tells the server not to close the connection after responding.

**TCP Keep-Alive** is a mechanism where the operating system sends periodic probe packets on idle TCP connections to detect if the remote end is still reachable. It has nothing to do with HTTP.

In Istio, you need to think about both.

## Configuring HTTP Connection Pooling

Istio's `DestinationRule` resource controls HTTP connection pooling, which directly affects keep-alive behavior:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: reviews-pool
spec:
  host: reviews.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 1024
        http2MaxRequests: 1024
        maxRequestsPerConnection: 100
        maxRetries: 3
        idleTimeout: 3600s
      tcp:
        maxConnections: 1024
        connectTimeout: 30s
        tcpKeepalive:
          time: 7200s
          interval: 75s
          probes: 9
```

Let's break down the important fields:

### maxRequestsPerConnection

This controls how many HTTP requests are sent on a single connection before it's closed. Setting this to a reasonable number (like 100 or 1000) prevents a single connection from being used indefinitely:

```yaml
connectionPool:
  http:
    maxRequestsPerConnection: 100
```

After 100 requests, Envoy closes the connection and creates a new one. This helps with load balancing because new connections can be distributed to different backends. Without this limit, a long-lived connection might keep sending traffic to the same backend even after scaling events.

Setting it to 0 means unlimited requests per connection (the default).

### idleTimeout

The `idleTimeout` controls how long an idle HTTP connection stays open:

```yaml
connectionPool:
  http:
    idleTimeout: 300s
```

After 300 seconds with no activity, Envoy closes the connection. This prevents resource waste from idle connections piling up. The default is 1 hour.

## Configuring TCP Keep-Alive

TCP keep-alive probes detect dead connections at the network level. This is important for catching cases where the remote end crashes or the network path breaks without a proper TCP FIN/RST:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: reviews-tcp-keepalive
spec:
  host: reviews.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        tcpKeepalive:
          time: 300s
          interval: 30s
          probes: 3
```

These settings mean:
- `time: 300s` - Start sending keep-alive probes after 300 seconds of inactivity
- `interval: 30s` - Send probes every 30 seconds
- `probes: 3` - Close the connection after 3 failed probes

Without TCP keep-alive, a dead connection might sit there indefinitely until someone tries to use it and gets a timeout.

## The Load Balancing Problem

This is a classic Istio gotcha. When you have long-lived HTTP/2 connections (which gRPC uses), a single connection handles many requests through multiplexing. If `service-a` opens one HTTP/2 connection to `service-b`, all requests go through that connection to a single `service-b` pod - even if `service-b` has 10 replicas.

The fix is to limit connection lifetime:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: grpc-service-pool
spec:
  host: grpc-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      http:
        maxRequestsPerConnection: 1000
        idleTimeout: 300s
    loadBalancer:
      simple: ROUND_ROBIN
```

Or you can use `LEAST_REQUEST` load balancing, which distributes better when combined with multiple connections:

```yaml
trafficPolicy:
  loadBalancer:
    simple: LEAST_REQUEST
```

## Configuring Keep-Alive at the Mesh Level

You can set default keep-alive behavior for the entire mesh:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        # Set these via proxy metadata
        ISTIO_META_IDLE_TIMEOUT: "300s"
    tcpKeepalive:
      time: 300s
      interval: 30s
      probes: 3
```

## Handling Load Balancer Keep-Alive

External load balancers have their own keep-alive timeouts. If the load balancer's idle timeout is shorter than Envoy's, you'll see connection resets. If it's longer, you'll see Envoy closing connections that the load balancer thinks are still alive.

For AWS ALB, the default idle timeout is 60 seconds. Make sure your Envoy idle timeout is longer:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gateway-idle-timeout
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: NETWORK_FILTER
      match:
        context: GATEWAY
        listener:
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
      patch:
        operation: MERGE
        value:
          typedConfig:
            "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
            commonHttpProtocolOptions:
              idleTimeout: 90s
```

Setting Envoy's idle timeout to 90 seconds (higher than ALB's 60 seconds) means the ALB will close idle connections first, which is the correct behavior. If Envoy closes first, the ALB might try to send a request on a closed connection.

## Diagnosing Keep-Alive Issues

Here are some signs of keep-alive problems and how to investigate:

**Uneven load distribution:**

```bash
# Check how many connections each endpoint has
kubectl exec my-pod -c istio-proxy -- \
  pilot-agent request GET stats | grep upstream_cx_active
```

If one endpoint has 100 active connections and another has 2, you likely have long-lived connections that aren't being rotated.

**Connection reset errors:**

```bash
# Check for connection resets
kubectl exec my-pod -c istio-proxy -- \
  pilot-agent request GET stats | grep upstream_cx_destroy
```

**Stale connections:**

```bash
# Check connection age
kubectl exec my-pod -c istio-proxy -- \
  pilot-agent request GET stats | grep upstream_cx_length_ms
```

## Best Practices

1. Always set `maxRequestsPerConnection` for HTTP services to ensure connection rotation
2. Enable TCP keep-alive probes for services behind NAT or firewalls
3. Set `idleTimeout` to less than your load balancer's idle timeout
4. For gRPC services, use `maxRequestsPerConnection` to force periodic reconnection for better load balancing
5. Monitor connection pool metrics in your Envoy dashboards

Getting keep-alive settings right prevents a whole class of problems. Start with conservative values and tune based on your actual traffic patterns.
