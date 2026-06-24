# How to Use the TCP Window Scale Option Effectively

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Linux, Window Scaling, Networking, Performance, RFC7323

Description: Understand the TCP Window Scale option, how the scale factor is negotiated during the handshake, and how to ensure it is active for maximum throughput.

## Introduction

The TCP Window Scale option (RFC 7323) extends the receive window field beyond its original 16-bit (65,535-byte, about 64KB) limit. Each endpoint advertises its receive-window scale during the three-way handshake, and the per-direction scale values remain fixed for the connection's lifetime. Understanding how the scale factor is chosen and how to verify it is working helps ensure you're getting maximum throughput from your TCP connections.

## TCP Window Scale Option Format

```text
TCP Option Type: 3 (Window Scale)
Option Length: 3 bytes
Shift Count: 0-14 (the scale exponent)

Effective Window = Window Field × 2^(Shift Count)  # for non-SYN segments
Scale=0:  65,535 × 2^0  = 65,535 bytes       (no scaling)
Scale=7:  65,535 × 2^7  = 8,388,480 bytes    ≈ 8MiB
Scale=10: 65,535 × 2^10 = 67,107,840 bytes   ≈ 64MiB
Scale=14: 65,535 × 2^14 = 1,073,725,440 bytes ≈ 1GiB (maximum)
```

## How the Scale Factor is Determined

Linux selects the receive window scale factor from the largest receive window it may need to represent when the connection opens. For auto-tuned sockets, current Linux considers the current receive space, `net.ipv4.tcp_rmem[2]`, and `net.core.rmem_max`, then applies any per-socket or route window clamp.

```bash
# Current Linux uses: scale = clamp(floor(log2(space)) - 15, 0, 14)
# where space is the clamped maximum receive space used for the connection.

# With tcp_rmem max = 6MiB and net.core.rmem_max not larger:

# scale = floor(log2(6291456)) - 15 = 22 - 15 = 7
# Max representable advertised window = 65535 × 2^7 = 8,388,480 bytes ≈ 8MiB

# With tcp_rmem max = 16MiB and net.core.rmem_max not larger:
# scale = floor(log2(16777216)) - 15 = 24 - 15 = 9
# Max representable advertised window = 65535 × 2^9 = 33,553,920 bytes ≈ 32MiB

# Estimate what a normal auto-tuned socket will advertise
python3 - <<'PY'
from pathlib import Path

tcp_rmem = [int(value) for value in Path("/proc/sys/net/ipv4/tcp_rmem").read_text().split()]
tcp_rmem_max = tcp_rmem[2]
core_rmem_max = int(Path("/proc/sys/net/core/rmem_max").read_text())
space = max(tcp_rmem_max, core_rmem_max)
scale = max(0, min(14, space.bit_length() - 1 - 15))

print(f"tcp_rmem max: {tcp_rmem_max / 1024 / 1024:.0f} MiB")
print(f"net.core.rmem_max: {core_rmem_max / 1024 / 1024:.1f} MiB")
print(f"Estimated Linux receive window scale: {scale}")
print(f"Max representable window: {65535 * 2**scale / 1024 / 1024:.1f} MiB")
PY
```

Per-socket `SO_RCVBUF` settings or route metrics can clamp this lower, so packet capture remains the authoritative check.

## Verifying Window Scale Negotiation

```bash
# Capture a TCP handshake and check for window scale option
tcpdump -i eth0 -n -v 'tcp[tcpflags] & tcp-syn != 0' -c 5

# Look for: options [..., nop, wscale 7]
# Or: options [mss 1460,sackOK,TS val 1234 ecr 0,nop,wscale 7]

# If wscale is missing from either the SYN or SYN-ACK:
# Window scaling is not enabled for that connection
```

## Window Scale in the SYN Handshake

```bash
# Wireshark filter to see window scale option
# tcp.flags.syn == 1 and tcp.options.wscale.shift

# In Wireshark packet view:
# Transmission Control Protocol
#   Options: (...)
#     Window scale: 7 (multiply by 128)
#       Kind: Window Scale (3)
#       Length: 3
#       Shift count: 7
```

## Troubleshooting Missing Window Scale

```bash
# Problem: window scaling not being used despite large buffers
# Step 1: Confirm tcp_rmem is large
sysctl net.ipv4.tcp_rmem

# Step 2: Check that tcp_window_scaling is enabled
sysctl net.ipv4.tcp_window_scaling   # Must be 1

# Step 3: Confirm in packet capture
tcpdump -l -i eth0 -n -v 'tcp[tcpflags] & tcp-syn != 0' | grep wscale

# Step 4: If missing from SYN-ACK but present in SYN:
# Remote server did not negotiate window scaling, or a middlebox stripped the option
# Enable it on the remote host, update very old TCP stacks, or inspect the network path

# Step 5: Check if local firewall rules strip TCP options
iptables -t mangle -S | grep -Ei 'TCPOPTSTRIP|wscale'
```

## Conclusion

The TCP Window Scale option is the enabling mechanism for high-throughput TCP. It's automatically advertised based on the receive buffer and window clamp available when the connection opens. Ensure window scaling is enabled (`sysctl net.ipv4.tcp_window_scaling=1`), set receive buffer autotuning limits high enough for your BDP, and verify in packet captures that the wscale option appears in the SYN handshake. Without it, the advertised receive window is limited to 65,535 bytes regardless of how large you set your buffers.
