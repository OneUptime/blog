# How to Tune IPv6 TCP Parameters on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, TCP, Linux, Sysctl, Performance, Kernel

Description: Fine-tune Linux TCP parameters for IPv6 connections including congestion control, keepalive settings, and TIME_WAIT handling for production workloads.

## Introduction

TCP over IPv6 uses the same kernel parameters as IPv4 TCP in Linux, but several defaults are suboptimal for high-concurrency or long-distance connections. This guide covers the essential TCP knobs for IPv6-heavy workloads.

## Step 1: Choose an Optimal Congestion Control Algorithm

Modern congestion control algorithms like BBR significantly outperform cubic on paths with any packet loss.

```bash
# Check available congestion control algorithms

sysctl net.ipv4.tcp_available_congestion_control

# Check currently active algorithm
sysctl net.ipv4.tcp_congestion_control

# Enable BBR (requires kernel 4.9+)
echo "net.ipv4.tcp_congestion_control = bbr" | \
  sudo tee -a /etc/sysctl.d/99-tcp.conf

# BBR also requires fair queue (fq) scheduler
echo "net.core.default_qdisc = fq" | \
  sudo tee -a /etc/sysctl.d/99-tcp.conf

sudo sysctl -p /etc/sysctl.d/99-tcp.conf
```

## Step 2: Optimize Connection Setup and Teardown

```bash
# /etc/sysctl.d/99-ipv6-tcp.conf

# Reduce TIME_WAIT duration by enabling TCP timestamps
net.ipv4.tcp_timestamps = 1

# Allow TIME_WAIT sockets to be reused for new connections
net.ipv4.tcp_tw_reuse = 1

# Maximum number of TIME_WAIT sockets
net.ipv4.tcp_max_tw_buckets = 1440000

# SYN retransmission attempts before giving up
net.ipv4.tcp_syn_retries = 3
net.ipv4.tcp_synack_retries = 3

# Reduce FIN_WAIT2 timeout (seconds)
net.ipv4.tcp_fin_timeout = 15

# Number of unacknowledged probes before connection is dropped
net.ipv4.tcp_keepalive_probes = 5
# Interval between keepalive probes (seconds)
net.ipv4.tcp_keepalive_intvl = 15
# Time before first keepalive probe (seconds)
net.ipv4.tcp_keepalive_time = 300
```

## Step 3: Tune for High Connection Count

```bash
# Local port range for outgoing connections
net.ipv4.ip_local_port_range = 1024 65535

# Maximum number of orphaned TCP sockets
net.ipv4.tcp_max_orphans = 65536

# Enable TCP memory pressure controls
net.ipv4.tcp_mem = 786432 1048576 26777216

# If listen queue overflows, send RST (1) or silently drop (0)
net.ipv4.tcp_abort_on_overflow = 0
```

## Step 4: Enable TCP Fast Open for IPv6

TCP Fast Open (TFO) reduces connection setup latency by sending data in the SYN packet.

```bash
# Enable TFO for both client (1) and server (2) roles
# Value 3 enables both
net.ipv4.tcp_fastopen = 3
```

```python
# Python server with TFO enabled - works for both IPv4 and IPv6
import socket

server = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

# Enable TCP Fast Open with a backlog queue of 5
server.setsockopt(socket.SOL_TCP, socket.TCP_FASTOPEN, 5)

server.bind(("::", 8080, 0, 0))
server.listen(100)
print("Server listening on [::]:8080 with TFO")
```

## Step 5: Verify Settings are Active

```bash
# Dump all TCP-relevant sysctl values
sysctl -a | grep -E "tcp_(congestion|fastopen|tw_|fin_|keepalive|mem|rmem|wmem)"

# Check active connections and their states
ss -6 -s

# Monitor TCP statistics for anomalies
netstat -s -6 2>/dev/null || cat /proc/net/snmp6 | grep -i tcp
```

## Summary Table

| Parameter | Conservative Default | Tuned Value | Effect |
|---|---|---|---|
| `tcp_congestion_control` | cubic | bbr | Better on lossy paths |
| `tcp_fastopen` | 1 | 3 | Lower connection latency |
| `tcp_fin_timeout` | 60 | 15 | Faster socket reuse |
| `tcp_keepalive_time` | 7200 | 300 | Detect dead connections sooner |
| `tcp_tw_reuse` | 0 | 1 | Allow TIME_WAIT reuse |

## Conclusion

Linux TCP parameters apply equally to IPv4 and IPv6 connections. BBR congestion control and TCP Fast Open provide the most impactful improvements for IPv6 workloads. Apply these settings persistently via `/etc/sysctl.d/` and monitor connection error rates with OneUptime.
