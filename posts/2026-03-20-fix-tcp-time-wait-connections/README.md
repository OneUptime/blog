# How to Fix Too Many TCP Connections in TIME_WAIT State

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Linux, TIME_WAIT, Networking, Performance, Kernel

Description: Understand why TIME_WAIT connections accumulate and apply kernel tuning to reduce their impact on port exhaustion and connection performance.

## Introduction

TIME_WAIT is a normal TCP state that every short-lived connection passes through after closing. RFC 9293 requires it to persist for 2×MSL; on Linux, TIME_WAIT is typically around 60 seconds. This helps ensure late packets don't confuse new connections. In high-traffic services handling thousands of short connections per second, the accumulation of TIME_WAIT sockets can exhaust local port ranges or use significant memory.

## Diagnosing the Problem

```bash
# Count TIME_WAIT connections

ss -Htn state time-wait | wc -l

# See which remote addresses have the most TIME_WAIT
ss -Htn state time-wait | awk '{print $4}' | sed -E 's/:[^:]+$//' | sort | uniq -c | sort -rn

# Check your ephemeral port range
sysctl net.ipv4.ip_local_port_range

# Count how many local ports are currently tied up in TIME_WAIT
ss -Htn state time-wait | awk '{print $3}' | sed -E 's/.*:([0-9]+)$/\1/' | sort -n | uniq | wc -l
# Compare this with ip_local_port_range; if a large share of ephemeral ports are tied up, you may be approaching port exhaustion
```

## Understanding Why TIME_WAIT Happens

```text
TIME_WAIT is usually created by the ACTIVE CLOSER - the side that sends the first FIN.

- HTTP/1.0 server closes connection after each request → server has TIME_WAIT
- HTTP client with connection pooling → client has TIME_WAIT when pool shrinks
- Microservice calling downstream API → calling service has TIME_WAIT
```

## Fix 1: Enable tcp_tw_reuse

Allows reusing TIME_WAIT sockets for new connections when the kernel considers it safe from the protocol viewpoint. The kernel documentation says this setting should not be changed without expert advice:

```bash
# Check current setting (current kernels default to 2 = loopback only)
sysctl net.ipv4.tcp_tw_reuse

# Allow reuse of TIME_WAIT sockets for new outbound connections
sysctl -w net.ipv4.tcp_tw_reuse=1

# Persist
echo "net.ipv4.tcp_tw_reuse=1" >> /etc/sysctl.conf
sysctl -p

# Note: Primarily helps clients that initiate many outbound connections
```

## Fix 2: Use HTTP Keep-Alive / Connection Pooling

The best fix: don't create so many short-lived connections in the first place:

```python
# Python requests with connection pooling (keeps connections alive)
import requests

# Without pooling (creates TIME_WAIT for each request)
# for url in urls:
#     requests.get(url)   # Bad: new connection each time

# With connection pooling (reuses connections)
adapter = requests.adapters.HTTPAdapter(
    pool_connections=10,
    pool_maxsize=20
)

with requests.Session() as session:
    session.mount('http://', adapter)
    session.mount('https://', adapter)

    for url in urls:
        session.get(url)   # Good: connection reused
```

## Fix 3: Expand the Local Port Range

More available ports means TIME_WAIT is less likely to cause port exhaustion:

```bash
# View current range
sysctl net.ipv4.ip_local_port_range

# Expand the range
sysctl -w net.ipv4.ip_local_port_range="10000 65535"
# Now 55535 ports available
```

## Fix 4: Don't Use tcp_fin_timeout for TIME_WAIT

```bash
# tcp_fin_timeout affects orphaned FIN_WAIT2 sockets, not TIME_WAIT
sysctl net.ipv4.tcp_fin_timeout
# Default: 60 seconds

# Changing this value does not reduce TIME_WAIT duration
```

## Monitoring Improvement

```bash
# Watch TIME_WAIT count over time
watch -n 5 "ss -Htn state time-wait | wc -l"

# After applying fixes, TIME_WAIT count should stop growing toward ephemeral port exhaustion
# A healthy system with short-lived connections may still have thousands of TIME_WAIT sockets
# - this is normal as long as you are not exhausting ip_local_port_range or hitting memory limits
```

## Conclusion

TIME_WAIT accumulation is a symptom of many short-lived connections, not a bug. The best fix is connection pooling and HTTP keep-alive to reduce connection churn. `tcp_tw_reuse` can help clients that make many outbound connections, but it should be changed deliberately. Expanding the local port range provides headroom. Avoid `tcp_tw_recycle` - it was removed in Linux 4.12 after being broken by NAT and timestamp behavior.
