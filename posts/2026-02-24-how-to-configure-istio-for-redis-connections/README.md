# How to Configure Istio for Redis Connections

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Redis, Service Mesh, Kubernetes, Caching

Description: How to configure Istio service mesh for Redis connections in Kubernetes including TCP routing, mTLS, Sentinel support, and cluster mode handling.

---

Redis is used everywhere - caching, session storage, message queues, rate limiting, you name it. When you are running Redis in Kubernetes with Istio, the latency-sensitive nature of Redis means you need to get the configuration right or your application performance will suffer.

Redis uses its own text-based protocol (RESP) over TCP. Istio treats it as TCP traffic, which works well, but there are a few gotchas around connection handling, Sentinel, and Redis Cluster mode that you should know about.

## Basic Redis Setup with Istio

Start with a Redis deployment and service. The port name needs the `tcp-` prefix:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: cache
  labels:
    app: redis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7.2
          ports:
            - containerPort: 6379
              name: tcp-redis
          args:
            - "--requirepass"
            - "$(REDIS_PASSWORD)"
          env:
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: redis-credentials
                  key: password
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: cache
spec:
  selector:
    app: redis
  ports:
    - name: tcp-redis
      port: 6379
      targetPort: 6379
```

## DestinationRule for Redis

Redis is latency-sensitive, so your connection settings matter more than they do for a typical database:

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
        idleTimeout: 300s
    tls:
      mode: ISTIO_MUTUAL
```

A few things to note here. The `connectTimeout` is low (2 seconds) because Redis connections should establish almost instantly. If it takes longer, something is wrong. The `maxConnections` is set higher because Redis clients often maintain many connections, especially when using pub/sub or blocking operations. The `idleTimeout` of 300 seconds (5 minutes) works for most use cases but increase it if your application holds connections for longer periods.

## Handling Redis Sentinel

Redis Sentinel provides high availability by monitoring Redis instances and performing automatic failover. Sentinel runs on its own port (26379 by default) and clients connect to Sentinel first to discover the current primary.

You need to expose both ports in your service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-sentinel
  namespace: cache
spec:
  selector:
    app: redis-sentinel
  ports:
    - name: tcp-sentinel
      port: 26379
      targetPort: 26379
    - name: tcp-redis
      port: 6379
      targetPort: 6379
```

And a DestinationRule that covers both:

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
    tls:
      mode: ISTIO_MUTUAL
```

The tricky part with Sentinel is that it returns IP addresses of Redis instances to the client. If those IPs are pod IPs, the client will connect directly to the pod, and the traffic still goes through the sidecar proxy. Make sure your Sentinel configuration returns addresses that are resolvable from within the mesh.

## Redis Cluster Mode

Redis Cluster splits data across multiple nodes, and each node knows about the others. When a client sends a command to the wrong node, that node responds with a MOVED or ASK redirect containing the address of the correct node.

For Redis Cluster in Kubernetes, use a headless Service so each node has a stable DNS name:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-cluster-headless
  namespace: cache
spec:
  clusterIP: None
  selector:
    app: redis-cluster
  ports:
    - name: tcp-redis
      port: 6379
      targetPort: 6379
    - name: tcp-redis-bus
      port: 16379
      targetPort: 16379
```

Port 16379 is the Redis Cluster bus port, used for node-to-node communication. Both ports need to be declared with the `tcp-` prefix.

The DestinationRule for Redis Cluster:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: redis-cluster
  namespace: cache
spec:
  host: redis-cluster-headless.cache.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1000
        connectTimeout: 2s
    tls:
      mode: ISTIO_MUTUAL
```

Higher `maxConnections` here because the client maintains connections to every node in the cluster.

## External Redis (ElastiCache, etc.)

For managed Redis services outside your cluster:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-redis
  namespace: cache
spec:
  hosts:
    - my-redis.abc123.cache.amazonaws.com
  ports:
    - number: 6379
      name: tcp-redis
      protocol: TCP
  location: MESH_EXTERNAL
  resolution: DNS
```

If the external Redis requires TLS (like ElastiCache in-transit encryption):

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-redis-tls
  namespace: cache
spec:
  host: my-redis.abc123.cache.amazonaws.com
  trafficPolicy:
    tls:
      mode: SIMPLE
```

## Authorization Policies for Redis

Redis often contains sensitive data like sessions and tokens. Lock it down:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: redis-access
  namespace: cache
spec:
  selector:
    matchLabels:
      app: redis
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces:
              - app
              - backend
      to:
        - operation:
            ports: ["6379"]
```

This allows any workload in the `app` or `backend` namespaces to connect to Redis, while blocking everything else.

## Reducing Latency Overhead

The Istio sidecar adds some latency to every connection. For Redis, where operations typically complete in sub-millisecond time, even a small overhead is noticeable. A few things you can do:

1. Use connection pooling in your client library so you are not constantly establishing new connections through the proxy.

2. Pipeline Redis commands instead of sending them one at a time. This amortizes the proxy overhead across multiple operations.

3. Consider using the Sidecar resource to limit the proxy configuration:

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
        - "istio-system/*"
        - "cache/*"
```

4. If mTLS overhead is a concern for extremely high-throughput Redis workloads, you can selectively disable it - though this is rarely necessary:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: redis-permissive
  namespace: cache
spec:
  selector:
    matchLabels:
      app: redis
  mtls:
    mode: PERMISSIVE
```

## Monitoring Redis Through Istio

Track your Redis connection metrics:

```bash
# Total connections opened
istio_tcp_connections_opened_total{destination_service="redis.cache.svc.cluster.local"}

# Bytes transferred
istio_tcp_sent_bytes_total{destination_service="redis.cache.svc.cluster.local"}

# Connection duration
istio_tcp_connection_duration_seconds{destination_service="redis.cache.svc.cluster.local"}
```

These metrics help you spot connection leaks, unusual traffic patterns, and throughput changes.

Getting Redis running smoothly through Istio is mostly about correct port naming, sensible connection pool settings, and understanding how Sentinel and Cluster modes interact with the service mesh. The latency overhead is minimal for most workloads, and the security and observability benefits are well worth it.
