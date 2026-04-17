# How to Use chproxy as a ClickHouse Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, chproxy, Proxy, Load Balancing, Query Management

Description: Learn how to use chproxy, a dedicated ClickHouse HTTP proxy, to add query routing, caching, rate limiting, and automatic failover to your cluster.

---

## What Is chproxy?

chproxy is an open-source HTTP proxy written in Go specifically for ClickHouse. Unlike generic load balancers, chproxy understands ClickHouse semantics and provides features like user-based query routing, execution time limits, response caching, and automatic failover between nodes.

## Installation

```bash
# Download the binary
wget https://github.com/ContentSquare/chproxy/releases/latest/download/chproxy_linux_amd64
chmod +x chproxy_linux_amd64
sudo mv chproxy_linux_amd64 /usr/local/bin/chproxy
```

Or run with Docker:

```bash
docker run -d -p 9090:9090 \
  -v $(pwd)/config.yml:/config.yml \
  contentsquareplatform/chproxy -config /config.yml
```

## Basic Configuration

```yaml
server:
  http:
    listen_addr: ":9090"

clusters:
  - name: production
    nodes:
      - ch-node-1:8123
      - ch-node-2:8123
      - ch-node-3:8123
    heartbeat:
      interval: 10s
      timeout: 3s
      request: "/ping"
      response: "Ok.\n"
    users:
      - name: default
        password: ""

users:
  - name: default
    password: ""
    to_cluster: production
    to_user: default
```

## User-Based Query Routing

Route heavy analytical queries to dedicated nodes:

```yaml
users:
  - name: analyst
    to_cluster: analytics_cluster
    max_concurrent_queries: 5
    max_execution_time: 600s

  - name: app_service
    to_cluster: oltp_cluster
    max_concurrent_queries: 50
    max_execution_time: 30s
```

## Response Caching

Enable caching for repeated queries:

```yaml
caches:
  - name: short_cache
    dir: /tmp/chproxy-cache
    max_size: 500mb
    expire: 60s

users:
  - name: dashboard_user
    cache: short_cache
    to_cluster: production
    to_user: readonly
```

Queries with the same SQL text return cached results within the TTL window, reducing load on ClickHouse.

## Rate Limiting

```yaml
users:
  - name: default
    max_concurrent_queries: 10
    max_queue_size: 100
    max_queue_time: 30s
    to_cluster: production
    to_user: default
```

Requests that exceed `max_concurrent_queries` are queued up to `max_queue_size`. Queries waiting longer than `max_queue_time` are rejected with an error.

## Monitoring chproxy

chproxy exposes Prometheus metrics at `/metrics`:

```bash
curl http://chproxy-host:9090/metrics
```

Key metrics include `request_sum_total`, `request_success_total`, `cache_hits_total`, `cache_miss_total`, `concurrent_queries`, and `proxied_response_duration_seconds`. You can configure a metric prefix via the `server.metrics.namespace` option.

## Health Check Endpoint

```bash
curl http://chproxy-host:9090/ping
# Proxies to a backend ClickHouse /ping, which returns "Ok." on success
```

## Summary

chproxy is a purpose-built proxy for ClickHouse that adds features unavailable in generic load balancers: per-user routing, query execution limits, response caching, and ClickHouse-aware health checking. It is especially valuable for multi-tenant environments where you need to isolate different user classes and protect your cluster from runaway queries.
