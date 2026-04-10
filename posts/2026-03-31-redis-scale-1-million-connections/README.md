# How to Scale Redis for 1 Million Concurrent Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Scalability, Connection Pooling, Performance, Tuning

Description: Configure Linux, Redis, and your application stack to handle 1 million concurrent Redis connections through OS tuning, connection pooling, and proxy layers.

---

Redis can handle tens of thousands of concurrent connections per instance by default, but reaching 1 million requires tuning at every layer: Linux kernel, Redis configuration, and your application connection management strategy.

## Linux Kernel Tuning

The OS imposes the first limits. Apply these settings:

```bash
# /etc/sysctl.conf
cat >> /etc/sysctl.conf << 'EOF'
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.core.netdev_max_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15
fs.file-max = 2097152
EOF

sysctl -p
```

Increase the per-process file descriptor limit:

```bash
# /etc/security/limits.conf
redis soft nofile 1048576
redis hard nofile 1048576
```

Verify:

```bash
ulimit -n
cat /proc/$(pgrep redis-server)/limits | grep open
```

## Redis Configuration

```text
# redis.conf
maxclients 1000000
tcp-backlog 65535
tcp-keepalive 300
timeout 0
bind-source-addr ""
```

Setting `maxclients` above the OS file descriptor limit will be capped automatically. Redis logs the effective limit at startup.

## Using a Proxy Layer

A single Redis instance rarely handles 1 million raw TCP connections efficiently. Use a proxy to multiplex:

```bash
# Twemproxy config: 1M app connections -> 200 backend connections
redis_pool:
  listen: 0.0.0.0:22121
  redis: true
  servers:
    - 127.0.0.1:6379:1
```

Or use Envoy as a connection pooler:

```text
clusters:
  - name: redis_cluster
    connect_timeout: 0.25s
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    upstream_connection_options:
      tcp_keepalive: {}
    circuit_breakers:
      thresholds:
        - max_connections: 500
```

## Application-Side Connection Pooling

Never open one connection per request. Use a pool:

```python
import redis

pool = redis.ConnectionPool(
    host="localhost",
    port=6379,
    max_connections=100,      # per process
    socket_connect_timeout=1,
    socket_timeout=1,
    decode_responses=True,
)

client = redis.Redis(connection_pool=pool)
```

With 10,000 application processes each using a pool of 100, you reach 1 million connections. The proxy reduces the actual connections to Redis to a manageable number.

## Monitoring Active Connections

```bash
redis-cli INFO clients | grep -E "connected_clients|blocked_clients|tracking_clients"
```

Track over time with Prometheus and Redis Exporter:

```bash
docker run -p 9121:9121 oliver006/redis_exporter \
  --redis.addr redis://localhost:6379
```

Alert when `redis_connected_clients` approaches `maxclients`.

## Identifying Top Clients

```bash
redis-cli CLIENT LIST | awk -F'[= ]' '{print $4}' | cut -d: -f1 | sort | uniq -c | sort -rn | head -20
```

## Summary

Reaching 1 million concurrent Redis connections requires tuning Linux file descriptors, setting `maxclients` in Redis, deploying a proxy layer to multiplex connections, and enforcing connection pooling in every application process. The proxy is the key architectural component - it absorbs client connections while keeping the actual Redis connection count low and manageable.
