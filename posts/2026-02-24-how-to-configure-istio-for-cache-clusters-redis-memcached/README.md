# How to Configure Istio for Cache Clusters (Redis, Memcached)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Redis, Memcached, Caching, Service Mesh

Description: Configure Istio to work properly with Redis and Memcached cache clusters including protocol detection, connection pooling, and cluster mode support.

---

Caching layers like Redis and Memcached are some of the most latency-sensitive components in any architecture. Adding a service mesh sidecar in front of them introduces overhead, and if you don't configure it correctly, that overhead can negate the whole point of having a cache. A cache that's slow is worse than no cache at all because your application waits for it and then still has to go to the database.

This guide covers how to configure Istio for both Redis and Memcached, including standalone instances, sentinel setups, and cluster mode deployments.

## Redis Standalone Configuration

For a single Redis instance, the setup is straightforward. The key is port naming:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: cache
spec:
  ports:
  - port: 6379
    name: tcp-redis
    targetPort: 6379
  selector:
    app: redis
```

The `tcp-` prefix ensures Istio treats Redis traffic as opaque TCP. Redis uses its own RESP (Redis Serialization Protocol), and Istio can't parse it. If Istio tries to interpret it as HTTP, commands will fail with protocol errors.

Configure the DestinationRule with connection pooling tuned for cache access patterns:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: redis
  namespace: cache
spec:
  host: redis.cache.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 500
        connectTimeout: 2s
        tcpKeepalive:
          time: 60s
          interval: 30s
          probes: 3
    tls:
      mode: ISTIO_MUTUAL
```

The `maxConnections: 500` needs to accommodate all your application pods' connection pools combined. If you have 20 application pods, each with a Redis connection pool of 20 connections, that's 400 connections the sidecar in front of Redis needs to handle.

## Redis Sentinel Configuration

Redis Sentinel provides high availability through a separate sentinel process that monitors the primary and initiates failover. Sentinel uses its own port (26379) and its own protocol:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-sentinel
  namespace: cache
spec:
  clusterIP: None
  ports:
  - port: 6379
    name: tcp-redis
  - port: 26379
    name: tcp-sentinel
  selector:
    app: redis
```

Both ports need the `tcp-` prefix. The sentinel port is used for monitoring and failover coordination between sentinel instances.

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: redis-sentinel
  namespace: cache
spec:
  host: redis-sentinel.cache.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
        connectTimeout: 2s
        tcpKeepalive:
          time: 30s
          interval: 10s
          probes: 3
```

Shorter keepalive intervals are important for Sentinel because it needs to detect failures quickly. The sentinel down-after-milliseconds is typically 5-30 seconds, so your keepalive probes need to be faster than that.

## Redis Cluster Mode

Redis Cluster is the most complex setup. Each Redis node handles a subset of hash slots, and clients need to talk to specific nodes based on the key they're accessing. Nodes redirect clients with MOVED and ASK responses:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-cluster
  namespace: cache
spec:
  clusterIP: None
  ports:
  - port: 6379
    name: tcp-redis
  - port: 16379
    name: tcp-redis-bus
  selector:
    app: redis-cluster
```

Port 16379 is the cluster bus port used for node-to-node gossip. It must be accessible between all Redis nodes.

For Redis Cluster, each node needs to be individually addressable because clients connect to specific nodes after MOVED redirections:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
  namespace: cache
spec:
  serviceName: redis-cluster
  replicas: 6
  selector:
    matchLabels:
      app: redis-cluster
  template:
    metadata:
      labels:
        app: redis-cluster
      annotations:
        proxy.istio.io/config: |
          holdApplicationUntilProxyStarts: true
    spec:
      containers:
      - name: redis
        image: redis:7
        ports:
        - containerPort: 6379
          name: tcp-redis
        - containerPort: 16379
          name: tcp-redis-bus
        command:
        - redis-server
        - --cluster-enabled
        - "yes"
        - --cluster-config-file
        - /data/nodes.conf
        - --cluster-node-timeout
        - "5000"
```

## Memcached Configuration

Memcached is simpler than Redis from a protocol perspective. It uses a text-based protocol over TCP on port 11211:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: memcached
  namespace: cache
spec:
  ports:
  - port: 11211
    name: tcp-memcached
    targetPort: 11211
  selector:
    app: memcached
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: memcached
  namespace: cache
spec:
  host: memcached.cache.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1000
        connectTimeout: 1s
        tcpKeepalive:
          time: 60s
          interval: 30s
          probes: 3
```

Memcached clients typically use many more connections than Redis clients because Memcached doesn't have pipelining (or its pipelining is less common). Set `maxConnections` accordingly.

## Minimizing Sidecar Latency for Cache Traffic

Cache requests need to be fast. A typical Redis GET takes under a millisecond on the server side. If the sidecar adds another millisecond of latency, you've tripled the total latency. Here are ways to minimize overhead:

**1. Scope the sidecar configuration:**

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: redis-sidecar
  namespace: cache
spec:
  workloadSelector:
    labels:
      app: redis
  egress:
  - hosts:
    - "./redis-cluster.cache.svc.cluster.local"
    - "istio-system/*"
  ingress:
  - port:
      number: 6379
      protocol: TCP
      name: tcp-redis
    defaultEndpoint: 127.0.0.1:6379
```

A smaller configuration means faster xDS updates and less memory usage.

**2. Allocate sufficient CPU to the sidecar:**

```yaml
annotations:
  sidecar.istio.io/proxyCPU: "500m"
  sidecar.istio.io/proxyCPULimit: "2000m"
  sidecar.istio.io/proxyMemory: "256Mi"
  sidecar.istio.io/proxyMemoryLimit: "512Mi"
```

A CPU-starved sidecar adds latency. For high-throughput cache nodes, allocate generous CPU.

**3. Bypass the sidecar if latency is critical:**

As a last resort, exclude cache traffic from the sidecar entirely:

```yaml
annotations:
  traffic.sidecar.istio.io/excludeOutboundPorts: "6379"
```

This is set on the client pods, not on Redis. It means cache traffic bypasses the sidecar on the client side and goes directly to Redis. You lose mTLS and metrics for cache traffic, but you get near-native latency.

## Monitoring Cache Cluster Traffic

Even though Istio can't parse Redis or Memcached protocols, it still provides valuable TCP-level metrics:

```promql
# Bytes per second to/from cache
rate(istio_tcp_sent_bytes_total{destination_service="redis.cache.svc.cluster.local"}[5m])
rate(istio_tcp_received_bytes_total{destination_service="redis.cache.svc.cluster.local"}[5m])

# Connection count
istio_tcp_connections_opened_total{destination_service="redis.cache.svc.cluster.local"}

# Connection errors
istio_tcp_connections_closed_total{destination_service="redis.cache.svc.cluster.local", response_flags!=""}
```

If you see `response_flags` values like `UF` (upstream connection failure) or `UO` (upstream overflow), the connection pool is saturated.

## mTLS Considerations

Running mTLS between your application and cache adds encryption overhead. For internal caches that don't contain sensitive data, you might choose PERMISSIVE mode to avoid the overhead:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: cache-mtls
  namespace: cache
spec:
  selector:
    matchLabels:
      app: redis
  mtls:
    mode: PERMISSIVE
```

For caches that hold sensitive data (session tokens, PII), use STRICT mode and accept the latency cost. The security tradeoff is worth it.

Cache clusters and service mesh can work together, but you have to respect the latency requirements. Proper port naming, generous connection limits, appropriate sidecar resources, and selective use of mTLS will keep your caching layer fast and observable.
