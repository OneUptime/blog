# How to Troubleshoot Asymmetric Routing with Traceroute

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Traceroute, Asymmetric Routing, Networking, IPv4, BGP, Diagnostic

Description: Detect and diagnose asymmetric routing where forward and return network paths differ, using traceroute and analyzing RTT patterns and hop asymmetry indicators.

Asymmetric routing - where packets travel different paths in each direction - can cause connection problems, firewall stateful inspection failures, and confusing network behavior. Traceroute primarily reveals the forward path; the replies used to measure RTT may return over a different path, making asymmetry hard to prove without the right techniques.

## What Is Asymmetric Routing?

```text
Symmetric routing:
  Host A → Router 1 → Router 2 → Host B
  Host B → Router 2 → Router 1 → Host A  ← same path in reverse

Asymmetric routing:
  Host A → Router 1 → Router 2 → Host B
  Host B → Router 3 → Router 4 → Host A  ← completely different return path

Problems caused:
  - Stateful firewalls don't see both directions → connection blocked
  - NAT breaks (connection table mismatch)
  - Hard to diagnose with single-direction traceroute
```

## Detecting Asymmetry in tracepath Output

```bash
tracepath -n 8.8.8.8

# "asymm X" in tracepath output = estimated return hops differ from forward hops

# 3:  no reply
# 4:  72.14.218.46                                       17.232ms asymm  5
#                                                                   ^^^^^^
# "asymm 5" means: tracepath estimates the reply took 5 hops back,
# while this responder is at forward hop 4
# The difference (5 vs 4) is a hint of asymmetric routing, not proof by itself
```

## Running Traceroute from Both Ends

The most direct way to confirm asymmetry:

```bash
# Forward path from host A:
traceroute -n 10.200.0.1

# Run from host B (target):
traceroute -n 10.100.0.1

# Compare the hops - if they're materially different, you likely have
# asymmetric routing for this probe type
# Forward: A → R1 → R2 → R3 → B
# Return:  B → R5 → R6 → A   ← completely different path
```

## Analyzing Latency Anomalies

Asymmetry can be inferred from unusual latency patterns:

```bash
traceroute -n 8.8.8.8

#  1  192.168.1.1     1ms
#  2  10.1.0.1        8ms
#  3  * * *           ← no reply from this hop
#  4  72.14.0.1      12ms
#  5  8.8.8.8        12ms

# The *** at hop 3 with a normal hop 4 usually indicates:
# - Hop 3 forwarded traffic, because later hops still respond
# - Hop 3 did not send ICMP Time Exceeded, or its reply was filtered,
#   rate-limited, or lost
# - This is not proof of asymmetry; confirm with reverse traceroute or tracepath
```

## When Asymmetric Routing Breaks Things

```bash
# Symptom: TCP connections timeout or reset unexpectedly
# Cause: stateful firewall sees SYN going out, but SYN/ACK or later packets
# return via a different path or interface that the firewall doesn't associate
# with the connection

# Test: can packets go out but not come back?
# On firewall/gateway, check:
sudo conntrack -L | grep 10.200.0.1   # Active TCP sessions should show ESTABLISHED

# If SYN_SENT is there but no ESTABLISHED:
# → Reply traffic isn't reaching this firewall, or is dropped before tracking
# → Asymmetric routing bypasses the stateful firewall

# Fix: ensure traffic goes through the same firewall in both directions
# by adjusting routing metrics or policy routing
```

## Policy Routing to Fix Asymmetry

```bash
# Problem: traffic from eth0 (192.168.1.0/24) is returning via eth1
# Solution: policy routing - force replies to use same interface as request

# Create a routing table for eth0 traffic
echo "100 eth0-rt" | sudo tee -a /etc/iproute2/rt_tables

# Add routes to the custom table
sudo ip route add default via 192.168.1.1 dev eth0 table eth0-rt

# Rule: if source is from eth0 subnet, use eth0 routing table
sudo ip rule add from 192.168.1.0/24 table eth0-rt

# Verify
ip rule show
ip route show table eth0-rt
```

## Using mtr to Visualize Path Behavior

```bash
# mtr repeats traceroute-style probes and reports per-hop RTT/loss
sudo mtr -n --report --report-cycles=10 8.8.8.8

# Sustained loss/jitter that continues through to the destination can indicate
# an end-to-end path issue. Loss or jitter only at intermediate hops often means
# ICMP rate limiting/deprioritization, not necessarily asymmetric routing.
```

Asymmetric routing is often benign on the internet but can cause severe problems when stateful firewalls or NAT are involved - routing-metric changes and policy routing are common fixes for controlled environments.
