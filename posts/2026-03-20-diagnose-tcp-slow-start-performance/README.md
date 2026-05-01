# How to Diagnose TCP Slow Start Performance Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Slow Start, Performance, Networking, Congestion Control, Linux

Description: Understand how TCP slow start limits throughput for short-lived connections and learn techniques to mitigate its impact on small file transfers.

## Introduction

TCP slow start is the initial phase of congestion control where the sender begins with a small congestion window and doubles it each RTT until it reaches a threshold or detects congestion. For long-lived bulk transfers, slow start is a brief startup cost. But for short connections - web requests, API calls, database queries - slow start may dominate the entire transfer time, severely limiting effective throughput.

## Understanding Slow Start Impact

```text
Example: 100KB HTTP response payload, RTT = 50ms
Ignoring TCP handshake and request latency:

Without slow start issues:
Time = 100KB / 1Gbps = 0.8ms (negligible)

With slow start (initial window = 10 MSS = 14.6KB):
RTT 1: 14.6 KB sent
RTT 2: 29.2 KB sent (window doubled)
RTT 3: 58.4 KB sent (enough to complete the transfer)
Total data-transfer time: 3 × 50ms = 150ms for 100KB
Effective throughput: 100KB / 0.150s = 5.3 Mbps (out of 1 Gbps available!)
```

## Measuring Slow Start's Impact

```bash
# Time a small file download to see slow start dominance

time curl -s -o /dev/null http://10.20.0.5/100kb.bin -w "time_total: %{time_total}s\n"

# Compare with multiple requests in one curl process so the connection can be reused
time curl -s \
  -o /dev/null http://10.20.0.5/100kb.bin \
  -o /dev/null http://10.20.0.5/100kb.bin \
  -o /dev/null http://10.20.0.5/100kb.bin \
  -o /dev/null http://10.20.0.5/100kb.bin \
  -o /dev/null http://10.20.0.5/100kb.bin
# Later transfers can reuse the same TCP connection if the server keeps it alive
```

## Initial Congestion Window Size

```bash
# Check CWND on active TCP connections
ss -tin state established | grep "cwnd:" | head -5
# This shows the current congestion window; on a just-started flow it approximates the initial window

# View per-route initial congestion window overrides
ip route show | grep initcwnd
# Example output: 10.0.0.0/8 via 10.0.0.1 dev eth0 initcwnd 32
# If no initcwnd shown: the route is using the kernel default initial window

# Increase initial window for specific routes
ip route change default via 192.168.1.1 initcwnd 32
# initcwnd 32 = 32 MSS = 46.7KB initial window

# Review the route before changing it
ip route show
```

## Increasing Initial Congestion Window

```bash
# For local routes where you know bandwidth is available
ip route change 10.0.0.0/8 via 10.0.0.1 initcwnd 32

# For the default route (use carefully - only if you have excess bandwidth)
ip route change default via 192.168.1.1 initcwnd 32

# To confirm the installed iproute2 syntax includes initcwnd
ip route help 2>&1 | grep initcwnd
# If initcwnd appears in the syntax, the ip command understands the parameter
```

## TCP Slow Start After Idle

```bash
# After a connection is idle, Linux may reset CWND before sending more data
# This is "slow start after idle"

# Check current setting
sysctl net.ipv4.tcp_slow_start_after_idle
# Default: 1 (enabled - resets CWND after idle period)

# Disable system-wide if your workload benefits from keeping CWND after idle
# Persistent connections (HTTP keep-alive, WebSockets) are common candidates
sysctl -w net.ipv4.tcp_slow_start_after_idle=0

# Persist
echo "net.ipv4.tcp_slow_start_after_idle=0" >> /etc/sysctl.conf
```

## Application-Level Mitigations

```python
# Use connection pooling to avoid repeated slow starts
import requests

# Session with connection reuse - helps avoid a fresh slow start on subsequent requests
session = requests.Session()
session.mount('http://', requests.adapters.HTTPAdapter(
    pool_connections=5,
    pool_maxsize=10,
    max_retries=3
))

# Example: repeated requests to the same origin
urls = ['http://10.20.0.5/100kb.bin'] * 5

# All requests through this session can reuse existing TCP connections
for url in urls:
    resp = session.get(url)
```

## Conclusion

TCP slow start is most impactful for short-lived connections on high-bandwidth links. The fixes are: increase `initcwnd` for routes where bandwidth is plentiful (carefully), consider disabling `tcp_slow_start_after_idle` on hosts dominated by persistent connections, and use connection pooling in applications to avoid repeated slow-start ramp-ups. For very latency-sensitive services, TCP Fast Open can reduce request setup latency by carrying data in the initial SYN, but it does not remove slow start itself.
