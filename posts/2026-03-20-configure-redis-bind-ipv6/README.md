# How to Configure Redis to Bind to IPv6 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Redis, BIND, Database, Cache Configuration

Description: Learn how to configure Redis to listen on IPv6 addresses, including binding to specific IPv6 interfaces, enabling dual-stack support, and securing IPv6 Redis connections.

## Redis bind Configuration

```ini
# /etc/redis/redis.conf

# Default: only localhost

bind 127.0.0.1 -::1

# Listen on all IPv4 and IPv6 interfaces (not recommended without firewall)
bind 0.0.0.0 ::

# Listen on specific IPv6 address and localhost
bind ::1 2001:db8::10 127.0.0.1

# IPv6 only
bind ::1 2001:db8::10
```

Note: The `-` prefix in `-::1` means "optional bind" - Redis won't fail if the address is unavailable.

## Configure Redis for Dual-Stack Access

```ini
# /etc/redis/redis.conf

# Dual-stack: listen on both IPv4 and IPv6 loopback
bind 127.0.0.1 ::1

# Dual-stack: listen on all interfaces (secure with requirepass and firewall)
bind 0.0.0.0 ::

# For remote access on specific interfaces
bind 192.168.1.10 2001:db8::10

# Port configuration
port 6379

# Require password for all connections
requirepass YourStrongRedisPassword
```

## Apply Configuration

```bash
# Restart Redis
systemctl restart redis

# Verify Redis is listening on IPv6
ss -6 -tlnp | grep redis
# Expected: tcp6  LISTEN  0  128  [::]:6379  [::]:*  (redis-server)

# Or
redis-cli -h ::1 ping
# PONG
```

## Test IPv6 Redis Connection

```bash
# Connect to Redis via IPv6 loopback
redis-cli -h ::1 ping

# Connect via specific IPv6 address (from another host)
redis-cli -h 2001:db8::10 -p 6379 ping

# Connect with authentication
redis-cli -h 2001:db8::10 -p 6379 -a YourPassword ping

# Test from Python
# import redis
# r = redis.Redis(host='2001:db8::10', port=6379, password='YourPassword')
# r.ping()  # True

# Test from Node.js
# const redis = require('redis');
# const client = redis.createClient({ socket: { host: '2001:db8::10', port: 6379 } });
```

## Secure Remote IPv6 Redis Access

```ini
# /etc/redis/redis.conf

# Bind to specific IPv6 address
bind 2001:db8::10 ::1

# Require authentication
requirepass StrongPassword123!

# Enable TLS for remote access (Redis 6+)
tls-port 6380
tls-cert-file /etc/redis/ssl/redis.crt
tls-key-file /etc/redis/ssl/redis.key
tls-ca-cert-file /etc/redis/ssl/ca.crt
tls-auth-clients yes
```

```bash
# Firewall: allow Redis only from specific IPv6 subnet
ip6tables -A INPUT -p tcp --dport 6379 \
    -s 2001:db8:abcd::/48 -j ACCEPT
ip6tables -A INPUT -p tcp --dport 6379 -j DROP
```

## Protected Mode Consideration

```ini
# protected-mode is on by default
# It blocks access from non-loopback addresses if no password is set
# When binding to remote addresses, either:
# 1. Set requirepass (recommended)
# 2. Or disable protected-mode (NOT recommended)

protected-mode yes   # Keep enabled
requirepass YourStrongPassword   # Required for remote access
```

## Summary

Configure Redis IPv6 binding with `bind ::1 2001:db8::10` in `redis.conf`. For all-interface binding, use `bind 0.0.0.0 ::`. The `-` prefix (e.g., `-::1`) makes a bind optional. Always set `requirepass` when enabling remote access. Restart Redis with `systemctl restart redis` and verify with `ss -6 -tlnp | grep redis` and `redis-cli -h ::1 ping`. Use firewall rules to restrict which IPv6 addresses can connect.
