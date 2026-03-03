# How to Tune TCP Buffer Sizes on Ubuntu for Better Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Performance Tuning, Linux, TCP

Description: Learn how to tune TCP socket buffer sizes on Ubuntu to maximize network throughput for high-bandwidth applications, long-distance connections, and high-performance workloads.

---

TCP buffer size is one of the most impactful network tuning parameters. The default buffer sizes in Linux are conservatively set to work for average scenarios - they don't maximize throughput for high-bandwidth, high-latency connections (like data transfers between distant data centers) or for servers handling many concurrent connections.

Understanding why buffers matter and how to tune them correctly takes some background.

## Why TCP Buffer Size Matters

TCP uses buffers on both the sender and receiver side. The receiver advertises how much space it has in its receive buffer through the TCP window. The sender cannot send more data than the receiver's advertised window.

For maximum throughput, the buffer should be large enough to fill the network pipe while waiting for acknowledgments. The formula is:

```text
Optimal buffer size = Bandwidth-Delay Product (BDP)
BDP = bandwidth (bytes/sec) * RTT (seconds)
```

Example: A 10Gbps link to a server with 50ms RTT:
```text
BDP = (10,000,000,000 / 8) bytes/s * 0.05s = 62,500,000 bytes ≈ 60MB
```

With a default buffer of 4MB, you'd never saturate that link. With a 128MB buffer, you can.

## Checking Current Buffer Sizes

```bash
# Current TCP buffer settings
sysctl net.ipv4.tcp_rmem
sysctl net.ipv4.tcp_wmem
sysctl net.core.rmem_default
sysctl net.core.wmem_default
sysctl net.core.rmem_max
sysctl net.core.wmem_max
```

Default output:

```text
net.ipv4.tcp_rmem = 4096 131072 6291456
net.ipv4.tcp_wmem = 4096 16384 4194304
net.core.rmem_default = 212992
net.core.wmem_default = 212992
net.core.rmem_max = 212992
net.core.wmem_max = 212992
```

The three values for `tcp_rmem` and `tcp_wmem` are: minimum, default, and maximum.

## Understanding the Parameters

### tcp_rmem and tcp_wmem

These control per-socket TCP receive and send buffers respectively:

- **Minimum** - The smallest buffer guaranteed to a socket, even under memory pressure
- **Default** - The initial buffer size for new connections (overrides `rmem_default` for TCP)
- **Maximum** - The largest the buffer can grow when auto-tuning is enabled

### rmem_max and wmem_max

These are the system-wide maximums for any socket, not just TCP. They act as a ceiling that `tcp_rmem` and `tcp_wmem` cannot exceed.

If you set `tcp_rmem` max to 16MB but `rmem_max` is still 212KB, the actual max will be 212KB.

### auto-tuning

Linux auto-tunes TCP buffer sizes within the min/max range based on available memory and network conditions. This is enabled by default:

```bash
# Check if auto-tuning is enabled (1 = enabled, 0 = disabled)
sysctl net.ipv4.tcp_moderate_rcvbuf
```

With auto-tuning, setting a higher maximum allows the kernel to use larger buffers when the connection benefits from them.

## Applying Buffer Size Tuning

### For High-Bandwidth or High-Latency Networks

Create a tuning file:

```bash
sudo nano /etc/sysctl.d/99-tcp-tuning.conf
```

```ini
# TCP receive buffer: min, default, max (bytes)
# Max of 16MB for connections that benefit from large windows
net.ipv4.tcp_rmem = 4096 87380 16777216

# TCP send buffer: min, default, max (bytes)
net.ipv4.tcp_wmem = 4096 65536 16777216

# Core socket maximum buffer sizes
# Must be >= the tcp_rmem and tcp_wmem max values
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216

# Default socket buffer (for non-TCP sockets)
net.core.rmem_default = 262144
net.core.wmem_default = 262144
```

Apply immediately:

```bash
sudo sysctl -p /etc/sysctl.d/99-tcp-tuning.conf
```

### For Very High-Bandwidth Links (10GbE, 40GbE)

More aggressive settings for high-throughput storage or cluster interconnects:

```ini
# Buffers up to 128MB for very high-BDP links
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
```

### For Many Concurrent Connections (Web Servers)

Keep default sizes small to save RAM but allow auto-tuning for active connections:

```ini
# Small defaults save memory for many connections
net.ipv4.tcp_rmem = 4096 32768 4194304
net.ipv4.tcp_wmem = 4096 32768 4194304
net.core.rmem_max = 4194304
net.core.wmem_max = 4194304
```

## Related Network Parameters

### TCP Congestion Control

The default congestion control algorithm affects how buffers are used:

```bash
# Check current algorithm
sysctl net.ipv4.tcp_congestion_control

# List available algorithms
sysctl net.ipv4.tcp_available_congestion_control

# Use BBR (Better Bandwidth management - good for WANs)
sudo sysctl -w net.ipv4.tcp_congestion_control=bbr

# BBR also needs the fq qdisc
sudo tc qdisc replace dev eth0 root fq
```

BBR works better with the large buffers since it's designed to fill the pipe efficiently without the buffer bloat that CUBIC can cause.

### Enabling TCP Window Scaling

Window scaling allows buffers larger than 64KB to be advertised (required for high-BDP connections):

```bash
# Should be enabled by default (value: 1)
sysctl net.ipv4.tcp_window_scaling
```

If disabled:

```bash
sudo sysctl -w net.ipv4.tcp_window_scaling=1
```

### Connection Backlog

For high-connection-rate servers:

```bash
# How many connections can queue waiting to be accepted
sudo sysctl -w net.core.somaxconn=65535
sudo sysctl -w net.ipv4.tcp_max_syn_backlog=65535

# Queue depth for incoming packets
sudo sysctl -w net.core.netdev_max_backlog=65535
```

## Measuring the Impact

Test throughput before and after changes using `iperf3`:

```bash
# Install iperf3
sudo apt install iperf3 -y

# On the server (receiver)
iperf3 -s

# On the client (sender), test for 30 seconds with parallel streams
iperf3 -c server-ip -t 30 -P 4
```

For WAN testing, test between machines in different data centers or regions.

Before tuning example:
```text
[ ID] Interval     Transfer     Bitrate
[  5]  0-30 sec   2.10 GBytes  602 Mbits/sec
```

After buffer tuning:
```text
[ ID] Interval     Transfer     Bitrate
[  5]  0-30 sec   8.45 GBytes  2.42 Gbits/sec
```

## Checking Socket Buffer Usage at Runtime

See what buffer sizes are actually in use:

```bash
# Show TCP socket stats including buffer sizes
ss -tnm

# Show in human-readable format
ss -tnm | awk 'NR>1 {print $1, "rcvbuf:", $6, "sndbuf:", $7}'
```

The output shows `rcvq` and `sndq` (current queue fill) and the buffer sizes. If `rcvq` is consistently near the buffer max, the buffer is too small.

## Memory Considerations

Larger buffers consume more RAM. With 10,000 concurrent connections and 16MB max buffers, the theoretical maximum memory is 160GB - but auto-tuning only allocates what's needed.

Check how much memory TCP is actually using:

```bash
# Check TCP memory allocation
cat /proc/net/sockstat | grep TCP

# Current TCP memory usage (in pages)
cat /proc/sys/net/ipv4/tcp_mem
```

The three values in `tcp_mem` are: threshold for starting pressure, threshold for memory pressure mode, and absolute maximum. The kernel will reduce buffer sizes automatically when under memory pressure.

## Persistent Configuration Summary

```bash
cat /etc/sysctl.d/99-tcp-tuning.conf
```

```ini
# TCP buffer tuning for high-throughput workloads
# Adjust max values based on available RAM and workload requirements

# Per-socket TCP buffers (min, default, max)
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216

# System-wide socket buffer maximums
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.core.rmem_default = 262144
net.core.wmem_default = 262144

# TCP window scaling (should already be on)
net.ipv4.tcp_window_scaling = 1

# Connection queues
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535
```

The key takeaway: increasing `net.core.rmem_max` and `net.core.wmem_max` is almost always safe and free of side effects, because auto-tuning only uses the larger buffers on connections that need them. The risk comes from setting the defaults too high, which would pre-allocate large buffers for every connection and exhaust RAM on busy servers.
