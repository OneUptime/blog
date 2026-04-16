# How to Use HAProxy with ClickHouse for Load Balancing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, HAProxy, Load Balancing, High Availability, Networking

Description: Learn how to configure HAProxy as a load balancer in front of ClickHouse to distribute queries, improve availability, and handle failover.

---

## Why Use HAProxy with ClickHouse?

ClickHouse's `Distributed` table engine handles query distribution internally, but placing HAProxy in front of ClickHouse provides an external, language-agnostic load balancing layer. This is useful when clients connect over HTTP or TCP and you want health checking, failover, and traffic shaping without modifying application code.

## Installation

```bash
sudo apt-get install haproxy
```

## HAProxy Configuration for HTTP (Port 8123)

```text
frontend clickhouse_http
    bind *:8123
    default_backend clickhouse_http_nodes

backend clickhouse_http_nodes
    balance roundrobin
    option httpchk GET /?query=SELECT%201
    http-check expect status 200
    server ch1 10.0.0.1:8123 check inter 5s fall 3 rise 2
    server ch2 10.0.0.2:8123 check inter 5s fall 3 rise 2
    server ch3 10.0.0.3:8123 check inter 5s fall 3 rise 2
```

## HAProxy Configuration for Native TCP (Port 9000)

```text
frontend clickhouse_tcp
    bind *:9000
    mode tcp
    default_backend clickhouse_tcp_nodes

backend clickhouse_tcp_nodes
    mode tcp
    balance leastconn
    option tcp-check
    server ch1 10.0.0.1:9000 check inter 5s fall 3 rise 2
    server ch2 10.0.0.2:9000 check inter 5s fall 3 rise 2
    server ch3 10.0.0.3:9000 check inter 5s fall 3 rise 2
```

`leastconn` distributes new connections to the server with the fewest active connections - better for long-running analytical queries.

## Read vs. Write Separation

You can use ACLs to route writes to a specific node:

```text
frontend clickhouse_http
    bind *:8123
    acl is_insert url_beg -i /?query=INSERT
    use_backend clickhouse_primary if is_insert
    default_backend clickhouse_replicas

backend clickhouse_primary
    server ch-primary 10.0.0.1:8123 check

backend clickhouse_replicas
    balance roundrobin
    server ch2 10.0.0.2:8123 check
    server ch3 10.0.0.3:8123 check
```

## Enabling HAProxy Stats

```text
listen stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 10s
    stats auth admin:secret
```

Access at `http://your-haproxy-host:8404/stats` to monitor backend health.

## Health Check Verification

```bash
# Verify HAProxy is routing correctly
curl -s "http://haproxy-host:8123/?query=SELECT+hostName()"
```

Run this multiple times to verify requests are being distributed across nodes.

## Timeout Configuration

```text
defaults
    timeout connect  5s
    timeout client   300s
    timeout server   300s
```

Long-running ClickHouse queries can take minutes, so increase timeouts beyond typical web application defaults.

## Summary

HAProxy provides reliable HTTP and TCP load balancing for ClickHouse. Use the HTTP health check endpoint (`/?query=SELECT 1`) to detect failed nodes. Choose `roundrobin` for even distribution or `leastconn` for query-heavy workloads. For write isolation, route INSERT traffic to a dedicated primary backend and direct reads to replicas.
