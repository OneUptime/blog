# How to Troubleshoot IPv6 Asymmetric Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Routing, Asymmetric Routing, Troubleshooting, Multi-homing, Network Diagnostics

Description: Diagnose IPv6 asymmetric routing where packets take different paths in each direction, causing stateful firewall failures and connection issues in multi-homed environments.

## Introduction

Asymmetric routing occurs when IPv6 packets take different paths in each direction between two hosts. While the network can function, stateful firewalls and connection tracking that only see one direction of a flow will break. This is common in multi-homed environments with multiple uplinks.

## Detecting Asymmetric Routing

```bash
# Compare forward and reverse traceroutes

# Forward path (your host to destination)

traceroute -6 -n 2001:db8:ffff::10

# Reverse path requires running traceroute -6 FROM the remote host

# Check source address selection for the destination
ip -6 route get 2001:db8:ffff::10
# This shows which interface and source address will be used

# Verify what the remote side would use as source
# by checking their routing table (if accessible)
```

## Step 1: Understand the Topology

```bash
# Show all IPv6 interfaces and addresses
ip -6 addr show scope global

# Show routing table
ip -6 route show table all

# In multi-homed host (two uplinks):
# 2001:db8:a::/64 dev eth0 - ISP A prefix
# 2001:db8:b::/64 dev eth1 - ISP B prefix
# default via fe80::a dev eth0 - default uses ISP A
# Traffic from ISP B might arrive on eth1 but responses go via eth0
```

## Step 2: Diagnose with Packet Capture

```bash
# Capture on both interfaces to see asymmetric traffic
# Terminal 1: capture on eth0
sudo tcpdump -i eth0 -n "ip6 and host 2001:db8:ffff::10"

# Terminal 2: capture on eth1
sudo tcpdump -i eth1 -n "ip6 and host 2001:db8:ffff::10"

# If packets arrive on eth1 but responses leave on eth0 → asymmetric
# This can break strict reverse-path checks and upstream stateful devices
```

## Step 3: Fix with Policy-Based Routing

IPv6 policy-based routing ensures responses leave through the same interface that received the request:

```bash
# Create separate routing tables for each uplink
# Add routes to table 100 for ISP A
sudo ip -6 route add default via fe80::a dev eth0 table 100

# Add routes to table 200 for ISP B
sudo ip -6 route add default via fe80::b dev eth1 table 200

# Add rules: packets from ISP A addresses use table 100
sudo ip -6 rule add from 2001:db8:a::/64 table 100
# Packets from ISP B addresses use table 200
sudo ip -6 rule add from 2001:db8:b::/64 table 200

# View routing rules
ip -6 rule show
```

## Step 4: Use Reverse-Path Checks for IPv6

```bash
# Linux rp_filter sysctl is IPv4-only
# For IPv6, use the ip6tables rpfilter match
sudo ip6tables -t raw -A PREROUTING -m rpfilter --invert -j DROP

# This drops packets where the reply would not go back the same interface
# (strict mode - may be too strict for asymmetric environments)

# Loose mode alternative: only drop if no route at all
sudo ip6tables -t raw -A PREROUTING -m rpfilter --loose --invert -j DROP
```

## Step 5: Adjust Source Address Selection

```bash
# The default address selection policy (RFC 6724) may pick
# a different source address than you expect

# Check which source address is selected for a destination
ip -6 route get 2001:db8:ffff::10

# For getaddrinfo(3)-based applications, review address sorting policy
# separately from kernel routing decisions
cat /etc/gai.conf

# Prefer a specific source address for a destination
sudo ip -6 route add 2001:db8:ffff::10 via fe80::a dev eth0 src 2001:db8:a::100

# Or use ip rule with UID-based routing for specific applications
```

## Step 6: Fix Stateful Firewall Issues

```bash
# Conntrack only marks a flow ESTABLISHED after seeing packets in both directions
# If a stateful firewall sees only one direction, restore symmetry or use
# stateless rules for the affected traffic

# Example stateless allow rule for a local HTTP service
sudo ip6tables -A INPUT -p tcp --dport 80 -j ACCEPT

# Or disable conntrack for specific traffic in both directions
sudo ip6tables -t raw -A PREROUTING -p tcp --dport 80 -j CT --notrack
sudo ip6tables -t raw -A OUTPUT -p tcp --sport 80 -j CT --notrack

# For load balancers with asymmetric routing:
# ECMP can spread outbound flows across uplinks, but it does not
# by itself guarantee symmetric return paths
sudo ip -6 route add 2001:db8::/32 \
    nexthop via fe80::a dev eth0 weight 1 \
    nexthop via fe80::b dev eth1 weight 1
```

## Conclusion

Asymmetric IPv6 routing is common in multi-homed environments and doesn't inherently break connectivity - but it can break strict reverse-path checks and stateful devices that only see one direction of the flow. Diagnose by capturing on all interfaces simultaneously and comparing which interface carries each flow direction. Fix with IPv6 policy-based routing to keep replies aligned with the correct uplink. Use `ip -6 rule add from <prefix> table <n>` for per-source routing tables, which is the standard Linux approach for multi-homed IPv6 hosts.
