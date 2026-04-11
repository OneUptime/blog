# How to Configure Redis Bind Address and Network Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Configuration, Network, Security, Bind Address

Description: Learn how to configure Redis bind address, port, and network settings to control which interfaces accept connections and secure your deployment.

---

## What Is the bind Directive in Redis?

The `bind` directive in redis.conf specifies which network interfaces Redis listens on for incoming connections. In older Redis versions (before 3.2), the default was to bind to all interfaces (`0.0.0.0`), which exposed it to unintended networks. Since Redis 3.2, the default binds to loopback only (`127.0.0.1 -::1`). Restricting the bind address is a fundamental security measure.

## Default Behavior

In recent Redis versions, the default configuration binds to loopback only:

```text
# redis.conf default
bind 127.0.0.1 -::1
```

This means Redis only accepts connections from the local machine. The `-` prefix before `::1` makes the IPv6 binding optional (won't fail if IPv6 is unavailable).

## Binding to Specific Interfaces

```text
# redis.conf

# Loopback only (most restrictive)
bind 127.0.0.1

# Loopback + specific private interface
bind 127.0.0.1 10.0.1.5

# Multiple specific interfaces
bind 127.0.0.1 192.168.1.100 10.0.0.50

# All interfaces (not recommended for production)
bind 0.0.0.0
```

## Configuring the Port

```text
# redis.conf

# Default port
port 6379

# Custom port for multi-instance setups
port 6380

# Disable TCP (Unix socket only)
port 0
```

## Unix Socket for Local-Only Access

For applications on the same host, Unix sockets bypass TCP overhead entirely:

```text
# redis.conf
unixsocket /var/run/redis/redis.sock
unixsocketperm 770
port 0  # Disable TCP if Unix socket is exclusive
```

Connect via socket:

```bash
redis-cli -s /var/run/redis/redis.sock ping
```

## TCP Keep-Alive

Configure keep-alive to detect dead connections:

```text
# redis.conf
tcp-keepalive 300
```

This sends a keep-alive probe every 300 seconds. It helps Redis detect and close stale connections from crashed clients.

## Connection Timeout

```text
# redis.conf

# Close idle connections after N seconds (0 = never)
timeout 300

# TCP backlog queue size
tcp-backlog 511
```

## Python Example: Connecting to a Non-Default Bind

```python
import redis

# Default connection (127.0.0.1:6379)
r_default = redis.Redis(host="127.0.0.1", port=6379)

# Connection to a Redis on a specific internal interface
r_internal = redis.Redis(host="10.0.1.5", port=6379, socket_timeout=5)

# Via Unix socket
r_socket = redis.Redis(unix_socket_path="/var/run/redis/redis.sock")

# Test connectivity
try:
    r_internal.ping()
    print("Internal connection OK")
except redis.ConnectionError as e:
    print(f"Connection failed: {e}")
```

## Multi-Instance Configuration on Same Host

Run multiple Redis instances by binding to different IPs or ports:

```text
# /etc/redis/redis-cache.conf
bind 127.0.0.1
port 6379
maxmemory 1gb
maxmemory-policy allkeys-lru

# /etc/redis/redis-sessions.conf
bind 127.0.0.1
port 6380
maxmemory 512mb
maxmemory-policy volatile-lru
```

Start each:

```bash
redis-server /etc/redis/redis-cache.conf
redis-server /etc/redis/redis-sessions.conf
```

## Docker Network Configuration

In Docker, bind to `0.0.0.0` within the container but control access through Docker networks:

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    command: redis-server --bind 0.0.0.0 --protected-mode no
    networks:
      - backend
    # Do NOT expose port to host in production
    # ports:
    #   - "6379:6379"

  app:
    image: myapp:latest
    networks:
      - backend

networks:
  backend:
    driver: bridge
```

## Verifying Bind Configuration

```bash
# Check what Redis is listening on
redis-cli CONFIG GET bind
# 1) "bind"
# 2) "127.0.0.1"

# From the OS, check listening sockets
ss -tlnp | grep redis
# LISTEN 0 511 127.0.0.1:6379 0.0.0.0:*

# Or with netstat
netstat -tlnp | grep 6379
```

## Kubernetes Service Exposure

When Redis runs in Kubernetes, use ClusterIP service type to limit exposure:

```yaml
# redis-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: redis
spec:
  type: ClusterIP   # Only accessible within the cluster
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379
```

## Summary

The `bind` directive controls which network interfaces Redis listens on. Always restrict it to specific internal IP addresses in production rather than `0.0.0.0`. Use Unix sockets for same-host application connections to eliminate TCP overhead. Combine bind restrictions with `protected-mode`, TLS, and ACL authentication for a defense-in-depth approach to Redis network security.
