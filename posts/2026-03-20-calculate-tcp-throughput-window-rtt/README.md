# How to Calculate TCP Throughput from Window Size and RTT

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Networking, Throughput, Performance, Bandwidth-Delay Product

Description: Calculate theoretical maximum TCP throughput using the bandwidth-delay product formula and validate against measured performance to identify TCP optimization opportunities.

## Introduction

TCP throughput can be estimated as a theoretical upper bound using the TCP window/RTT relationship. This calculation tells you the maximum throughput achievable for the current limiting TCP window and RTT, letting you identify whether poor throughput is caused by TCP window limitations or actual network bandwidth constraints.

## The TCP Throughput Formula

```text
Theoretical Maximum Throughput = Limiting TCP Window / RTT

Where:
- Limiting TCP Window = smaller of the advertised receive window and sender congestion window (in bytes)
- RTT = round-trip time (in seconds)
```

## Step 1: Measure Current RTT

```bash
# Measure RTT with ping (in milliseconds)

ping -c 20 10.20.0.5 | tail -3
# rtt min/avg/max/mdev = 45.2/46.8/48.1/0.7 ms

RTT = 0.0468 seconds (46.8ms)
```

## Step 2: Find the Current TCP Window Limit

```bash
# Check the receive-window limit being advertised by the peer
ss -tin state established | grep -i "snd_wnd" | head -5

# Or capture during a transfer.
# tcpdump's "win" value is the advertised receive window from the TCP header.
# If window scaling is enabled, multiply it by the negotiated "wscale" value from the SYN/SYN-ACK.
tcpdump -i eth0 -n -v 'tcp port 8080' 2>/dev/null

# For a specific connection, use ss
ss -tin "( dst 10.20.0.5 and dport = :8080 )"
# Look for: snd_wnd:<value>
# If cwnd is smaller than snd_wnd, congestion control is the current limit.
```

## Step 3: Calculate Theoretical Max

```python
def tcp_throughput_analysis(window_bytes, rtt_ms):
    """Calculate theoretical TCP throughput for a limiting window and compare to 1 Gbps."""
    rtt_sec = rtt_ms / 1000
    max_throughput_bytes = window_bytes / rtt_sec
    max_throughput_mbps = (max_throughput_bytes * 8) / 1_000_000

    print(f"Window size: {window_bytes/1024:.1f} KiB ({window_bytes} bytes)")
    print(f"RTT: {rtt_ms} ms")
    print(f"Theoretical max throughput: {max_throughput_mbps:.1f} Mbps")
    print(f"Theoretical max throughput: {max_throughput_bytes/1024/1024:.1f} MiB/s")

    # What window would we need for 1 Gbps?
    needed_for_1gbps = (1_000_000_000 / 8) * rtt_sec
    print(f"\nWindow needed for 1 Gbps with {rtt_ms}ms RTT: {needed_for_1gbps/1024/1024:.1f} MiB")

# Example: 131072-byte window, 46.8ms RTT
tcp_throughput_analysis(131072, 46.8)
# Window size: 128.0 KiB (131072 bytes)
# RTT: 46.8 ms
# Theoretical max throughput: 22.4 Mbps
# Theoretical max throughput: 2.7 MiB/s
# Window needed for 1 Gbps with 46.8ms RTT: 5.6 MiB
```

## Step 4: Measure Actual Throughput and Compare

```bash
# Measure actual throughput with iperf3
iperf3 -c 10.20.0.5 -t 10

# Compare to calculated max
# If actual ≈ calculated from snd_wnd/RTT: receive window is the bottleneck (increase buffer sizes)
# If actual << calculated: congestion, packet loss, or endpoint/application limits are the bottleneck
```

## Step 5: Adjust Buffers to Remove Bottleneck

```bash
# If the advertised receive window is the bottleneck, increase TCP socket buffer limits
# Needed buffer = BDP = bandwidth × RTT

# For 1 Gbps link with 50ms RTT:
# BDP = 125,000,000 bytes/sec × 0.050 sec = 6.25 MB

sysctl -w net.ipv4.tcp_rmem="4096 1048576 8388608"   # max = 8MB
sysctl -w net.ipv4.tcp_wmem="4096 1048576 8388608"
sysctl -w net.core.rmem_max=8388608
sysctl -w net.core.wmem_max=8388608

# Re-run iperf3 to verify improvement
iperf3 -c 10.20.0.5 -t 10
```

## Conclusion

The BDP formula is a powerful diagnostic tool. If your calculated maximum throughput is much lower than your network's capacity and the advertised receive window is the limiting factor, increasing TCP buffer sizes can improve performance. If actual throughput is much lower than the calculated maximum, congestion, packet loss, or endpoint/application limits are likely dominating. Always measure both to direct your optimization effort correctly.
