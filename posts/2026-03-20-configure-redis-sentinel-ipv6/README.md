# How to Configure Redis Sentinel with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sentinel, IPv6, High Availability, Failover, Caching

Description: Configure Redis Sentinel for high availability with IPv6 addresses, enabling automatic failover between Redis primary and replica instances on IPv6 networks.

---

Redis Sentinel monitors Redis instances, notifies administrators of issues, and performs automatic failover. Configuring it for IPv6 requires setting bind addresses in both Redis and Sentinel configuration files.

## Redis Server IPv6 Configuration

```bash
# /etc/redis/redis.conf (Primary)

# Bind to specific IPv6 address and loopback

bind 2001:db8::1 ::1

# Or bind to all interfaces:
# bind :: 0.0.0.0

port 6379

# Protected mode (disable for IPv6 network testing)
protected-mode yes

# Replica configuration
replica-lazy-flush yes
```

```bash
# /etc/redis/redis.conf (Replica)
bind 2001:db8::2 ::1
port 6379

# Replicate from primary over IPv6
replicaof 2001:db8::1 6379
```

## Redis Sentinel Configuration for IPv6

```bash
# /etc/redis/sentinel.conf (on each Sentinel node)

# Sentinel bind address
bind 2001:db8::10 ::1
port 26379

# Monitor the primary Redis (using IPv6 address)
# Format: sentinel monitor <name> <ip> <port> <quorum>
sentinel monitor mymaster 2001:db8::1 6379 2

# Down-after-milliseconds (how long to wait before marking node down)
sentinel down-after-milliseconds mymaster 5000

# Failover timeout
sentinel failover-timeout mymaster 60000

# Parallel syncs (how many replicas sync simultaneously)
sentinel parallel-syncs mymaster 1

# Announce the Sentinel's own IPv6 address to peers
sentinel announce-ip 2001:db8::10
sentinel announce-port 26379
```

## Starting Redis and Sentinel

```bash
# Start primary Redis
sudo systemctl start redis-server

# Start replica Redis (on replica host)
sudo systemctl start redis-server

# Start Sentinel on each node
redis-sentinel /etc/redis/sentinel.conf &
# Or as systemd service:
sudo systemctl start redis-sentinel

# Verify binding
ss -tlnp | grep "6379\|26379"
```

## Testing Redis Sentinel over IPv6

```bash
# Connect to primary Redis over IPv6
redis-cli -h 2001:db8::1 -p 6379

# Test write/read
redis-cli -h 2001:db8::1 SET test "ipv6-works"
redis-cli -h 2001:db8::1 GET test

# Connect to Sentinel
redis-cli -h 2001:db8::10 -p 26379

# Get primary information from Sentinel
redis-cli -h 2001:db8::10 -p 26379 SENTINEL get-master-addr-by-name mymaster

# Check Sentinel state
redis-cli -h 2001:db8::10 -p 26379 SENTINEL masters

# View replicas
redis-cli -h 2001:db8::10 -p 26379 SENTINEL replicas mymaster
```

## Python Redis Client with Sentinel over IPv6

```python
from redis.sentinel import Sentinel

# Configure Sentinel with IPv6 addresses
sentinel = Sentinel(
    [
        ('2001:db8::10', 26379),
        ('2001:db8::11', 26379),
        ('2001:db8::12', 26379),
    ],
    socket_timeout=0.1
)

# Get primary (for writes)
primary = sentinel.master_for('mymaster', socket_timeout=0.1)
primary.set('foo', 'bar')

# Get replica (for reads)
replica = sentinel.slave_for('mymaster', socket_timeout=0.1)
value = replica.get('foo')
print(f"Value: {value}")
```

## Testing Automatic Failover

```bash
# Simulate primary failure
redis-cli -h 2001:db8::1 DEBUG SLEEP 30

# Watch Sentinel logs for failover
sudo tail -f /var/log/redis/sentinel.log

# Verify new primary after failover
redis-cli -h 2001:db8::10 -p 26379 \
  SENTINEL get-master-addr-by-name mymaster
```

## Firewall Rules for Redis Sentinel IPv6

```bash
# Redis port
sudo ip6tables -A INPUT -p tcp --dport 6379 -j ACCEPT
# Sentinel port
sudo ip6tables -A INPUT -p tcp --dport 26379 -j ACCEPT

sudo ip6tables-save > /etc/iptables/rules.v6
```

Redis Sentinel's bind and announce address configuration provides complete IPv6 support for high-availability Redis deployments, enabling automatic failover on IPv6 networks with the same reliability as IPv4 configurations.
