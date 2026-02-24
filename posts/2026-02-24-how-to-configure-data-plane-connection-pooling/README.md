# How to Configure Data Plane Connection Pooling

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Data Plane, Connection Pooling, Envoy, DestinationRule

Description: How to configure and tune connection pooling in Istio's data plane using DestinationRules to manage TCP and HTTP connections effectively.

---

Connection pooling is one of those things you can ignore when traffic is low, but it becomes critical at scale. Without proper connection pool configuration, your Envoy sidecars might open too many connections to an upstream service and overwhelm it, or they might not reuse connections efficiently and waste resources on connection setup overhead. Istio gives you fine-grained control over connection pooling through DestinationRules.

## How Connection Pooling Works in Envoy

Each Envoy sidecar maintains connection pools to upstream services. When your application makes a request to another service, Envoy checks if there is an existing connection in the pool that can be reused. If there is, the request goes over that connection. If not, Envoy opens a new connection (up to the configured limit).

The pools are per-cluster, meaning each upstream service (or subset of a service) has its own connection pool. The pool tracks:
- Active connections
- Pending requests waiting for a connection
- Connection age and idle time

## Configuring TCP Connection Pool

TCP settings control the lower-level connection behavior. Here is a DestinationRule with TCP connection pool configuration:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service-pool
  namespace: default
spec:
  host: my-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 30ms
        tcpKeepalive:
          time: 7200s
          interval: 75s
          probes: 9
```

**maxConnections**: The maximum number of TCP connections to the upstream service. This is the hard cap. If all connections are in use, new requests either queue (for HTTP) or fail (for raw TCP). Setting this too low causes queuing and increased latency. Setting it too high can overwhelm the upstream service.

**connectTimeout**: How long Envoy waits for a TCP connection to be established before giving up. For services within the same cluster, 30ms to 100ms is reasonable. For external services, you might need 1s to 5s.

**tcpKeepalive**: TCP keepalive settings prevent idle connections from being silently dropped by intermediate load balancers or firewalls. The `time` field is how long the connection must be idle before sending keepalive probes. The `interval` is the time between probes. The `probes` field is how many probes to send before considering the connection dead.

## Configuring HTTP Connection Pool

HTTP settings build on top of the TCP settings and control HTTP-specific behavior:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service-pool
  namespace: default
spec:
  host: my-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 100ms
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
        maxRequestsPerConnection: 500
        maxRetries: 3
        idleTimeout: 300s
```

**http1MaxPendingRequests**: For HTTP/1.1 connections, this is the maximum number of requests that can be queued waiting for a connection from the pool. If the pool is full (all `maxConnections` connections are active) and there are already `http1MaxPendingRequests` requests waiting, the next request gets a 503 response.

**http2MaxRequests**: For HTTP/2, this is the maximum number of concurrent requests. HTTP/2 multiplexes many requests over a single connection, so this is effectively the total request concurrency rather than a connection count.

**maxRequestsPerConnection**: After this many requests have been served over a single connection, the connection is closed and a new one is created. This is useful for:
- Preventing memory growth from long-lived connections
- Distributing load when new endpoints are added (old connections will not discover new endpoints)
- Working around servers that have per-connection limits

**maxRetries**: The maximum number of concurrent retries across all requests to this service. This prevents a retry storm from consuming all available connections.

**idleTimeout**: How long a connection can be idle before Envoy closes it. This helps reclaim resources from connections that are no longer needed.

**h2UpgradePolicy**: Controls whether HTTP/1.1 connections are upgraded to HTTP/2. Options are `DEFAULT` (use the mesh-wide setting), `DO_NOT_UPGRADE`, or `UPGRADE`.

## Connection Pool Settings Per Subset

You can configure different connection pool settings for different subsets of a service. This is useful when different versions of a service have different capacity characteristics:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service-pool
  namespace: default
spec:
  host: my-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
      http:
        http1MaxPendingRequests: 50
  subsets:
  - name: v1
    labels:
      version: v1
    trafficPolicy:
      connectionPool:
        tcp:
          maxConnections: 30
        http:
          http1MaxPendingRequests: 30
  - name: v2
    labels:
      version: v2
    trafficPolicy:
      connectionPool:
        tcp:
          maxConnections: 100
        http:
          http1MaxPendingRequests: 100
```

In this example, v1 gets a smaller pool (maybe it is an older version with lower capacity) while v2 gets a larger pool.

## Monitoring Connection Pool Usage

To know if your connection pool settings are right, you need to monitor how they are being used. Envoy exposes detailed stats per cluster:

```bash
# Check active connections
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/stats | grep "upstream_cx_active"

# Check total connections opened
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/stats | grep "upstream_cx_total"

# Check connection pool overflow (requests rejected due to full pool)
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/stats | grep "upstream_rq_pending_overflow"

# Check pending requests
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/stats | grep "upstream_rq_pending_active"
```

The `upstream_rq_pending_overflow` counter is the most important one to watch. If this is incrementing, your connection pool is too small and requests are being rejected.

For Prometheus queries:

```promql
# Connection pool overflow rate
rate(envoy_cluster_upstream_rq_pending_overflow{cluster_name=~"outbound.*my-service.*"}[5m])

# Active connections
envoy_cluster_upstream_cx_active{cluster_name=~"outbound.*my-service.*"}
```

## Connection Pool and Circuit Breaking

Connection pool settings interact closely with circuit breaking. When the connection pool overflows (all connections are in use and the pending queue is full), it acts like a circuit breaker. Envoy returns a 503 with an `UO` (upstream overflow) response flag.

You can verify this is happening by checking access logs:

```bash
kubectl logs deploy/my-app -c istio-proxy | grep "UO"
```

If you are seeing `UO` flags, either increase the pool size or investigate why the upstream service is not handling connections fast enough.

## Sizing Your Connection Pools

There is no one-size-fits-all answer for connection pool sizes, but here are some guidelines:

**Start with defaults and adjust**: Istio's defaults are usually reasonable for moderate traffic. Monitor overflow stats and adjust from there.

**Consider the upstream capacity**: If your upstream service can only handle 50 concurrent connections, setting `maxConnections: 1000` will not help. You will just overwhelm it.

**Account for multiple callers**: If 10 services each call the same upstream, each with `maxConnections: 100`, the upstream could see up to 1000 concurrent connections. Coordinate pool sizes across callers.

**Factor in retries**: If retries are enabled, each retry consumes a connection. A burst of failures can quickly fill the pool with retry requests.

Here is a practical example for a typical web service:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: web-service-pool
  namespace: default
spec:
  host: web-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
        connectTimeout: 100ms
        tcpKeepalive:
          time: 300s
          interval: 30s
          probes: 3
      http:
        http1MaxPendingRequests: 200
        http2MaxRequests: 1000
        maxRequestsPerConnection: 1000
        maxRetries: 5
        idleTimeout: 120s
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 30
```

This configuration pairs connection pooling with outlier detection so that unhealthy endpoints get removed from the pool automatically.

Getting connection pooling right is a balancing act. Too restrictive and you are artificially limiting throughput. Too loose and you risk overwhelming upstream services. Start with conservative settings, monitor the stats, and adjust based on what you see in production.
