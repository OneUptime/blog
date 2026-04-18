# How to Verify Routing Table Entries with Traceroute

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Traceroute, Routing, Troubleshooting, IPv4, Linux

Description: Use traceroute and related tools to verify that packets follow the expected routing table path and identify where routing diverges from expectations.

## Introduction

Traceroute is one of the most powerful tools for verifying routing. It reveals the actual path packets take hop by hop, letting you compare observed behavior against what the routing table predicts. Discrepancies between the routing table and traceroute output often indicate routing policy (PBR), ECMP, or misconfiguration.

## Basic Traceroute Usage

```bash
# Linux: trace to a destination (UDP probes by default)

traceroute 10.20.0.1

# Use ICMP instead of UDP (often less filtered by firewalls)
traceroute -I 10.20.0.1

# Use TCP SYN probes on port 80 (passes through most firewalls)
traceroute -T -p 80 10.20.0.1

# Set maximum hop count (default 30)
traceroute -m 20 10.20.0.1

# Skip DNS lookups (show IPs only)
traceroute -n 10.20.0.1   # numeric only, faster
```

## Comparing Routing Table to Traceroute

```bash
# Step 1: Check what the routing table predicts
ip route get 10.20.0.1
# Output: 10.20.0.1 via 192.168.1.1 dev eth0 src 192.168.0.10

# Step 2: Run traceroute and check first hop
traceroute 10.20.0.1
# 1  192.168.1.1  1.2 ms  1.3 ms  1.1 ms  <-- matches routing table
# 2  10.0.0.1     2.5 ms  2.6 ms  2.4 ms
# ...

# If first hop doesn't match ip route get output, check for PBR rules
ip rule show
```

## Verifying Specific Routes

```bash
# Test the route for a specific source address
ip route get 10.20.0.1 from 192.168.5.10
# This helps detect policy routing that differs by source

# Trace with specific source IP
traceroute -s 192.168.5.10 10.20.0.1
```

## Identifying Routing Asymmetry

```bash
# Trace in both directions (run from each endpoint)
# From host A to host B:
traceroute 10.20.0.1

# From host B back to host A:
traceroute 192.168.0.10

# Compare the hop sequences - they should be reverse of each other
# for symmetric routing
```

## Advanced: MTR for Continuous Verification

```bash
# MTR combines traceroute and ping for ongoing route verification
mtr --report 10.20.0.1

# Run 100 cycles for statistics
mtr --report --report-cycles 100 10.20.0.1

# Numeric output (no DNS lookup delay)
mtr -n 10.20.0.1
```

## Interpreting Asterisks

```bash
# Asterisks mean no response received for that hop
# Common reasons:
# 1. Router drops ICMP TTL exceeded (common on firewalls)
# 2. ICMP rate limiting on intermediate router
# 3. Asymmetric routing (return path goes different way)
# 4. Actual packet loss

# Test whether the destination is actually reachable despite asterisks
ping -c 10 10.20.0.1
```

## Conclusion

Traceroute is the ground truth for verifying that routing table entries produce the expected forwarding behavior. Use `ip route get` to predict the path, then compare with traceroute output. Discrepancies - especially at the first hop - point to policy routing rules, default route overrides, or ECMP hash decisions. Regular traceroute verification is a valuable part of network change management.
