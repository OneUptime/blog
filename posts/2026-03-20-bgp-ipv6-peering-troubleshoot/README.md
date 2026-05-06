# How to Troubleshoot BGP IPv6 Peering Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, IPv6, Troubleshooting, Peering, Networking

Description: A systematic guide to diagnosing and resolving BGP IPv6 peering failures, from TCP connectivity to capability negotiation issues.

## Overview

BGP IPv6 peering failures can occur at multiple layers: TCP connectivity, address family negotiation, route filtering, or authentication. This guide provides a structured approach to isolating the problem.

## BGP Session States

```text
Idle → Connect → Active → OpenSent → OpenConfirm → Established
```

If a session is stuck in any state other than Established, something is preventing progression.

## Step 1: Check BGP Session State

```bash
# FRRouting

vtysh -c "show bgp ipv6 unicast summary"

# Cisco
show bgp ipv6 unicast summary

# Common states and meanings:
# Idle    - BGP is not attempting to connect (check config)
# Active  - BGP is trying to connect but failing (check TCP/routing)
# Connect - TCP connection in progress
# Established - Session is up
```

## Step 2: Test TCP Connectivity (Port 179)

BGP uses TCP port 179:

```bash
# Test if the peer's BGP port is reachable
nc -6 -z -w 5 2001:db8::2 179
echo "Exit code: $?"
# 0 = TCP connect succeeded, non-zero = connect failed

# Check if BGP is listening locally
ss -6 -tlnp | grep 179
```

## Step 3: Verify IPv6 Routing to the Peer

```bash
# Ping the peer address
ping6 2001:db8::2

# Trace the route
traceroute6 2001:db8::2

# Verify a route to the peer exists
ip -6 route get 2001:db8::2
```

## Step 4: Check Firewall Rules

BGP requires port 179 to be open bidirectionally:

```bash
# Allow BGP traffic
sudo ip6tables -A INPUT  -p tcp --sport 179 -s 2001:db8::2 -j ACCEPT
sudo ip6tables -A INPUT  -p tcp --dport 179 -s 2001:db8::2 -j ACCEPT
sudo ip6tables -A OUTPUT -p tcp --sport 179 -d 2001:db8::2 -j ACCEPT
sudo ip6tables -A OUTPUT -p tcp --dport 179 -d 2001:db8::2 -j ACCEPT

# Check current rules
sudo ip6tables -L -n | grep 179
```

## Step 5: Check Address Family Negotiation

If the session is Established but no IPv6 routes are exchanged:

```bash
# FRRouting: check if IPv6 AF is activated for the neighbor
vtysh -c "show bgp neighbors 2001:db8::2"
# Confirm that IPv6 unicast is negotiated and activated for the neighbor.
# If the session is Established but routes are still missing, check peer policy,
# filtering, and whether the peer is actually advertising IPv6 prefixes.

# If "not activated": add to config:
# address-family ipv6 unicast
#  neighbor 2001:db8::2 activate
```

## Step 6: Check Authentication

If MD5 authentication is configured, both sides must have matching keys:

```bash
# FRRouting: inspect whether TCP MD5 is configured for the neighbor
vtysh -c "show bgp neighbors 2001:db8::2"

# If the TCP MD5 keys do not match, the TCP session usually fails before the
# BGP OPEN exchange. Per RFC 2385, connection attempts may time out rather
# than return a clean refusal.
sudo tcpdump -i eth0 -n "tcp port 179 and host 2001:db8::2"
```

## Step 7: Capture BGP OPEN Messages

```bash
# Capture BGP session establishment
sudo tcpdump -i eth0 -n -w /tmp/bgp.pcap "tcp port 179 and host 2001:db8::2"

# Analyze with tshark
tshark -r /tmp/bgp.pcap -Y bgp -V | grep -E -A 5 "OPEN|NOTIFICATION"

# BGP NOTIFICATION messages contain error codes explaining session drops
```

## Common Issues and Fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Stuck in Active | No route to peer, firewall blocking 179 | Add route, open port 179 |
| Established but no routes | IPv6 AF not activated | Add `neighbor X activate` in IPv6 AF |
| Session resets frequently | MD5 key mismatch, timer mismatch | Match keys and timers |
| Routes received but not installed | Next-hop unreachable, RIB failure | Check `ip -6 route get <next-hop>` |
| Hold timer expired | High latency or CPU overload | Increase hold timer or fix latency |

## Summary

BGP IPv6 peering troubleshooting follows a clear hierarchy: verify TCP connectivity → check firewall → confirm IPv6 route to peer → verify address family activation → check authentication. Use `show bgp ipv6 unicast summary`, `nc -6 -z`, and tcpdump/tshark to isolate the failure layer quickly.
