# How to Debug IPv6 Routing Issues with traceroute6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Traceroute6, Debugging, Routing, Networking

Description: Learn how to use traceroute6 to diagnose IPv6 routing problems by tracing the path packets take to their destination.

## Overview

`traceroute6` (or `traceroute -6`) reveals the path that IPv6 packets take through the network, showing each hop along the way. This makes it invaluable for diagnosing routing loops, missing routes, and asymmetric paths.

## Basic Usage

```bash
# Trace the path to an IPv6 destination

traceroute6 2001:4860:4860::8888

# Same using traceroute with -6 flag
traceroute -6 2001:4860:4860::8888

# Trace to a hostname (resolves AAAA record)
traceroute6 ipv6.google.com
```

## Sample Output and Interpretation

```text
traceroute to ipv6.google.com (2607:f8b0:4004:c1b::64), 30 hops max
 1  fe80::1 (fe80::1)  0.612 ms  0.451 ms  0.498 ms   ← Default gateway
 2  2001:db8:isp:1::1  2.341 ms  2.212 ms  2.198 ms   ← ISP router
 3  2001:db8:isp:2::1  4.512 ms  4.498 ms  4.601 ms
 4  * * *                                               ← No response (ICMP filtered)
 5  2607:f8b0:4004::1  15.234 ms                       ← Google's network
 6  2607:f8b0:4004:c1b::64  16.102 ms                  ← Destination
```

Key observations:
- Hop 1 is always your default gateway
- `* * *` means that hop does not respond to TTL-expired ICMPv6 messages (not necessarily a problem)
- Increasing RTT with each hop is normal; large jumps indicate geographic distance
- If you see the same hop repeated, there may be a routing loop

## Detecting Routing Loops

```bash
# A routing loop looks like this:
traceroute6 2001:db8:remote::1
# ...
#  5  2001:db8:router1::1  10 ms
#  6  2001:db8:router2::1  12 ms
#  7  2001:db8:router1::1  10 ms   ← Same as hop 5 → LOOP
#  8  2001:db8:router2::1  12 ms
```

Fix: check routes on both router1 and router2 - they are likely pointing to each other for the destination.

## Advanced Options

```bash
# Set maximum TTL (hops) to trace
traceroute6 -m 20 2001:4860:4860::8888

# Use a specific source address (useful on multi-homed hosts)
traceroute6 -s 2001:db8::2 2001:4860:4860::8888

# Use UDP to a fixed destination port (default 53) instead of the
# default UDP method that increments ports starting at 33434
traceroute6 -U 2001:4860:4860::8888

# Use ICMPv6 ECHO probes instead of UDP
traceroute6 -I 2001:4860:4860::8888

# Use TCP SYN probes (port 80) - useful when ICMP is filtered
traceroute6 -T -p 80 2001:4860:4860::8888

# Disable DNS resolution for faster output
traceroute6 -n 2001:4860:4860::8888

# Send 1 probe per hop and 1 probe at a time (less aggressive)
traceroute6 -q 1 -N 1 2001:4860:4860::8888

# Set probe packet size (positional argument after the host)
traceroute6 2001:4860:4860::8888 1280
```

## Diagnosing Asymmetric Routing

Traceroute only shows the forward path. To check if the return path differs:

```bash
# From the destination side, trace back to the source
traceroute6 -n 2001:db8::2  # From remote host back to your source

# Compare forward and reverse paths for asymmetry
# Asymmetric routing can cause issues with stateful firewalls
```

## Using mtr for Continuous Monitoring

`mtr` combines traceroute and ping for live continuous monitoring:

```bash
# Continuous IPv6 path monitoring
mtr -6 2001:4860:4860::8888

# Show IP addresses (no DNS lookup) with report mode
mtr -6 -n -r -c 100 2001:4860:4860::8888
```

## Common Issues Found with traceroute6

| Symptom | Likely Cause |
|---------|-------------|
| Fails at hop 1 | Default gateway missing or unreachable |
| All hops `* * *` | ICMPv6 filtered by firewall at your router |
| Reaches ISP but not beyond | ISP not routing your IPv6 prefix |
| Routing loop detected | Misconfigured static routes between routers |
| Destination unreachable at hop N | Routing black hole - no route at that router |

## Summary

`traceroute6` is your first line of defense when IPv6 packets are not reaching their destination. It shows each hop, RTT, and where packets stop. Use `-n` for speed, `-T` to bypass ICMP filters, and `-s` to test from a specific source address. Combine with `mtr` for continuous path quality monitoring.
