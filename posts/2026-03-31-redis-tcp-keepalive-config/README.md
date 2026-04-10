# How to Configure Redis TCP Keepalive

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, TCP, Keepalive, Network, Configuration

Description: Learn how to configure Redis tcp-keepalive to detect dead connections through network probes, prevent firewall timeouts, and maintain reliable long-lived connections.

---

TCP keepalive is a mechanism where the OS periodically sends small probe packets on idle TCP connections to verify the remote end is still alive. Redis uses it to detect crashed clients and prevent mid-tier firewalls from silently closing idle connections.

## The tcp-keepalive Setting

```bash
# Check current value
CONFIG GET tcp-keepalive
# Returns: 300 (default since Redis 3.2.1)

# Set keepalive interval (seconds)
CONFIG SET tcp-keepalive 60
```

```bash
# redis.conf
tcp-keepalive 300
```

A value of `0` disables TCP keepalive. The default `300` means Redis sends keepalive probes every 300 seconds on each idle connection.

## How TCP Keepalive Works

When a connection has been idle for `tcp-keepalive` seconds, the OS sends a TCP ACK probe to the remote host. If no response is received after several retries (controlled by OS settings), the connection is marked as dead and closed.

```text
Client ---- idle for 300s ----> Server
        <-- TCP keepalive probe --
Client crashed, no response
        After OS retries: connection closed by server
```

This happens below the Redis application layer - Redis itself just sees the connection as closed once the OS gives up.

## Why tcp-keepalive Matters in Cloud Environments

Cloud load balancers and NAT gateways often have idle connection timeouts:

```text
AWS NLB: 350 seconds idle timeout (TCP)
AWS ALB: 60 seconds idle timeout (HTTP)
GCP Load Balancer: 600 seconds
Azure Load Balancer: 4 minutes (240s)
```

If Redis keepalive is set to 300s, the OS sends keepalive probes before the NLB's 350s timeout fires, keeping the connection alive.

## How Redis Sets Keepalive Parameters

Since Redis 3.2, on Linux, Redis sets per-socket keepalive parameters that override the OS-level defaults:

- `TCP_KEEPIDLE` = the `tcp-keepalive` value (idle time before first probe)
- `TCP_KEEPINTVL` = `tcp-keepalive / 3` (interval between probes)
- `TCP_KEEPCNT` = 3 (number of probes before giving up)

So with `tcp-keepalive 60`, Redis configures each socket with: idle time 60s, probe interval 20s (60/3), and 3 retries. A dead connection is detected in about 60 + (20 * 3) = 120 seconds.

With the default `tcp-keepalive 300`: idle time 300s, probe interval 100s, 3 retries, giving about 300 + (100 * 3) = 600 seconds for detection.

## OS-Level Keepalive Defaults

The OS provides global keepalive defaults that apply to sockets without per-socket overrides. Since Redis sets per-socket values, these defaults do not affect Redis connections, but they are useful context:

```bash
# Linux: view default keepalive settings
cat /proc/sys/net/ipv4/tcp_keepalive_time    # Idle time before first probe (default: 7200s)
cat /proc/sys/net/ipv4/tcp_keepalive_intvl   # Interval between probes (default: 75s)
cat /proc/sys/net/ipv4/tcp_keepalive_probes  # Number of probes before giving up (default: 9)
```

For non-Redis applications or older Redis versions (< 3.2) that only set `SO_KEEPALIVE`, tuning these values speeds up dead connection detection:

```bash
# More aggressive keepalive (seconds)
sysctl -w net.ipv4.tcp_keepalive_time=60
sysctl -w net.ipv4.tcp_keepalive_intvl=10
sysctl -w net.ipv4.tcp_keepalive_probes=3

# Make persistent
echo "net.ipv4.tcp_keepalive_time=60" >> /etc/sysctl.conf
echo "net.ipv4.tcp_keepalive_intvl=10" >> /etc/sysctl.conf
echo "net.ipv4.tcp_keepalive_probes=3" >> /etc/sysctl.conf
sysctl -p
```

With these settings, a dead connection is detected in about 60 + (10 * 3) = 90 seconds.

## tcp-keepalive vs timeout

| Setting | What it detects | Mechanism |
|---------|----------------|-----------|
| `tcp-keepalive` | Dead TCP connections (network failure, crash) | OS TCP probe |
| `timeout` | Idle but healthy connections | Redis application timer |

Use both together for robust connection management:

```bash
# redis.conf - Detect dead connections AND close idle ones
tcp-keepalive 60
timeout 300
```

## Client-Side TCP Keepalive

Redis clients can also set TCP keepalive independently of the server:

```python
import redis, socket

# redis-py enables keepalive automatically on most platforms
r = redis.Redis(
    host="localhost",
    port=6379,
    socket_keepalive=True,
    socket_keepalive_options={
        socket.TCP_KEEPIDLE: 60,    # Idle time before first probe
        socket.TCP_KEEPINTVL: 10,   # Interval between probes
        socket.TCP_KEEPCNT: 3       # Number of probes
    }
)
```

## Verifying Keepalive is Active

```bash
# Check if SO_KEEPALIVE is set on Redis connections
ss -tnp | grep 6379
# Look for ESTABLISHED connections

# On Linux, check socket options
ss -tnpo state established '( dport = :6379 or sport = :6379 )'
# timer:(keepalive,...) in output confirms keepalive is active
```

## Recommended Settings by Environment

```bash
# Local development (fast feedback)
tcp-keepalive 30

# Production (balance between detection speed and overhead)
tcp-keepalive 60

# Cloud with aggressive NAT timeouts
tcp-keepalive 30

# Minimal overhead (default, tolerates up to 5-min dead connections)
tcp-keepalive 300
```

## Summary

Redis `tcp-keepalive` enables OS-level TCP probes to detect dead connections caused by network failures or crashed clients. The default of 300 seconds is suitable for most environments, but cloud deployments with aggressive load balancer timeouts benefit from 60 seconds or less. Pair `tcp-keepalive` with OS-level `tcp_keepalive_time` and `tcp_keepalive_intvl` tuning for reliable dead connection detection within a predictable time window.
