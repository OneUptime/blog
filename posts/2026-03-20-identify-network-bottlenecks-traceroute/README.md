# How to Identify Network Bottlenecks Using Traceroute

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Traceroute, Networking, Bottlenecks, Latency, IPv4, Performance

Description: Use traceroute output patterns to identify where latency spikes occur along a network path and pinpoint the specific link causing performance degradation.

A network bottleneck often appears as a sudden jump in latency that then persists in later hops. Understanding how to read this pattern helps you narrow down where added delay starts, while remembering that traceroute measures probe responses rather than application traffic directly.

## The Bottleneck Pattern

```bash
traceroute -n 8.8.8.8

 1  192.168.1.1      1ms    ← local gateway: 1ms
 2  10.1.0.1         8ms    ← ISP edge: +7ms (WAN link)
 3  72.14.0.1      150ms    ← JUMP! +142ms
 4  142.250.0.1    151ms    ← subsequent hops only +1ms
 5  8.8.8.8        152ms

# The added latency likely begins between hop 2 and hop 3

# Hop 3 and later hops carry roughly 142ms more RTT than hop 2
# If the increase persists, later hops inherit that added RTT
```

## Interpreting Latency Deltas

```bash
#!/bin/bash
# analyze-trace.sh - Show latency added at each hop

HOST="$1"

traceroute -n -q 1 "$HOST" 2>/dev/null | awk '
/^[[:space:]]*[0-9]+[[:space:]]/ {
    hop = $1
    ip = $2
    rtt = $3

    if (rtt ~ /^[0-9]+(\.[0-9]+)?$/) {
        delta = seen ? rtt - prev : rtt
        printf "Hop %s: %s - %s ms (+%.3f ms)\n", hop, ip, rtt, delta
        prev = rtt
        seen = 1
    }
}
'
```

## Differentiating Real vs Artificial Latency

Not all latency spikes are real bottlenecks:

```bash
traceroute -n 8.8.8.8

 3  72.14.0.1      150ms    ← spike here
 4  8.8.8.8         12ms    ← drops back down

# Wait - the destination (hop 4) is FASTER than hop 3
# This usually means: hop 3's ICMP response was deprioritized or rate-limited
# The path itself is not proven to be 150ms slower
# Hop 3 can answer traceroute probes slowly while forwarding traffic normally

# A REAL bottleneck shows latency that persists in all subsequent hops:
 3  72.14.0.1      150ms
 4  142.0.0.1      151ms   ← still high
 5  8.8.8.8        152ms   ← destination is also high
```

## High Latency vs Packet Loss Bottlenecks

```bash
# Congested path often shows:
# - High and variable RTT that persists in later hops
# - Packet loss or "*" responses that continue to later hops, including the destination

# Run multiple probes for better picture
traceroute -q 5 -n 8.8.8.8    # 5 probes per hop

# Output shows 5 RTT values per hop:
# 3  72.14.0.1  12ms 12ms 150ms 11ms 11ms
# The single 150ms spike = transient queueing or slow ICMP reply handling
# All 150ms = sustained added latency at or beyond that point
# Loss at only one intermediate hop can still be ICMP rate limiting
```

## Bottleneck on Your LAN

```bash
# Hop 1 latency should be < 5ms
# If hop 1 shows 50ms+ on Ethernet → local network problem:
# - Port mismatch (half-duplex vs full-duplex)
# - Faulty cable
# - Overloaded gateway or switch CPU

# Check interface errors
ip -s link show eth0
# Look for: RX errors, TX errors, dropped packets
# High numbers indicate physical layer problems
```

## Using MTR for Continuous Bottleneck Detection

```bash
# MTR gives ongoing statistics, better for intermittent bottlenecks
sudo mtr --report --report-cycles=30 -n 8.8.8.8

# Fields:
# HOST: IP address
# Loss%: Packet loss percentage
# Snt: Packets sent
# Last: Last RTT
# Avg: Average RTT
# Best: Minimum RTT
# Wrst: Maximum RTT (worst)
# StDev: Standard deviation of RTT

# High StDev at a specific hop, especially when it persists to the destination,
# can indicate variable latency; intermediate-hop-only spikes may just be ICMP rate limiting
```

Identifying bottlenecks requires looking at where RTT jumps AND persists - a spike that recovers in the next hop is usually a router measurement artifact or control-plane effect, not proof of a real bottleneck.
