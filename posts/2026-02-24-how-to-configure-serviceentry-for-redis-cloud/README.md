# How to Configure ServiceEntry for Redis Cloud

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ServiceEntry, Redis, Cloud, Kubernetes, Service Mesh

Description: Set up Istio ServiceEntry for Redis Cloud and other managed Redis services with proper TCP configuration, TLS, and connection pool tuning.

---

Managed Redis services like Redis Cloud (by Redis Inc.), Amazon ElastiCache, Google Memorystore, and Azure Cache for Redis are staples in modern architectures. They handle session storage, caching, rate limiting, pub/sub messaging, and more. When your Kubernetes workloads connect to these services through an Istio mesh, you need a ServiceEntry that handles the TCP protocol correctly.

Redis uses a custom protocol over TCP (RESP - Redis Serialization Protocol). Envoy does not understand RESP, so it treats Redis connections as opaque TCP streams. The configuration is straightforward, but there are some gotchas around TLS, connection handling, and timeouts that are worth getting right.

## Redis Cloud ServiceEntry

Redis Cloud provides an endpoint like `redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com` on a specific port. Here is the ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: redis-cloud
spec:
  hosts:
    - "redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com"
  location: MESH_EXTERNAL
  ports:
    - number: 16379
      name: tcp-redis
      protocol: TCP
  resolution: DNS
```

Redis Cloud uses non-standard ports (usually in the 10000-20000 range). Check your Redis Cloud dashboard for the exact port.

## Amazon ElastiCache ServiceEntry

ElastiCache endpoints look different depending on whether you use cluster mode:

**Single node / Replication group:**

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: elasticache-redis
spec:
  hosts:
    - "my-redis.abc123.0001.use1.cache.amazonaws.com"
  location: MESH_EXTERNAL
  ports:
    - number: 6379
      name: tcp-redis
      protocol: TCP
  resolution: DNS
```

**Cluster mode enabled (Configuration Endpoint):**

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: elasticache-cluster
spec:
  hosts:
    - "my-redis-cluster.abc123.clustercfg.use1.cache.amazonaws.com"
  location: MESH_EXTERNAL
  ports:
    - number: 6379
      name: tcp-redis
      protocol: TCP
  resolution: DNS
```

With cluster mode, the Redis client discovers all shards through the configuration endpoint and connects to individual shard endpoints. You need to allow those too:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: elasticache-shards
spec:
  hosts:
    - "*.use1.cache.amazonaws.com"
  location: MESH_EXTERNAL
  ports:
    - number: 6379
      name: tcp-redis
      protocol: TCP
  resolution: NONE
```

## Google Memorystore ServiceEntry

Memorystore uses private IP addresses within your VPC:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: memorystore-redis
spec:
  hosts:
    - "redis.memorystore.internal"
  location: MESH_EXTERNAL
  ports:
    - number: 6379
      name: tcp-redis
      protocol: TCP
  resolution: STATIC
  endpoints:
    - address: 10.0.0.5
```

Since Memorystore provides a private IP, use STATIC resolution with the endpoint's IP address. The `hosts` field is a synthetic name for Istio's internal tracking.

## Azure Cache for Redis

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: azure-redis
spec:
  hosts:
    - "my-cache.redis.cache.windows.net"
  location: MESH_EXTERNAL
  ports:
    - number: 6380
      name: tls-redis
      protocol: TLS
  resolution: DNS
```

Azure Cache uses port 6380 for TLS connections (6379 for non-TLS, but TLS is recommended and often required).

## Redis with TLS

Most managed Redis services support or require TLS. Configure the ServiceEntry accordingly:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: redis-tls
spec:
  hosts:
    - "redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com"
  location: MESH_EXTERNAL
  ports:
    - number: 16380
      name: tls-redis
      protocol: TLS
  resolution: DNS
```

Using `protocol: TLS` tells Envoy the traffic is encrypted. Envoy passes it through without trying to inspect the payload.

If you want Envoy to originate TLS (your app sends unencrypted Redis protocol, Envoy encrypts it):

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: redis-tls-origination
spec:
  hosts:
    - "redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com"
  location: MESH_EXTERNAL
  ports:
    - number: 16379
      name: tcp-redis
      protocol: TCP
  resolution: DNS
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: redis-tls-origination-dr
spec:
  host: "redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com"
  trafficPolicy:
    tls:
      mode: SIMPLE
      sni: "redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com"
```

## Connection Pool Tuning

Redis connections are lightweight and often long-lived. Most Redis client libraries maintain a connection pool. You should align Istio's connection pool settings with your client configuration:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: redis-connection-pool
spec:
  host: "redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com"
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 500
        connectTimeout: 5s
        idleTimeout: 300s
```

**maxConnections** should be higher than the sum of all your pods' Redis connection pool sizes. If you have 10 pods each with a pool of 20 connections, set maxConnections to at least 250 (with some headroom).

**connectTimeout** of 5 seconds is usually generous for Redis. If your Redis is on the same cloud provider, connections establish in under 10ms.

**idleTimeout** depends on your Redis provider's connection timeout. Redis Cloud does not timeout idle connections by default, but ElastiCache and Memorystore might. Match this to the server-side setting.

## Handling Redis Sentinel

If you use Redis Sentinel for high availability (common with self-managed Redis), you need ServiceEntries for both Sentinel and the Redis instances:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: redis-sentinel
spec:
  hosts:
    - sentinel-1.redis.company.com
    - sentinel-2.redis.company.com
    - sentinel-3.redis.company.com
  location: MESH_EXTERNAL
  ports:
    - number: 26379
      name: tcp-sentinel
      protocol: TCP
  resolution: DNS
---
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: redis-instances
spec:
  hosts:
    - redis-1.redis.company.com
    - redis-2.redis.company.com
    - redis-3.redis.company.com
  location: MESH_EXTERNAL
  ports:
    - number: 6379
      name: tcp-redis
      protocol: TCP
  resolution: DNS
```

Sentinel uses port 26379 for its own protocol, and the actual Redis instances run on 6379 (or custom ports).

## Monitoring Redis Traffic

Track Redis connections and throughput through Istio metrics:

```bash
# Active connections to Redis
istio_tcp_connections_opened_total{
  destination_service=~".*redislabs.*|.*cache.amazonaws.*"
}

# Data throughput
rate(istio_tcp_sent_bytes_total{
  destination_service=~".*redislabs.*"
}[5m])

# Connection churn
rate(istio_tcp_connections_opened_total{
  destination_service=~".*redislabs.*"
}[5m])
```

High connection churn (lots of opens and closes) might indicate your Redis client is not pooling connections properly. Redis works best with persistent connections.

## Debugging Redis Connectivity

When Redis connections fail through Istio:

```bash
# Check Envoy knows about the Redis endpoint
istioctl proxy-config cluster deploy/my-app | grep redis

# Check endpoint resolution
istioctl proxy-config endpoints deploy/my-app | grep redis

# Test raw TCP connectivity
kubectl exec deploy/my-app -c my-app -- nc -zv redis-host 6379

# Check Envoy logs
kubectl logs deploy/my-app -c istio-proxy | grep 6379
```

Common issues:
- Wrong port number (Redis Cloud uses non-standard ports)
- Missing TLS configuration (connection hangs or resets)
- Connection pool exhaustion (too many pods, not enough maxConnections)
- Firewall/security group blocking from the pod network to Redis

## Complete Production Setup

Here is a production-ready configuration for Redis Cloud:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: redis-cloud
  namespace: backend
spec:
  hosts:
    - "redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com"
  location: MESH_EXTERNAL
  ports:
    - number: 16380
      name: tls-redis
      protocol: TLS
  resolution: DNS
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: redis-cloud-config
  namespace: backend
spec:
  host: "redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com"
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 500
        connectTimeout: 5s
        idleTimeout: 300s
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
```

This handles TLS connections, limits the connection pool, and provides basic circuit breaking. Adjust the port, hostname, and limits based on your specific Redis Cloud configuration and traffic patterns.
