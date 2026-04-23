# How to Configure Redis bind Directive for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, IPv4, BIND, Configuration, Security, Cache

Description: Configure Redis bind directive in redis.conf to listen on specific IPv4 addresses, limit exposure to trusted interfaces, and verify the binding is correct.

## Introduction

In the sample `redis.conf` shipped with Redis, the default bind is loopback-only, commonly `127.0.0.1` (and often `::1`). If no `bind` directive is specified, Redis listens on all available interfaces and relies on protected mode. To allow remote connections when using the sample config, add additional IP addresses to the `bind` directive. Redis will listen on all listed IPs, making it critical to list only trusted interfaces.

## Basic bind Configuration

```bash
# /etc/redis/redis.conf

# Default (local only)

bind 127.0.0.1

# Allow remote connections on specific IP + loopback
bind 127.0.0.1 10.0.0.5

# Allow on all IPv4 interfaces (use only with authentication and firewall rules)
bind 0.0.0.0

# Multiple specific IPs
bind 127.0.0.1 10.0.0.5 192.168.1.5
```

## Verifying bind Configuration

```bash
# Restart Redis after changes
sudo systemctl restart redis-server

# Verify Redis is listening on expected addresses
sudo ss -tlnp | grep redis
# Expected: 127.0.0.1:6379 and 10.0.0.5:6379

# Or with netstat
sudo netstat -tlnp | grep redis
```

## Security Settings to Accompany Remote Bind

```bash
# /etc/redis/redis.conf

# Bind to specific IP
bind 127.0.0.1 10.0.0.5

# Require password authentication
requirepass "YourStrongRedisPassword123!"

# Keep protected mode enabled
protected-mode yes

# Rename dangerous commands (optional extra security; ACLs are preferred in Redis 6+)
rename-command FLUSHALL "FLUSHALL_DISABLED"
rename-command CONFIG "CONFIG_DISABLED"
rename-command DEBUG ""

# Restrict which users can connect (Redis 6+ ACL)
# aclfile /etc/redis/users.acl
```

## Restrict Source IPs with Firewall Rules

```bash
# Redis doesn't natively filter by source IP
# Use iptables to restrict source IPs:

sudo iptables -A INPUT -p tcp --dport 6379 -s 10.0.0.0/24 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 6379 -j DROP

# Or use SSH tunnels for remote access instead of exposing Redis:
# On app server: ssh -L 6380:127.0.0.1:6379 user@redis-server
# App connects to: redis://127.0.0.1:6380
```

## Testing Connections

```bash
# Test local connection
redis-cli -a 'YourStrongRedisPassword123!' ping
# Expected: PONG

# Test remote connection (from another host)
redis-cli -h 10.0.0.5 -p 6379 -a 'YourStrongRedisPassword123!' ping
# Expected: PONG

# Test that blocked IPs cannot connect
# From an unauthorized host:
redis-cli -h 10.0.0.5 -p 6379 ping
# Expected: Could not connect to Redis at 10.0.0.5:6379: Connection timed out
# (iptables DROP silently discards packets)

# Test server info
redis-cli -h 10.0.0.5 -p 6379 -a 'YourStrongRedisPassword123!' info server | grep -E "redis_version|tcp_port"
```

## Conclusion

Redis `bind` specifies which IP addresses Redis creates listening sockets on. Always include `127.0.0.1` for local connections. Add specific IPv4 addresses for remote access rather than `0.0.0.0`. Pair remote binding with authentication (`requirepass` or ACLs) and iptables rules to restrict which client IPs can connect, since Redis has no native IP-based access control.
