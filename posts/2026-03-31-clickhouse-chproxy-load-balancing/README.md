# How to Use chproxy for ClickHouse Load Balancing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, chproxy, Load Balancing, Proxy, High Availability

Description: Learn how to configure chproxy as a reverse proxy for ClickHouse to enable load balancing, query routing, rate limiting, and user-level resource controls.

---

`chproxy` is an open-source HTTP proxy for ClickHouse that provides load balancing, query routing by user, rate limiting, query timeouts, and connection pooling. It sits between your application and ClickHouse nodes.

## Why Use chproxy

- Route read queries to replicas, writes to the primary
- Enforce per-user query limits and timeouts
- Add authentication without changing ClickHouse users
- Health-check and skip unhealthy nodes automatically

## Installation

```bash
# Download the latest release
wget https://github.com/ContentSquare/chproxy/releases/latest/download/chproxy_linux_amd64
chmod +x chproxy_linux_amd64
mv chproxy_linux_amd64 /usr/local/bin/chproxy
```

## Basic Configuration

Create `config.yml`:

```yaml
server:
  http:
    listen_addr: ":9090"

users:
  - name: "reader"
    password: "readpass"
    to_cluster: "analytics_replicas"
    to_user: "default"

  - name: "writer"
    password: "writepass"
    to_cluster: "analytics_primary"
    to_user: "default"

clusters:
  - name: "analytics_replicas"
    nodes:
      - "clickhouse-replica-01:8123"
      - "clickhouse-replica-02:8123"
    heartbeat:
      interval: 5s
      timeout: 3s
      request: "/?query=SELECT%201"

  - name: "analytics_primary"
    nodes:
      - "clickhouse-primary-01:8123"
```

## Starting chproxy

```bash
chproxy -config config.yml
```

## Query Routing

Applications connect to chproxy instead of ClickHouse directly:

```bash
# Read query - routed to replica cluster
curl "http://chproxy-host:9090/?user=reader&password=readpass" \
  --data "SELECT count() FROM events"

# Write query - routed to primary
curl "http://chproxy-host:9090/?user=writer&password=writepass" \
  --data "INSERT INTO events VALUES (...)"
```

## Adding Rate Limits and Timeouts

```yaml
users:
  - name: "dashboard_user"
    password: "dashpass"
    to_cluster: "analytics_replicas"
    to_user: "default"
    max_concurrent_queries: 5
    max_execution_time: 30s
    requests_per_minute: 100
```

## Caching Query Results

chproxy supports response caching:

```yaml
caches:
  - name: "short_cache"
    mode: "file_system"
    file_system:
      dir: "/var/cache/chproxy"
      max_size: 500Mb
    expire: 1m

users:
  - name: "cached_reader"
    cache: "short_cache"
    to_cluster: "analytics_replicas"
    to_user: "default"
```

## Monitoring chproxy

chproxy exposes Prometheus metrics:

```bash
curl http://chproxy-host:9090/metrics
```

## Summary

chproxy is a production-grade proxy for ClickHouse that adds routing, rate limiting, caching, and health checking without modifying your ClickHouse cluster configuration. It is a practical choice for multi-user analytics platforms.
