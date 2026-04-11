# How to Scale Redis with Envoy Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Envoy Proxy, Scaling, Load Balancing, Service Mesh, YAML

Description: Use Envoy Proxy as a Redis-aware load balancer and sidecar to add connection pooling, circuit breaking, and observability to Redis without changing application code.

---

## Why Use Envoy with Redis?

Envoy Proxy understands the Redis protocol natively, making it a powerful intermediary layer between your application and Redis servers. Key benefits include:

- Connection pooling at the proxy level - applications maintain fewer connections
- Transparent read/write splitting to replicas
- Circuit breaking to prevent cascade failures
- Per-command metrics and tracing
- TLS termination without changing application code

## Basic Envoy Redis Configuration

Envoy uses its `redis_proxy` filter to handle the Redis protocol. Here is a minimal configuration:

```yaml
static_resources:
  listeners:
  - name: redis_listener
    address:
      socket_address:
        address: 0.0.0.0
        port_value: 6380   # Envoy listens here
    filter_chains:
    - filters:
      - name: envoy.filters.network.redis_proxy
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.redis_proxy.v3.RedisProxy
          stat_prefix: redis
          settings:
            op_timeout: 5s
            enable_redirection: true
            enable_command_stats: true
          prefix_routes:
            catch_all_route:
              cluster: redis_cluster

  clusters:
  - name: redis_cluster
    connect_timeout: 1s
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    load_assignment:
      cluster_name: redis_cluster
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: redis.default.svc.cluster.local
                port_value: 6379
```

## Read/Write Splitting with Redis Cluster

Route writes to the primary and reads to replicas using Envoy's Redis Cluster support. The `read_policy: REPLICA` setting requires the `envoy.clusters.redis` cluster type, which automatically discovers the cluster topology via `CLUSTER SLOTS` commands:

```yaml
static_resources:
  listeners:
  - name: redis_listener
    address:
      socket_address:
        address: 0.0.0.0
        port_value: 6380
    filter_chains:
    - filters:
      - name: envoy.filters.network.redis_proxy
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.redis_proxy.v3.RedisProxy
          stat_prefix: redis
          settings:
            op_timeout: 5s
            enable_redirection: true
            read_policy: REPLICA    # reads go to replicas
          prefix_routes:
            catch_all_route:
              cluster: redis_cluster

  clusters:
  - name: redis_cluster
    connect_timeout: 1s
    cluster_type:
      name: envoy.clusters.redis
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.clusters.redis.v3.RedisClusterConfig
        cluster_refresh_rate: 30s
        cluster_refresh_timeout: 0.5s
    load_assignment:
      cluster_name: redis_cluster
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: redis-node-0.default.svc.cluster.local
                port_value: 6379
        - endpoint:
            address:
              socket_address:
                address: redis-node-1.default.svc.cluster.local
                port_value: 6379
        - endpoint:
            address:
              socket_address:
                address: redis-node-2.default.svc.cluster.local
                port_value: 6379
```

## Connection Pool Limits

Configure max connections per upstream to prevent overwhelming Redis:

```yaml
  clusters:
  - name: redis_cluster
    connect_timeout: 1s
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    circuit_breakers:
      thresholds:
      - priority: DEFAULT
        max_connections: 100         # max active connections
        max_pending_requests: 50     # max queued requests
        max_requests: 1000           # max concurrent requests
        max_retries: 3
    load_assignment:
      cluster_name: redis_cluster
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: redis.default.svc.cluster.local
                port_value: 6379
```

## Deploying as a Sidecar in Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:latest
        env:
        - name: REDIS_HOST
          value: "localhost"
        - name: REDIS_PORT
          value: "6380"    # Connect to Envoy sidecar

      - name: envoy
        image: envoyproxy/envoy:v1.28-latest
        args:
        - -c
        - /etc/envoy/envoy.yaml
        ports:
        - containerPort: 6380
        - containerPort: 9901   # Envoy admin
        volumeMounts:
        - name: envoy-config
          mountPath: /etc/envoy

      volumes:
      - name: envoy-config
        configMap:
          name: envoy-redis-config
```

## Monitoring via Envoy Admin API

```bash
# View Redis proxy stats
curl http://localhost:9901/stats | grep redis

# Example metrics available (prefixed with redis.<stat_prefix>):
# redis.redis.downstream_cx_total
# redis.redis.command.get.total
# redis.redis.command.set.total
# redis.redis.command.get.latency (histogram)
```

## Summary

Envoy Proxy's native Redis protocol support makes it an effective tool for scaling Redis deployments without changing application code. Use it for connection pooling, read/write splitting to replicas, circuit breaking, and observability. Deploying Envoy as a sidecar in Kubernetes lets each pod benefit from connection reuse and per-command metrics automatically.
