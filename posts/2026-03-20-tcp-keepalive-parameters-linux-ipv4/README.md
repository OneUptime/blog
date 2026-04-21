# How to Configure TCP Keepalive Parameters on Linux for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, TCP, IPv4, Keepalive, Kernel Parameters, Performance

Description: Learn how to configure TCP keepalive parameters on Linux to detect and clean up dead connections, improve reliability, and tune network behavior for your workloads.

## Introduction

TCP keepalive allows the kernel to periodically probe idle connections to check if the remote end is still alive. This is critical for long-lived connections in databases, load balancers, and application servers where dead connections can accumulate undetected.

## TCP Keepalive Parameters

Three kernel parameters control keepalive behavior:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `tcp_keepalive_time` | Idle time before sending first probe | 7200s (2 hours) |
| `tcp_keepalive_intvl` | Interval between probes | 75s |
| `tcp_keepalive_probes` | Number of failed probes before closing | 9 |

## Checking Current Values

```bash
sysctl net.ipv4.tcp_keepalive_time
sysctl net.ipv4.tcp_keepalive_intvl
sysctl net.ipv4.tcp_keepalive_probes

# Or all at once:

sysctl net.ipv4.tcp_keepalive_time net.ipv4.tcp_keepalive_intvl net.ipv4.tcp_keepalive_probes
```

## Changing Values Temporarily (Until Reboot)

```bash
sudo sysctl -w net.ipv4.tcp_keepalive_time=300
sudo sysctl -w net.ipv4.tcp_keepalive_intvl=30
sudo sysctl -w net.ipv4.tcp_keepalive_probes=5
```

With these settings, the kernel will probe after 5 minutes of idle time, retry every 30 seconds, and close after 5 failures (about 2.5 minutes of retries after probing starts, or roughly 7.5 minutes after the connection first becomes idle).

## Persisting Changes Across Reboots

Add to `/etc/sysctl.conf` or a file in `/etc/sysctl.d/`:

```bash
sudo nano /etc/sysctl.d/99-tcp-keepalive.conf
```

```ini
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_intvl = 30
net.ipv4.tcp_keepalive_probes = 5
```

Apply without rebooting:

```bash
sudo sysctl --system
```

## Enabling Keepalive per Socket in Applications

Applications must enable keepalive per socket. In Python:

```python
import socket

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPIDLE, 300)
sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPINTVL, 30)
sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPCNT, 5)
```

## Recommended Values by Use Case

| Use Case | keepalive_time | keepalive_intvl | keepalive_probes |
|----------|---------------|-----------------|------------------|
| Database connections | 60s | 10s | 5 |
| Load balancers | 30s | 10s | 3 |
| Application servers | 120s | 30s | 5 |
| Default (no tuning) | 7200s | 75s | 9 |

## Conclusion

Tuning TCP keepalive parameters helps Linux detect and clean up stale connections much faster than the defaults. This is especially important for services that maintain many long-lived connections, preventing resource exhaustion from zombie connections.
