# How to Configure IPv6 Generic Receive Offload (GRO) on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, GRO, Generic Receive Offload, Linux, Networking, Performance

Description: Enable and configure Generic Receive Offload for IPv6 on Linux to coalesce small packets into larger segments, reducing CPU overhead and improving throughput.

## Introduction

Generic Receive Offload (GRO) coalesces multiple small incoming TCP or UDP packets into a single larger segment before passing them up the network stack. This reduces the number of times the kernel processes individual packets, significantly lowering CPU utilization at high packet rates.

## How GRO Works

```mermaid
graph LR
    NIC["NIC Receives\n10x 1460-byte packets"] --> GRO["GRO Engine\n(coalesce)"]
    GRO --> Stack["Network Stack\nProcesses 1x 14600-byte\nsuper-segment"]
    Stack --> App["Application"]
```

Without GRO: 10 sk_buff allocations, 10 protocol header parses.
With GRO: 1 sk_buff allocation, 1 protocol header parse.

## Step 1: Check and Enable GRO

```bash
# Check current GRO status

ethtool -k eth0 | grep -i "generic-receive-offload\|gro"

# Enable GRO (usually on by default on modern NICs)
sudo ethtool -K eth0 gro on

# Also enable GSO (Generic Segmentation Offload) for transmit path
sudo ethtool -K eth0 gso on

# Check all offload features at once
ethtool -k eth0 | grep -E "generic|scatter|checksum|offload"
```

## Step 2: GRO for IPv6-Specific Flows

GRO works with IPv6 TCP automatically. For UDP, GRO requires kernel 5.0+ and an application using `UDP_GRO`.

```bash
# Verify IPv6 GRO is active during a transfer
# Look for "rx_gro_packets" in ethtool statistics
ethtool -S eth0 | grep -i gro

# Or monitor via /proc
cat /proc/net/dev | grep eth0
# Look for large rx bytes vs rx packets ratio (high ratio = GRO working)
```

## Step 3: Enable UDP GRO for IPv6 (Kernel 5.0+)

```python
# Enable UDP GRO on a receiving IPv6 UDP socket
import socket

# UDP_GRO = 104 on Linux (kernel 5.0+)
UDP_GRO = 104

sock = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

# Enable UDP GRO - allows the kernel to coalesce UDP segments
try:
    sock.setsockopt(socket.IPPROTO_UDP, UDP_GRO, 1)
    print("UDP GRO enabled")
except OSError:
    print("UDP GRO not supported (kernel < 5.0)")

sock.bind(("::", 9000, 0, 0))

# When reading, use a large buffer to receive coalesced segments
while True:
    # Buffer large enough for GRO super-segments (up to 64KB)
    data, addr = sock.recvfrom(65535)
    print(f"Received {len(data)} bytes from {addr[0]}")
```

## Step 4: GRO with VXLAN/IPv6 Tunnels

GRO also coalesces encapsulated IPv6 traffic in VXLAN tunnels.

```bash
# Check GRO support on a VXLAN interface
ip link show vxlan0
ethtool -k vxlan0 | grep gro

# Enable GRO on the VXLAN interface
sudo ethtool -K vxlan0 gro on

# For GENEVE tunnels (used in Kubernetes overlay)
sudo ethtool -K geneve0 gro on
```

## Step 5: Monitor GRO Effectiveness

```bash
# Watch packet coalescing stats (requires ethtool -S support on NIC)
watch -n2 "ethtool -S eth0 2>/dev/null | grep -i 'gro\|coalesce'"

# Alternative: compare rx_packets vs rx_bytes ratio
# High bytes/packet ratio indicates effective GRO
awk '/eth0/{
    printf "eth0: %.0f bytes/packet\n", $2/$3
}' /proc/net/dev

# Use perf to measure NAPI poll rate (lower = GRO working)
sudo perf stat -e napi:napi_poll -a sleep 5
```

## Step 6: Potential GRO Issues and Fixes

```bash
# GRO can increase latency slightly for small bursts
# Tune GRO coalesce settings
sudo ethtool -C eth0 rx-usecs 50 rx-frames 0

# Disable GRO for latency-sensitive applications (e.g., trading)
sudo ethtool -K eth0 gro off

# Re-enable GRO after testing
sudo ethtool -K eth0 gro on
```

## Conclusion

GRO reduces CPU overhead for IPv6 TCP and UDP traffic by coalescing packets before they reach the network stack. Enable it on all NICs handling significant IPv6 throughput. Monitor CPU utilization and interrupt rates with OneUptime's infrastructure metrics to quantify the improvement.
