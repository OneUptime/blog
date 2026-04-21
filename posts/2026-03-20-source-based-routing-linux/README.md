# How to Configure Source-Based Routing on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, Policy Routing, Source Routing, Ip rule, IPv4

Description: Configure source-based routing on Linux using policy routing rules and multiple routing tables to forward traffic based on source IP address.

## Introduction

Linux's policy routing system allows you to route packets based on more than just the destination address. Source-based routing (a subset of policy-based routing) selects the routing table based on the packet's source IP. This is essential for multi-homed servers - ensuring replies from each interface exit through the correct gateway.

## The Problem: Multi-Homed Server Asymmetry

Without source-based routing, a server with two interfaces may respond to requests through the wrong interface:

```text
eth0: 203.0.113.5/24  gateway: 203.0.113.1  (ISP1)
eth1: 198.51.100.5/24 gateway: 198.51.100.1 (ISP2)

Problem: Packets arriving on eth1 (ISP2) get replies sent via eth0 (ISP1)
         ISP1's gateway drops them (wrong source IP)
```

## Step 1: Create Custom Routing Tables

```bash
# Add table names to the routing table database

echo "100 isp1" >> /etc/iproute2/rt_tables
echo "200 isp2" >> /etc/iproute2/rt_tables

# Verify
cat /etc/iproute2/rt_tables
```

## Step 2: Populate Each Table

```bash
# Table 100: routes for ISP1 traffic
ip route add default via 203.0.113.1 dev eth0 table 100
ip route add 203.0.113.0/24 dev eth0 scope link table 100

# Table 200: routes for ISP2 traffic
ip route add default via 198.51.100.1 dev eth1 table 200
ip route add 198.51.100.0/24 dev eth1 scope link table 200
```

## Step 3: Create Policy Rules

```bash
# Rule: if source IP is ISP1's interface address, look up table 100
ip rule add from 203.0.113.5 table 100 priority 100

# Rule: if source IP is ISP2's interface address, look up table 200
ip rule add from 198.51.100.5 table 200 priority 200

# Verify rules (lower priority number = evaluated first)
ip rule show
# 0:      from all lookup local
# 100:    from 203.0.113.5 lookup isp1
# 200:    from 198.51.100.5 lookup isp2
# 32766:  from all lookup main
# 32767:  from all lookup default
```

## Step 4: Verify Source-Based Routing

```bash
# Test that each source IP uses the correct gateway
ip route get 8.8.8.8 from 203.0.113.5
# Output: 8.8.8.8 from 203.0.113.5 via 203.0.113.1 dev eth0

ip route get 8.8.8.8 from 198.51.100.5
# Output: 8.8.8.8 from 198.51.100.5 via 198.51.100.1 dev eth1
```

## Making Rules Persistent

Using a post-up script in `/etc/network/interfaces`:

```bash
# /etc/network/interfaces
iface eth0 inet static
    address 203.0.113.5
    netmask 255.255.255.0
    post-up ip route add default via 203.0.113.1 table 100
    post-up ip rule add from 203.0.113.5 table 100 priority 100
    pre-down ip rule del from 203.0.113.5 table 100 priority 100
```

Or with a NetworkManager dispatcher script:

```bash
#!/bin/bash
# /etc/NetworkManager/dispatcher.d/50-policy-routing
if [ "$1" = "eth1" ] && [ "$2" = "up" ]; then
    ip rule add from 198.51.100.5 table 200 priority 200
    ip route add default via 198.51.100.1 table 200
fi
```

## Conclusion

Source-based routing solves the multi-homed server problem elegantly using Linux's policy routing framework. With separate routing tables per upstream and rules that match source IPs to those tables, each interface's traffic flows through its own gateway - ensuring bidirectional reachability and avoiding asymmetric routing problems.
