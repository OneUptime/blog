# How to Interpret Ping Output (TTL, RTT, Packet Loss)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ping, ICMP, IPv4, TTL, RTT, Networking

Description: Learn to read and interpret all fields in ping output including TTL, round-trip time, packet loss, and mdev to diagnose network issues accurately.

Understanding what ping output actually means transforms it from a simple "up or down" tool into a powerful diagnostic instrument. Each field tells you something specific about the path between you and the target.

## Anatomy of a Ping Reply

```text
64 bytes from 8.8.8.8: icmp_seq=1 ttl=118 time=12.3 ms

   ^           ^              ^          ^          ^
   |           |              |          |          |
Reply       Source IP    Sequence    Time-to-    Round-trip
 size                    number      Live        time (ms)
```

## Interpreting TTL

TTL (Time To Live) decrements at each routed hop. The `ttl` shown by `ping` is the TTL of the reply packet you received, so it only hints at hop count if you know the sender's initial TTL:

```bash
ping -c 1 8.8.8.8
# ttl=118 → the reply arrived with TTL 118

# To estimate hop count, you must know the sender's initial TTL:
#   128 - 118 = about 10 routed hops on the return path
#   64 - 52 = about 12 routed hops if the sender started at 64

# TTL differences between replies can indicate different return paths
# or different responders, but TTL alone is not proof.
ping -c 5 1.1.1.1
# If ttl alternates between 118 and 119 → replies may be taking different paths
# or coming from different systems behind the same address
```

## Interpreting Round-Trip Time (RTT)

RTT measures total time from sending the ICMP request to receiving the reply. These ranges are rough guidance only; real values depend on distance, routing, peering, and congestion:

```text
RTT Range       Assessment
-----------     ----------------------------------------
< 1 ms          Same machine or LAN switch (excellent)
1-10 ms         Local LAN or same datacenter
10-50 ms        Same country/region (typical)
50-150 ms       Cross-continent
150-300 ms      Intercontinental (US to Asia)
> 300 ms        Very long distance, satellite, or problem
```

```bash
# The statistics line shows:
# rtt min/avg/max/mdev = 11.2/12.4/14.1/0.9 ms
#         ^       ^       ^      ^
#       fastest  mean  slowest  variation

# mdev is the population standard deviation of the RTT samples
# Lower mdev = more stable latency; higher mdev = more variation over time
# mdev < 1ms: very stable connection
# mdev > 10ms: high latency variation (bad for VoIP/video)
```

## Interpreting Packet Loss

```bash
ping -c 100 10.0.0.1
# 100 packets transmitted, 97 received, 3% packet loss

# Interpreting loss percentage (rough guide; ICMP can also be rate-limited or filtered):
# 0%         - No observed loss during the test
# 0.1-1%     - Usually worth investigating on a healthy wired network
# 1-5%       - Noticeable loss; check congestion, wireless quality, and counters
# 5-20%      - Serious impairment or aggressive ICMP rate limiting
# > 20%      - Severe impairment, filtering, or heavy congestion
# 100%       - No replies: host down, routing broken, or ICMP filtered/blocked

# Intermittent loss pattern (not consecutive):
# seq=1 OK, seq=2 OK, seq=3 LOST, seq=4 OK, seq=5 OK
# → Random loss can point to congestion, wireless interference, or rate limiting

# Consecutive loss pattern:
# seq=1-4 OK, seq=5-10 LOST, seq=11-15 OK
# → Burst loss can point to transient congestion, interface issues, or hardware faults
```

## Interpreting Latency Spikes

```bash
# Variable RTT in same ping session indicates:
# 64 bytes from 10.0.0.1: icmp_seq=1 ttl=64 time=1.2 ms
# 64 bytes from 10.0.0.1: icmp_seq=2 ttl=64 time=45.1 ms  ← SPIKE
# 64 bytes from 10.0.0.1: icmp_seq=3 ttl=64 time=1.3 ms

# Single spike: CPU busy on target, scheduler delay
# Regular spikes: bufferbloat (large queue building and draining)
# Increasing RTT: queue filling over time (congestion)
```

## Detecting Path Changes

```bash
# If TTL changes between replies, the reply path or responder may have changed
ping -c 20 8.8.8.8 | grep ttl

# TTL variation can indicate:
# - Load balancing across multiple return paths
# - Different responders behind the same address
# - Route changes during the test
```

Reading ping output diagnostically - not just "are packets coming back" - helps you distinguish latency, loss, and variability symptoms. To localize where a problem begins, compare results against progressively farther hosts.
