# How to Configure Redis for IPv4 Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, IPv4, Networking, Configuration, Security

Description: Configure Redis to accept IPv4 connections by setting the bind directive, adjusting protected mode, and securing your Redis instance for different network environments.

---

## Default Redis Network Behavior

By default, Redis binds to `127.0.0.1` (loopback only), which means it only accepts connections from the local machine. To accept connections from remote IPv4 hosts, you need to modify the `bind` directive in `redis.conf`.

## The bind Directive

The `bind` directive controls which network interfaces Redis listens on. You can specify one or more IPv4 addresses:

```text
# Listen on loopback only (default)
bind 127.0.0.1

# Listen on a specific network interface
bind 192.168.1.10

# Listen on loopback and a specific interface
bind 127.0.0.1 192.168.1.10

# Listen on all interfaces (use with authentication)
bind 0.0.0.0
```

Note: The `bind` directive cannot be changed at runtime via `CONFIG SET` - it is an immutable parameter. You must edit `redis.conf` and restart Redis for bind changes to take effect.

## Configuring Redis for a Specific IPv4 Address

### Step 1 - Identify Your Network Interface

```bash
ip addr show
# or
hostname -I
```

Find the IPv4 address of the interface you want Redis to listen on.

### Step 2 - Edit redis.conf

```bash
sudo nano /etc/redis/redis.conf
```

Update the bind line:

```text
bind 127.0.0.1 10.0.0.5
```

### Step 3 - Disable or Adjust Protected Mode

If you want Redis to accept connections from remote hosts, you must either:
- Set a password (`requirepass`) and keep `protected-mode yes`
- Explicitly disable protected mode (not recommended for production)

```text
# Recommended: keep protected-mode on and set a password
protected-mode yes
requirepass yourStrongPassword123!
```

### Step 4 - Restart Redis

```bash
sudo systemctl restart redis
sudo systemctl status redis
```

### Step 5 - Verify the Binding

```bash
ss -tlnp | grep redis
# or
netstat -tlnp | grep 6379
```

Expected output:

```text
tcp    LISTEN 0      128    127.0.0.1:6379    0.0.0.0:*    users:(("redis-server",pid=12345,fd=7))
tcp    LISTEN 0      128    10.0.0.5:6379     0.0.0.0:*    users:(("redis-server",pid=12345,fd=8))
```

## Accepting Connections from All IPv4 Addresses

Binding to `0.0.0.0` makes Redis accept connections on all IPv4 interfaces:

```text
# redis.conf
bind 0.0.0.0
protected-mode yes
requirepass yourStrongPassword123!
```

Always use this with:
1. A strong `requirepass`
2. A firewall rule to restrict which IPs can reach port 6379

### Firewall Configuration (UFW)

```bash
# Allow Redis from a specific subnet only
sudo ufw allow from 10.0.0.0/24 to any port 6379

# Or from a specific IP
sudo ufw allow from 10.0.0.5 to any port 6379

# Block all other access
sudo ufw deny 6379
```

### Firewall Configuration (iptables)

```bash
# Allow from specific subnet
iptables -A INPUT -s 10.0.0.0/24 -p tcp --dport 6379 -j ACCEPT

# Deny all other access to Redis port
iptables -A INPUT -p tcp --dport 6379 -j DROP
```

## Connecting to Redis from a Remote IPv4 Host

Once Redis is bound to a remote-accessible IP:

```bash
redis-cli -h 10.0.0.5 -p 6379 -a yourpassword PING
```

In Python:

```python
import redis

r = redis.Redis(
    host='10.0.0.5',
    port=6379,
    password='yourStrongPassword123!'
)
r.ping()
```

## Using a Non-Default Port

You can also change the port from the default 6379:

```text
# redis.conf
bind 0.0.0.0
port 6380
requirepass yourPassword
```

## Checking the Redis Bind Configuration

```bash
redis-cli CONFIG GET bind
```

## Redis in Docker for IPv4 Connections

When running Redis in Docker, use the `-p` flag to map the port:

```bash
# Accept connections from all IPv4 interfaces on the host
docker run -d --name redis \
  -p 0.0.0.0:6379:6379 \
  redis:7 redis-server --requirepass yourpassword
```

Or in Docker Compose:

```yaml
services:
  redis:
    image: redis:7
    command: redis-server --requirepass yourpassword
    ports:
      - "0.0.0.0:6379:6379"
```

## Summary

Configure Redis for IPv4 connections by updating the `bind` directive in `redis.conf` with the IP address of the network interface to listen on. For remote access, set a strong `requirepass`, keep `protected-mode yes`, and use firewall rules (UFW or iptables) to restrict which IPv4 addresses can reach port 6379. Verify the binding with `ss -tlnp` and test remote connectivity with `redis-cli -h`.
