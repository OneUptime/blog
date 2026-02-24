# How to Fix Redis Connection Issues Through Istio Proxy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Redis, TCP Routing, Caching, Troubleshooting

Description: How to troubleshoot and resolve Redis connection problems when traffic is routed through the Istio Envoy sidecar proxy.

---

Redis is fast. Really fast. And when you put an Envoy proxy in front of it, you want to make sure that proxy doesn't add noticeable latency or break connections. Most Redis-through-Istio issues come down to protocol detection, connection handling, and timeout configuration.

## Port Naming for Redis

Just like with any protocol in Istio, the service port name determines how Envoy treats the traffic. Redis uses its own binary protocol over TCP, so the port should be named with a `tcp` or `redis` prefix:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: cache
spec:
  ports:
  - name: tcp-redis
    port: 6379
    targetPort: 6379
  selector:
    app: redis
```

Istio has built-in Redis protocol support, so using the `redis` name can enable Redis-specific features:

```yaml
ports:
- name: redis
  port: 6379
  targetPort: 6379
```

Never name it with an `http` prefix. Envoy will try to parse Redis commands as HTTP and everything breaks.

## Connection Refused on Startup

Your application tries to connect to Redis immediately on startup but gets "connection refused" because the sidecar isn't ready yet.

The fix:

```yaml
metadata:
  annotations:
    proxy.istio.io/config: |
      holdApplicationUntilProxyStarts: true
```

Or handle it in your application with retry logic. Most Redis clients have built-in reconnection:

```python
import redis

r = redis.Redis(
    host='redis.cache.svc.cluster.local',
    port=6379,
    retry_on_timeout=True,
    socket_connect_timeout=5,
    retry=redis.retry.Retry(redis.backoff.ExponentialBackoff(), 10)
)
```

## Pub/Sub Connection Drops

Redis Pub/Sub uses long-lived connections. The subscriber keeps the connection open waiting for messages. Envoy's idle timeout can kill these connections.

If your Pub/Sub subscribers keep disconnecting, increase the idle timeout:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: redis-dr
  namespace: my-namespace
spec:
  host: redis.cache.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 500
        idleTimeout: 7200s
```

Setting the idle timeout to 2 hours gives plenty of room for Pub/Sub connections. Some people disable it entirely with `0s`, but that can lead to leaked connections.

## Redis Cluster Mode

Redis Cluster uses multiple nodes, and clients need to connect to different nodes based on the key hash slot. The client receives MOVED or ASK redirections with node addresses.

The problem: those addresses are the internal Redis pod IPs. If your client tries to connect to those IPs through the sidecar, it might not work depending on your Istio configuration.

Make sure the Redis Cluster nodes are reachable. If Redis pods are in the same namespace, this usually works. If they're in a different namespace, verify the Sidecar resource allows it:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: my-namespace
spec:
  egress:
  - hosts:
    - "./*"
    - "cache/*"
    - "istio-system/*"
```

For Redis Cluster, some people find it easier to exclude Redis traffic from the sidecar:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundPorts: "6379"
```

## Sentinel Connections

Redis Sentinel uses port 26379 for monitoring and failover. If you're using Sentinel, both the Sentinel port and the Redis port need to be accessible through the proxy:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-sentinel
  namespace: cache
spec:
  ports:
  - name: tcp-sentinel
    port: 26379
    targetPort: 26379
  - name: tcp-redis
    port: 6379
    targetPort: 6379
```

Make sure both ports are named with `tcp` prefix.

## Connection Pool Limits

Redis clients typically maintain a connection pool. If the pool size exceeds Envoy's connection limit, new connections get rejected:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: redis-pool
  namespace: my-namespace
spec:
  host: redis.cache.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1000
```

Set `maxConnections` higher than your application's connection pool size. If you have multiple application pods, multiply by the number of pods.

Check how many connections are active:

```bash
kubectl exec <pod-name> -c istio-proxy -n my-namespace -- curl -s localhost:15000/stats | grep "cx_active.*redis"
```

## Latency Added by the Proxy

Redis operations are typically sub-millisecond. Adding a proxy in the path adds some latency. For most use cases, this is negligible (microseconds), but for latency-sensitive pipelines, it can matter.

Measure the overhead:

```bash
# From inside the pod, directly to Redis (bypassing proxy)
kubectl exec <pod-name> -c my-app -- redis-cli -h 127.0.0.1 -p 6379 --latency-history

# Through the service name (going through proxy)
kubectl exec <pod-name> -c my-app -- redis-cli -h redis.cache.svc.cluster.local -p 6379 --latency-history
```

If the latency overhead is unacceptable, exclude Redis from the proxy:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundPorts: "6379"
```

## mTLS with Redis

If both the client pod and the Redis pod have sidecars, mTLS is automatic. Redis traffic gets encrypted between pods without any Redis SSL configuration.

If the Redis pod doesn't have a sidecar (common for StatefulSet-based Redis), make sure the PeerAuthentication for the Redis namespace is PERMISSIVE or create a DestinationRule disabling mTLS:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: redis-no-mtls
  namespace: my-namespace
spec:
  host: redis.cache.svc.cluster.local
  trafficPolicy:
    tls:
      mode: DISABLE
```

## External Redis (ElastiCache, Redis Cloud)

For external Redis services, create a ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-redis
  namespace: my-namespace
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

And a DestinationRule to disable mTLS (since the external server doesn't have an Istio sidecar):

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: external-redis-dr
  namespace: my-namespace
spec:
  host: my-redis.abc123.cache.amazonaws.com
  trafficPolicy:
    tls:
      mode: DISABLE
```

## Debugging Redis Connections

Check if the Redis endpoint is known to the proxy:

```bash
istioctl proxy-config endpoints <pod-name> -n my-namespace | grep 6379
```

Check the cluster configuration:

```bash
istioctl proxy-config clusters <pod-name> -n my-namespace | grep redis
```

Look at Envoy access logs for Redis traffic:

```bash
kubectl logs <pod-name> -c istio-proxy -n my-namespace | grep "6379"
```

Response flags to watch:
- `UF`: Upstream connection failure
- `UH`: No healthy upstream
- `UO`: Upstream overflow (connection pool full)

## Summary

Redis through Istio works well once you name the service port correctly (`tcp-redis` or `redis`), configure adequate connection pool limits, and handle idle timeout for long-lived connections like Pub/Sub. For Redis Cluster and Sentinel setups, make sure all required ports are accessible. For latency-critical workloads, measure the proxy overhead and exclude Redis traffic from the sidecar if needed.
