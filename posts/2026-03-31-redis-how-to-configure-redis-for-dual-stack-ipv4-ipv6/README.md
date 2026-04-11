# How to Configure Redis for Dual-Stack (IPv4 + IPv6)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, IPv4, IPv6, Dual-Stack, Configuration, Networking

Description: Learn how to configure Redis to listen on both IPv4 and IPv6 addresses simultaneously for dual-stack deployments with practical examples.

---

A dual-stack Redis configuration allows the server to accept connections from both IPv4 and IPv6 clients simultaneously. This is useful in environments where some clients connect over IPv4 and others over IPv6 without requiring separate Redis instances.

## Understanding the bind Directive

Redis's `bind` directive in `redis.conf` controls which interfaces Redis listens on. You can specify multiple addresses separated by spaces.

```text
bind 0.0.0.0 ::0
```

- `0.0.0.0` - Listen on all IPv4 interfaces
- `::0` or `::` - Listen on all IPv6 interfaces

## Configuring Dual-Stack Listening

Edit `/etc/redis/redis.conf`:

```text
# Listen on all IPv4 and IPv6 interfaces
bind 0.0.0.0 ::0

# Or bind to specific addresses
# bind 192.168.1.10 2001:db8::1

port 6379
protected-mode yes
```

Restart Redis:

```bash
sudo systemctl restart redis
```

Verify Redis is listening on both stacks:

```bash
ss -tlnp | grep 6379
# Should show both 0.0.0.0:6379 and :::6379
```

Or using netstat:

```bash
netstat -tlnp | grep redis
```

## Binding to Specific Addresses

For more controlled deployments, bind to specific IP addresses:

```text
# Bind to loopback on both stacks
bind 127.0.0.1 ::1

# Bind to specific public addresses on both stacks
bind 10.0.0.5 fd00::5
```

## Testing Connectivity

```bash
# Test IPv4 connection
redis-cli -h 127.0.0.1 -p 6379 PING

# Test IPv6 connection
redis-cli -h ::1 -p 6379 PING

# Test with specific IPv6 address
redis-cli -h "fd00::5" -p 6379 PING
```

## Connecting from Clients

```python
import redis

# Connect via IPv4
r_v4 = redis.Redis(host='127.0.0.1', port=6379, decode_responses=True)

# Connect via IPv6
r_v6 = redis.Redis(host='::1', port=6379, decode_responses=True)

r_v4.ping()
r_v6.ping()
```

```javascript
const Redis = require('ioredis');

// IPv4
const redisV4 = new Redis({ host: '127.0.0.1', port: 6379 });

// IPv6
const redisV6 = new Redis({ host: '::1', port: 6379, family: 6 });
```

## Firewall Rules for Dual-Stack

Ensure your firewall allows Redis traffic on both IPv4 and IPv6:

```bash
# UFW
sudo ufw allow from 10.0.0.0/8 to any port 6379
sudo ufw allow from fd00::/8 to any port 6379

# iptables IPv4
sudo iptables -A INPUT -s 10.0.0.0/8 -p tcp --dport 6379 -j ACCEPT

# ip6tables IPv6
sudo ip6tables -A INPUT -s fd00::/8 -p tcp --dport 6379 -j ACCEPT
```

## Checking the Effective Bind Configuration

```bash
redis-cli CONFIG GET bind
```

## Redis 7.0+ bind-source-addr

Redis 7.0 added `bind-source-addr` to control the source address used for outbound connections (replication, cluster bus):

```text
bind-source-addr ""
```

Leave empty to let the OS choose the source address based on routing.

## Summary

Configure Redis for dual-stack by setting `bind 0.0.0.0 ::0` in `redis.conf`, which makes Redis listen on all IPv4 and IPv6 interfaces simultaneously. Use `ss -tlnp` to verify both are active, apply firewall rules for both protocol families, and specify `family: 6` in your client library when explicitly forcing an IPv6 connection.
