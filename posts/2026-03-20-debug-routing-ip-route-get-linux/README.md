# How to Debug Routing Issues with ip route get on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, Routing, Debugging, Ip route, IPv4

Description: Use the ip route get command on Linux to query the kernel's routing decision for any destination, including policy routing, source address selection, and interface selection.

## Introduction

`ip route get` queries the Linux kernel's routing subsystem to show exactly how a packet would be routed for a given destination. Unlike `ip route show` which displays the routing table, `ip route get` simulates the actual forwarding decision - including policy routing rules (ip rules), source address selection, and outgoing interface determination.

## Basic Usage

```bash
# Find the route to a destination

ip route get 8.8.8.8
# Output: 8.8.8.8 via 192.168.1.1 dev eth0 src 192.168.1.10 uid 1000
#   cache

# The output shows:
# - Next-hop gateway: 192.168.1.1
# - Outgoing interface: eth0
# - Source IP that will be used: 192.168.1.10
```

## Querying with a Specific Source Address

This is crucial for debugging policy routing where different sources use different paths:

```bash
# Simulate routing for a packet from a specific source IP
ip route get 10.20.0.1 from 192.168.5.10

# If policy routing is active, result may differ from regular lookup:
ip route get 10.20.0.1
ip route get 10.20.0.1 from 192.168.5.10
# Compare both - different results indicate a policy routing rule is active
```

## Querying a Specific Table

`ip route get` does not accept a `table` argument - it always performs a full lookup that follows the kernel's policy rules. To inspect a specific table, use `ip route show`:

```bash
# Show routes in a specific routing table
ip route show table main
ip route show table 100
ip route show table local

# Show routes from all tables and filter for a destination
ip route show table all | grep "10.20.0.1"

# To make `ip route get` consult a non-main table, use `from` to match a rule
ip route get 10.20.0.1 from 192.168.5.10
```

## Specifying the Input Interface

```bash
# Simulate a packet arriving on a specific interface
ip route get 10.20.0.1 iif eth1

# Useful for debugging asymmetric routing or reverse path filtering
```

## Debugging Policy Routing

```bash
# Show all policy routing rules (checked before main table)
ip rule show
# 0:      from all lookup local
# 100:    from 192.168.5.0/24 lookup 100
# 32766:  from all lookup main
# 32767:  from all lookup default

# If a rule matches, the route from that table is used
# Test which rule applies to a source
ip route get 10.20.0.1 from 192.168.5.10
# Will use table 100 based on the rule above
```

## Using ip route get for Script-Based Checks

```bash
#!/bin/bash
# Check that default route is via expected gateway
EXPECTED_GW="192.168.1.1"
ACTUAL_GW=$(ip route get 8.8.8.8 | awk '/via/{print $3}')

if [ "$ACTUAL_GW" != "$EXPECTED_GW" ]; then
  echo "WARNING: Default gateway mismatch. Expected $EXPECTED_GW, got $ACTUAL_GW"
  exit 1
fi
echo "Routing OK: gateway is $ACTUAL_GW"
```

## Combining with Other Tools

```bash
# Cross-reference ip route get with traceroute first hop
PREDICTED_HOP=$(ip route get 10.20.0.1 | awk '/via/{print $3}')
echo "Predicted first hop: $PREDICTED_HOP"
traceroute -n -m 3 10.20.0.1 | head -5
```

## Conclusion

`ip route get` is an indispensable debugging tool that tells you exactly what the kernel will do with a packet, not just what routes are configured. It accounts for policy routing rules, routing tables, and source address selection - making it far more useful than simply reading the routing table when diagnosing forwarding issues.
