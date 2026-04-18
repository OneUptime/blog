# How to Troubleshoot UDP Packet Loss

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: UDP, Packet Loss, Troubleshooting, Linux, Networking, Performance

Description: Diagnose and fix UDP packet loss by checking socket buffer overflow, network path loss, application processing speed, and kernel drop counters.

## Introduction

UDP packet loss is silent - unlike TCP, there is no retransmission, no notification to the sender, and no automatic recovery. Loss can occur at multiple points: the network path, the receiver's socket buffer, or the application itself. Identifying which layer drops the packets determines the fix. Kernel drop counters, `ss`, `netstat`, and packet capture together give a complete picture.

## Step 1: Verify Loss is Occurring

```bash
# Method 1: iperf3 UDP test with loss measurement

# Sender:
iperf3 -c 10.20.0.5 -u -b 100M -t 30
# -u: UDP mode
# -b 100M: send at 100 Mbps
# Output shows: "0% loss" or "X% loss"

# Method 2: ping (ICMP, not UDP but tests the path)
ping -c 100 -i 0.1 10.20.0.5 | tail -3
# Non-zero loss% = network path is dropping packets

# Method 3: Application-level sequence numbering
# If your protocol has sequence numbers, compare sender vs receiver counts
```

## Step 2: Check Socket Buffer Drops

```bash
# This is the most common UDP loss cause: buffer overflow
# The kernel drops UDP packets when the socket receive buffer is full

# Check kernel UDP drop counters:
cat /proc/net/udp
# "drops" column shows per-socket drops

# Better: use netstat
netstat -su
# "receive buffer errors" = UDP socket buffer overflows

# Or nstat:
nstat | grep -E "UdpInErrors|UdpRcvbufErrors|UdpSndbufErrors"
# UdpRcvbufErrors: receive buffer full (application not reading fast enough)
# UdpSndbufErrors: send buffer full (sending too fast for kernel)

# Monitor drop rate over time:
while true; do
    nstat -z 2>/dev/null | awk '/UdpRcvbufErrors/{printf "RcvBuf drops: %s\n", $2}'
    sleep 5
done
```

## Step 3: Check and Increase Socket Buffer Size

```bash
# View current UDP buffer limits
sysctl net.core.rmem_max          # Maximum receive buffer size
sysctl net.core.rmem_default      # Default receive buffer size
sysctl net.core.wmem_max          # Maximum send buffer size

# Typical defaults:
# rmem_default: 212992 (208 KB)
# rmem_max: 212992 (208 KB)

# For high-throughput UDP, increase buffers:
sysctl -w net.core.rmem_max=26214400        # 25 MB
sysctl -w net.core.rmem_default=26214400    # 25 MB
sysctl -w net.core.wmem_max=26214400        # 25 MB

# Application must also request larger buffer with SO_RCVBUF:
# Python example:
# sock.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 26214400)

# Verify actual buffer size (after setting):
ss -umn sport = :5000 | grep rmem
```

## Step 4: Check Network Path Loss

```bash
# If buffers are fine, loss is on the network path
# Test path loss with mtr:
mtr -n --report --report-cycles 50 10.20.0.5
# Shows loss% at each hop - identifies where loss starts

# Use iperf3 UDP in both directions to narrow down:
# Forward path test (your host → remote):
iperf3 -c 10.20.0.5 -u -b 100M -t 10
# Reverse path test (remote → your host):
iperf3 -c 10.20.0.5 -u -b 100M -R -t 10
# Different loss in each direction: asymmetric loss on path

# Check interface errors (hardware-level drops):
ip -s link show eth0
# RX errors, dropped, overruns should all be 0
```

## Step 5: Check Application Processing Speed

```bash
# Application drops: app can't read socket fast enough
# Symptoms: UdpRcvbufErrors increasing, network path is clean

# Profile: how long does your app take to process each packet?
# Target: processing time < inter-packet arrival time

# If sending at 100K packets/sec:
# Inter-packet time = 10 microseconds
# Your app must process each packet in < 10 µs

# Options for slow application:
# 1. Use recvmmsg() to receive multiple packets in one syscall
#    (instead of recvfrom() per packet)
# 2. Increase socket buffer to absorb bursts
# 3. Move heavy processing off the receive hot path
# 4. Use multiple threads/processes reading from the socket (SO_REUSEPORT)

# SO_REUSEPORT allows multiple processes on same UDP port (load balancing).
# It is a per-socket option set by the application via setsockopt(), not a sysctl.
# Python example:
# sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
```

## Conclusion

UDP packet loss diagnosis follows a clear path: check `netstat -su` for buffer overflow drops first (most common), then check the network path with `mtr` or `iperf3`, and finally check application processing speed. Buffer drops require increasing `rmem_max` and configuring larger `SO_RCVBUF` in the application. Network path drops require investigating the routing path or link quality. Application processing drops require performance optimization or `SO_REUSEPORT` for parallel readers.
