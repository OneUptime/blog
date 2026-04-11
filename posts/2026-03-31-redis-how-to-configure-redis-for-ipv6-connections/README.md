# How to Configure Redis for IPv6 Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, IPv6, Networking, Configuration, Security

Description: Configure Redis to listen on IPv6 addresses, enable dual-stack IPv4/IPv6 support, and secure IPv6 Redis connections with passwords and firewall rules.

---

## IPv6 Support in Redis

Redis supports IPv6 natively. You can configure it to listen on IPv6 addresses, including the loopback (`::1`), specific interface addresses, or all interfaces (`::`) for dual-stack deployments.

## Checking IPv6 Availability

Before configuring Redis for IPv6, verify your system has IPv6 support:

```bash
ip -6 addr show
# Should list IPv6 addresses

# Check if IPv6 is enabled
cat /proc/sys/net/ipv6/conf/all/disable_ipv6
# 0 = enabled, 1 = disabled
```

## Configuring Redis for IPv6-Only

To bind Redis to the IPv6 loopback only:

```text
# redis.conf
bind ::1
```

To listen on a specific IPv6 interface address:

```text
bind 2001:db8::1
```

To listen on all IPv6 interfaces:

```text
bind ::
```

## Dual-Stack IPv4 and IPv6 Configuration

For most production setups, you want Redis to accept both IPv4 and IPv6 connections:

```text
# redis.conf
bind 127.0.0.1 ::1
```

For accepting remote connections on both protocols:

```text
# redis.conf
bind 0.0.0.0 ::
protected-mode yes
requirepass yourStrongPassword123!
```

### Full Secure Configuration Example

```text
# /etc/redis/redis.conf

# Bind to all IPv4 and IPv6 interfaces
bind 0.0.0.0 ::

# Security
protected-mode yes
requirepass yourStrongPassword123!

# Port
port 6379

# TLS (optional but recommended for production)
# tls-port 6380
# tls-cert-file /etc/redis/tls/redis.crt
# tls-key-file /etc/redis/tls/redis.key
```

## Restarting and Verifying

```bash
sudo systemctl restart redis
ss -tlnp6 | grep redis
```

Expected output for dual-stack:

```text
tcp6   LISTEN 0      128    [::1]:6379    [::]:*    users:(("redis-server",pid=12345,fd=9))
tcp6   LISTEN 0      128    *:6379        [::]:*    users:(("redis-server",pid=12345,fd=8))
```

Also check IPv4 binding:

```bash
ss -tlnp | grep redis
```

## Connecting to Redis via IPv6

### Using redis-cli

```bash
# Connect to IPv6 loopback
redis-cli -h ::1 -p 6379 PING

# Connect to a specific IPv6 address (bracket notation not needed in redis-cli)
redis-cli -h 2001:db8::1 -p 6379 -a yourpassword PING
```

### Python (redis-py)

```python
import redis

# IPv6 loopback
r = redis.Redis(host='::1', port=6379)

# Specific IPv6 address
r = redis.Redis(
    host='2001:db8::1',
    port=6379,
    password='yourpassword'
)

r.ping()
```

### Node.js (ioredis)

```javascript
const Redis = require('ioredis');

// IPv6 address
const redis = new Redis({
  host: '::1',
  port: 6379,
  family: 6  // Force IPv6
});

// Or with password
const redis = new Redis({
  host: '2001:db8::1',
  port: 6379,
  password: 'yourpassword',
  family: 6
});
```

## Firewall Rules for IPv6

### UFW (Ubuntu/Debian)

```bash
# Allow Redis from an IPv6 subnet
sudo ufw allow from 2001:db8::/32 to any port 6379

# Allow from a specific IPv6 host
sudo ufw allow from 2001:db8::10 to any port 6379

# Block all other IPv6 access to Redis
sudo ufw deny proto tcp to any port 6379
```

### ip6tables

```bash
# Allow from specific IPv6 subnet
ip6tables -A INPUT -s 2001:db8::/32 -p tcp --dport 6379 -j ACCEPT

# Allow from loopback
ip6tables -A INPUT -i lo -p tcp --dport 6379 -j ACCEPT

# Deny all other access
ip6tables -A INPUT -p tcp --dport 6379 -j DROP
```

## Redis Cluster with IPv6

Redis Cluster supports IPv6. Configure each node with an IPv6 bind address and cluster-announce-ip:

```text
# redis-node.conf
bind :: 0.0.0.0
cluster-enabled yes
cluster-config-file /etc/redis/cluster/nodes.conf
cluster-node-timeout 5000
cluster-announce-ip 2001:db8::1
cluster-announce-port 6379
cluster-announce-bus-port 16379
```

Create the cluster:

```bash
redis-cli --cluster create \
  [2001:db8::1]:6379 \
  [2001:db8::2]:6379 \
  [2001:db8::3]:6379 \
  [2001:db8::4]:6379 \
  [2001:db8::5]:6379 \
  [2001:db8::6]:6379 \
  --cluster-replicas 1
```

## Redis Sentinel with IPv6

```text
# sentinel.conf
bind :: 0.0.0.0
sentinel monitor mymaster 2001:db8::1 6379 2
sentinel auth-pass mymaster yourpassword
```

## Common Issues

### IPv6 Not Available on the System

```bash
# Enable IPv6
echo "0" | sudo tee /proc/sys/net/ipv6/conf/all/disable_ipv6
# Make permanent
echo "net.ipv6.conf.all.disable_ipv6 = 0" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Client Cannot Connect via IPv6

Check if the client library is resolving to IPv4 instead:

```python
import socket
# Test DNS resolution
print(socket.getaddrinfo('redis-host', 6379, socket.AF_INET6))
```

## Summary

Configure Redis for IPv6 by updating the `bind` directive with IPv6 addresses (`::` for all IPv6 interfaces, `::1` for loopback). For dual-stack support, use `bind 0.0.0.0 ::` to accept both protocols simultaneously. Always pair open bindings with `requirepass` and firewall rules to restrict which hosts can connect. Test connectivity with `redis-cli -h ::1` and verify the binding with `ss -tlnp6`.
