# How to Configure Redis Protocol Support in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Redis, Service Mesh, Kubernetes, Caching, Protocol

Description: How to configure Istio to properly handle Redis protocol traffic, including port naming, connection pooling, external Redis access, and cluster mode considerations.

---

Redis is the go-to choice for caching, session management, and pub/sub messaging in Kubernetes applications. When you add Istio to the picture, you need to make sure the sidecar proxy handles Redis traffic correctly. Redis uses its own text-based protocol (RESP - Redis Serialization Protocol), which is neither HTTP nor raw binary TCP.

Istio recognizes Redis as a specific protocol and can provide protocol-aware handling when configured properly. This means better observability and smarter traffic management compared to treating Redis as generic TCP.

## Port Naming for Redis

The simplest way to tell Istio about Redis traffic is through port naming:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: default
spec:
  selector:
    app: redis
  ports:
    - name: redis
      port: 6379
      targetPort: 6379
```

Alternatives that also work:

```yaml
ports:
  - name: tcp-redis
    port: 6379
    targetPort: 6379
```

Or with `appProtocol`:

```yaml
ports:
  - name: cache
    port: 6379
    targetPort: 6379
    appProtocol: redis
```

When Istio detects the `redis` protocol, it uses a specialized Redis proxy filter in Envoy instead of a generic TCP proxy. This filter understands the RESP protocol and can provide per-command metrics and routing.

## Basic Redis Deployment with Istio

A typical Redis deployment in an Istio-enabled namespace:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: default
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
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          command:
            - redis-server
            - "--maxmemory"
            - "256mb"
            - "--maxmemory-policy"
            - "allkeys-lru"
```

Redis is a client-first protocol (the client sends commands, the server responds), so Istio's protocol sniffing works reasonably well for Redis. But explicit configuration is still preferred because it avoids the sniffing delay and enables the Redis-specific filter.

## Connection Pool Configuration

Redis connections are typically persistent. Applications use connection pools to maintain a set of ready connections. Istio's sidecar adds its own connection management layer:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: redis-dr
  namespace: default
spec:
  host: redis.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 300
        connectTimeout: 5s
        tcpKeepalive:
          time: 300s
          interval: 75s
          probes: 5
```

Set `maxConnections` higher than the sum of all client connection pools. If you have 5 application pods each with a Redis connection pool of 50, you need at least 250 connections, plus some headroom.

The keepalive settings prevent idle connections from being dropped by intermediate network devices. Redis connections can sit idle for extended periods between bursts of traffic, so keepalives are important.

## Handling Redis Sentinel

Redis Sentinel provides high availability by monitoring Redis instances and performing automatic failover. Sentinel itself runs on port 26379 by default.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-sentinel
  namespace: default
spec:
  selector:
    app: redis-sentinel
  ports:
    - name: tcp-sentinel
      port: 26379
      targetPort: 26379
```

Note that we use `tcp-sentinel` here, not `redis-sentinel`. The Sentinel protocol is based on RESP but serves a different purpose. Using the `tcp` prefix tells Istio to treat it as generic TCP.

For the actual Redis instances managed by Sentinel:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-master
  namespace: default
spec:
  selector:
    app: redis
    role: master
  ports:
    - name: redis
      port: 6379
      targetPort: 6379
---
apiVersion: v1
kind: Service
metadata:
  name: redis-replica
  namespace: default
spec:
  selector:
    app: redis
    role: replica
  ports:
    - name: redis
      port: 6379
      targetPort: 6379
```

The challenge with Sentinel and Istio is that Sentinel returns IP addresses of the current master to clients. If the client connects to that IP directly, the traffic goes through the sidecar but the destination is an IP, not a hostname. Istio can still route it correctly because it knows which pod that IP belongs to, but VirtualService routing rules based on the service hostname won't apply.

## Redis Cluster Mode

Redis Cluster splits data across multiple nodes. Each node is responsible for a subset of hash slots, and clients get redirected to the correct node when they access a key that belongs to another node.

This creates a challenge with Istio because:

1. Cluster nodes discover each other using IP addresses
2. MOVED and ASK redirections include IP addresses
3. Clients connect directly to specific nodes

For Redis Cluster, use a headless service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-cluster
  namespace: default
spec:
  clusterIP: None
  selector:
    app: redis-cluster
  ports:
    - name: redis
      port: 6379
      targetPort: 6379
    - name: tcp-gossip
      port: 16379
      targetPort: 16379
```

Port 16379 is the Redis Cluster bus port used for node-to-node communication. Name it with the `tcp` prefix since it's not standard RESP traffic.

The headless service ensures DNS returns individual pod IPs, which matches how Redis Cluster clients discover nodes.

## Connecting to External Redis

For managed Redis services like AWS ElastiCache, Azure Cache for Redis, or Google Memorystore:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-redis
  namespace: default
spec:
  hosts:
    - my-redis.abc123.cache.amazonaws.com
  location: MESH_EXTERNAL
  ports:
    - number: 6379
      name: redis
      protocol: TCP
  resolution: DNS
```

If the external Redis requires TLS (most managed services do for production):

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-redis-dr
  namespace: default
spec:
  host: my-redis.abc123.cache.amazonaws.com
  trafficPolicy:
    tls:
      mode: SIMPLE
```

Some Redis clients handle TLS themselves. In that case, set `mode: DISABLE` so Istio doesn't try to add another TLS layer:

```yaml
trafficPolicy:
  tls:
    mode: DISABLE
```

## mTLS and Access Control

Within the mesh, Redis traffic is automatically encrypted with mTLS. You can enforce strict mTLS:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: redis-mtls
  namespace: default
spec:
  selector:
    matchLabels:
      app: redis
  mtls:
    mode: STRICT
```

Restrict which services can access Redis using an AuthorizationPolicy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: redis-access
  namespace: default
spec:
  selector:
    matchLabels:
      app: redis
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/default/sa/web-app
              - cluster.local/ns/default/sa/worker
      to:
        - operation:
            ports:
              - "6379"
```

This ensures only the `web-app` and `worker` service accounts can reach Redis.

## Observability

With the Redis protocol filter enabled, Istio can report Redis-specific metrics. You can see these in the Envoy stats:

```bash
kubectl exec -it <client-pod> -c istio-proxy -n default -- \
  pilot-agent request GET stats | grep redis
```

These stats include total commands, error rates, and latency distributions per command type. This is much more useful than generic TCP byte counts.

## Debugging Redis Connection Issues

Common debugging steps:

```bash
# Check protocol detection
istioctl x describe service redis -n default

# Check listener config
istioctl proxy-config listener <pod-name> -n default --port 6379

# Test connectivity from sidecar
kubectl exec -it <pod-name> -c istio-proxy -n default -- \
  curl -v telnet://redis.default.svc.cluster.local:6379

# Check cluster config
istioctl proxy-config cluster <pod-name> -n default | grep redis

# Check endpoints
istioctl proxy-config endpoint <pod-name> -n default | grep redis
```

If Redis PING commands work but actual data operations fail, check if there's an AuthorizationPolicy blocking the traffic. If connections drop after being idle, increase the keepalive settings. If latency spikes during failovers, check that your client library handles reconnection gracefully.

Redis and Istio play well together with proper configuration. Name your ports, set appropriate connection limits, handle the TLS layers correctly, and use AuthorizationPolicies to lock down access.
