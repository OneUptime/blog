# How to Configure Memcached to Bind to IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Memcached, Caching, In-Memory, Performance

Description: Learn how to configure Memcached to listen on IPv6 addresses, bind to specific IPv6 interfaces, and connect Memcached clients over IPv6.

## Memcached IPv6 Start Options

```bash
# Start Memcached on specific IPv6 address

memcached -l 2001:db8::10 -p 11211

# Listen on IPv6 loopback
memcached -l ::1 -p 11211

# Listen on all IPv6 interfaces
memcached -l :: -p 11211

# Listen on both IPv4 and IPv6
memcached -l 0.0.0.0,:: -p 11211

# With additional options
memcached -l 2001:db8::10 -p 11211 -m 512 -c 1024 -t 4 -d
```

## Systemd Service Configuration

```ini
# /etc/systemd/system/memcached.service.d/override.conf
# Or edit /etc/default/memcached (Debian/Ubuntu)
# Or /etc/sysconfig/memcached (RHEL/CentOS)

[Service]
ExecStart=
ExecStart=/usr/bin/memcached -l 2001:db8::10 -p 11211 -m 512 -u memcache
```

## Debian/Ubuntu Configuration File

```bash
# /etc/memcached.conf

# Memory limit
-m 512

# Port
-p 11211

# Listen on IPv6 address
-l 2001:db8::10

# Or listen on all interfaces (including IPv6)
# -l ::

# Number of threads
-t 4

# Connection limit
-c 1024

# Run as daemon
-d
```

## RHEL/CentOS Configuration

```bash
# /etc/sysconfig/memcached

PORT="11211"
USER="memcached"
MAXCONN="1024"
CACHESIZE="512"

# IPv6 bind address
OPTIONS="-l 2001:db8::10"

# For all interfaces:
# OPTIONS="-l ::"
```

## Verify and Test

```bash
# Restart Memcached
systemctl restart memcached

# Check listening on IPv6
ss -6 -tlnp | grep memcached
# Expected: [2001:db8::10]:11211

# Test with netcat
echo -e "stats\nquit" | nc -6 2001:db8::10 11211

# Test set and get operations
echo -e "set testkey 0 60 5\nhello\nget testkey\nquit" | nc -6 2001:db8::10 11211

# Test with memcstat (libmemcached-tools)
memcstat --servers=[2001:db8::10]:11211
```

## Python Memcached Client over IPv6

```python
import pymemcache.client.base as memcache

# Connect to Memcached via IPv6
# Note: Use tuple (host, port) for IPv6
client = memcache.Client(
    ('2001:db8::10', 11211),
    socket_module=__import__('socket'),
    connect_timeout=5.0,
    timeout=5.0
)

# Set a value
client.set('greeting', 'Hello from IPv6!', expire=300)

# Get a value
value = client.get('greeting')
print(f"Retrieved: {value.decode()}")

# Delete a key
client.delete('greeting')

client.close()
```

## Multiple Servers with pylibmc

```python
import pylibmc

# Connect to multiple Memcached servers over IPv6
mc = pylibmc.Client(
    ["[2001:db8::10]:11211", "[2001:db8::11]:11211"],
    binary=True,
    behaviors={"tcp_nodelay": True, "ketama": True}
)

mc.set("key1", "value1", time=300)
result = mc.get("key1")
print(result)
```

## Summary

Configure Memcached for IPv6 with the `-l 2001:db8::10` flag, or use `-l ::` for all interfaces. On Debian/Ubuntu, add `-l 2001:db8::10` to `/etc/memcached.conf`. On RHEL/CentOS, set `OPTIONS="-l 2001:db8::10"` in `/etc/sysconfig/memcached`. Restart with `systemctl restart memcached`. Test with `echo -e "stats\nquit" | nc -6 2001:db8::10 11211`. Python clients use `('2001:db8::10', 11211)` as the server tuple.
