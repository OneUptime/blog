# How to Configure Policy-Based Routing on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Routing, Linux, Policy Routing, IPv4

Description: Learn how to configure policy-based routing (PBR) on Linux using ip rule and multiple routing tables to route traffic based on source IP, TOS, or marks.

## What Is Policy-Based Routing?

Policy-Based Routing (PBR) allows routing decisions based on criteria beyond just the destination IP:

- **Source IP address** - route different clients through different uplinks
- **Packet mark** - route marked packets via a VPN
- **IP TOS/DSCP** - route certain traffic classes differently
- **Incoming interface** - route based on which interface traffic arrived on

## How PBR Works on Linux

Linux implements PBR with:
1. **Routing tables** - multiple routing tables (not just the main table)
2. **IP rules** - rules that select which table to use for a packet

```bash
# View current rules

ip rule show

# Default rules:
# 0:    from all lookup local      (loopback/local IPs)
# 32766: from all lookup main      (normal routing)
# 32767: from all lookup default   (fallback)
```

## Example: Route by Source IP (Dual ISP)

Scenario: Two ISP uplinks. Route 192.168.1.0/24 through ISP1 and 192.168.2.0/24 through ISP2.

```bash
# Step 1: Register named routing tables
echo "100 isp1" >> /etc/iproute2/rt_tables
echo "200 isp2" >> /etc/iproute2/rt_tables

# Step 2: Add routes to custom tables
# ISP1 table
ip route add default via 203.0.113.1 dev eth1 table isp1
ip route add 192.168.1.0/24 dev eth0 table isp1

# ISP2 table
ip route add default via 198.51.100.1 dev eth2 table isp2
ip route add 192.168.2.0/24 dev eth0 table isp2

# Step 3: Add policy rules
ip rule add from 192.168.1.0/24 lookup isp1 priority 100
ip rule add from 192.168.2.0/24 lookup isp2 priority 200

# Verify
ip rule show
ip route show table isp1
ip route show table isp2
```

## Example: Route VPN Traffic by Mark

Use iptables to mark packets, then route marked packets through VPN:

```bash
# Mark packets from a specific application using iptables
iptables -t mangle -A OUTPUT -m owner --uid-owner vpnuser -j MARK --set-mark 100

# Register VPN table name
echo "300 vpntable" >> /etc/iproute2/rt_tables
ip route add default via 10.8.0.1 dev tun0 table vpntable

# Add rule: marked packets use vpntable
ip rule add fwmark 100 lookup vpntable priority 300
```

## Example: Route by Incoming Interface

Route forwarded traffic arriving on eth0 using a dedicated table (useful on routers/firewalls):

```bash
# Register a table name for eth0
echo "101 eth0rt" >> /etc/iproute2/rt_tables

# Add routes to eth0 table
ip route add 192.168.1.0/24 dev eth0 table eth0rt
ip route add default via 192.168.1.1 dev eth0 table eth0rt

# Rule: forwarded packets arriving on eth0 use eth0 table
ip rule add iif eth0 lookup eth0rt priority 150
```

## Making PBR Persistent

Use a startup script or network configuration:

```bash
#!/bin/bash
# /etc/network/pbr-setup.sh

# Ensure table names exist
grep -q "isp1" /etc/iproute2/rt_tables || echo "100 isp1" >> /etc/iproute2/rt_tables
grep -q "isp2" /etc/iproute2/rt_tables || echo "200 isp2" >> /etc/iproute2/rt_tables

# ISP1 routes
ip route replace default via 203.0.113.1 dev eth1 table isp1
ip route replace 192.168.1.0/24 dev eth0 table isp1

# ISP2 routes
ip route replace default via 198.51.100.1 dev eth2 table isp2
ip route replace 192.168.2.0/24 dev eth0 table isp2

# Rules
ip rule del from 192.168.1.0/24 lookup isp1 2>/dev/null
ip rule add from 192.168.1.0/24 lookup isp1 priority 100

ip rule del from 192.168.2.0/24 lookup isp2 2>/dev/null
ip rule add from 192.168.2.0/24 lookup isp2 priority 200
```

## Debugging PBR

```bash
# Check which table is selected for a specific source/destination
ip route get 8.8.8.8 from 192.168.1.10

# Show all rules
ip rule show

# Test traffic path
traceroute -s 192.168.1.10 8.8.8.8   # Source 192.168.1.10
traceroute -s 192.168.2.10 8.8.8.8   # Source 192.168.2.10
# Should use different paths
```

## Key Takeaways

- Linux PBR uses `ip rule` to select routing tables based on traffic attributes.
- Named custom routing tables are typically added in `/etc/iproute2/rt_tables`.
- Rules are evaluated by priority (lower = first); first match wins.
- `ip route get DEST from SOURCE` tests which route applies for a given source/destination pair.

**Related Reading:**

- [How to Understand How IPv4 Routing Decisions Are Made](https://oneuptime.com/blog/post/2026-03-20-ipv4-routing-decisions/view)
- [How to Set Up IP Forwarding on Linux](https://oneuptime.com/blog/post/2026-03-20-ip-forwarding-linux/view)
- [How to Understand ARP Flux on Multi-Homed Linux Hosts](https://oneuptime.com/blog/post/2026-03-20-arp-flux-multi-homed-linux/view)
