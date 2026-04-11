# How to Configure Redis with Envoy Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Envoy, Proxy, Networking, Observability

Description: Learn how to configure Envoy Proxy as a sidecar or standalone proxy in front of Redis to gain traffic control, observability, and TLS termination.

---

Envoy Proxy is a high-performance edge and service proxy used widely in service mesh architectures. Placing Envoy in front of Redis gives you fine-grained control over connections, built-in metrics, and TLS without changing application code.

## Why Use Envoy with Redis?

- Centralized TLS termination so clients connect over plaintext internally
- Traffic metrics (connections, bytes, latency) via Envoy's stats endpoint
- Connection limiting and circuit breaking
- Easier integration with service mesh tools like Istio or Consul

## Basic Envoy Configuration for Redis

Envoy supports Redis via the `redis_proxy` network filter. Below is a minimal `envoy.yaml` that listens on port 6380 and forwards to a Redis instance on port 6379.

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
                stat_prefix: redis_stats
                settings:
                  op_timeout: 5s
                prefix_routes:
                  catch_all_route:
                    cluster: redis_cluster
  clusters:
    - name: redis_cluster
      connect_timeout: 1s
      type: STRICT_DNS
      load_assignment:
        cluster_name: redis_cluster
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: 127.0.0.1
                      port_value: 6379
```

Start Envoy with this config:

```bash
envoy -c envoy.yaml
```

Now connect your application to port 6380 instead of 6379.

## Enabling Per-Command Metrics

Envoy's Redis proxy tracks stats per command. To view them:

```bash
curl http://localhost:9901/stats | grep redis
```

You'll see counters like:

```text
redis.redis_stats.downstream_cx_active: 3
redis.redis_stats.command.get.total: 1042
redis.redis_stats.command.set.total: 312
```

## Adding TLS Termination

To terminate TLS at the Envoy listener, add a `transport_socket` to the listener's filter chain:

```yaml
transport_socket:
  name: envoy.transport_sockets.tls
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext
    common_tls_context:
      tls_certificates:
        - certificate_chain:
            filename: /certs/redis.crt
          private_key:
            filename: /certs/redis.key
```

This means clients connect to Envoy over TLS, and Envoy forwards unencrypted traffic to the local Redis instance.

## Using Prefix Routes for Multi-Cluster Routing

Envoy Redis proxy supports routing different key prefixes to different Redis clusters:

```yaml
prefix_routes:
  routes:
    - prefix: "session:"
      cluster: session_redis
    - prefix: "cache:"
      cluster: cache_redis
  catch_all_route:
    cluster: default_redis
```

This is useful for multi-tenant or workload-separated deployments.

## Monitoring with OneUptime

Once Envoy exposes metrics via its admin endpoint, you can scrape them with a Prometheus exporter and send alerts to OneUptime. Set up a monitor that triggers when `redis.redis_stats.downstream_cx_active` exceeds your threshold or command latency spikes above acceptable levels.

## Summary

Envoy Proxy provides a powerful layer in front of Redis for TLS, metrics, and traffic shaping without modifying application code. By using the `redis_proxy` filter, you get per-command observability and flexible routing. Combined with OneUptime monitoring, you can catch connection and latency issues before they impact users.
