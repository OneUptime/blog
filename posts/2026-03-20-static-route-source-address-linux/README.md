# How to Add a Static Route for a Specific Source Address on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Static Routes, Source Address, Policy Routing, Linux, Ip rule, Ip route, IPv4

Description: Learn how to add static routes based on the source IP address using Linux policy routing (ip rule and ip route) to control which path traffic takes based on its source.

---

Policy-based routing routes packets based on the source IP address rather than just the destination. This is useful when a host has multiple interfaces or IPs and different traffic should take different paths.

## When to Use Source-Based Routing

- Host with two ISPs: traffic from IP1 goes via ISP1, traffic from IP2 goes via ISP2.
- Multiple VLANs: responses must leave via the same interface they arrived on.
- Container/VM networking: each tenant uses its own routing table.

## Creating a Source-Based Route

```bash
# Scenario:

# eth0: 192.168.1.10/24 via gateway 192.168.1.1 (ISP1)
# eth1: 10.0.0.10/24 via gateway 10.0.0.1 (ISP2)

# Step 1: Send ISP2 source traffic to routing table 100
ip rule add from 10.0.0.10/32 lookup 100

# Step 2: Add routes to table 100
ip route add 10.0.0.0/24 dev eth1 table 100
ip route add default via 10.0.0.1 dev eth1 table 100

# Step 3: Verify
ip rule show
# 0:     from all lookup local
# 32765: from 10.0.0.10 lookup 100
# 32766: from all lookup main
# 32767: from all lookup default
```

## Testing the Source-Based Route

```bash
# Traffic from 10.0.0.10 should use ISP2 (via 10.0.0.1)
ping -I 10.0.0.10 8.8.8.8

# Traffic from 192.168.1.10 should use ISP1 (default route)
ping -I 192.168.1.10 8.8.8.8

# Verify which route is used
ip route get 8.8.8.8 from 10.0.0.10
# 8.8.8.8 from 10.0.0.10 via 10.0.0.1 dev eth1
```

## Named Routing Tables

```bash
# /etc/iproute2/rt_tables - assign friendly names
# Add: 100 isp2
echo "100 isp2" >> /etc/iproute2/rt_tables

# Now use the name
ip rule add from 10.0.0.10 lookup isp2
ip route add 10.0.0.0/24 dev eth1 table isp2
ip route add default via 10.0.0.1 dev eth1 table isp2
```

## Making Rules Persistent with systemd-networkd

```ini
# /etc/systemd/network/eth1.network
[Match]
Name=eth1

[Network]
Address=10.0.0.10/24

[RoutingPolicyRule]
From=10.0.0.10
Table=100
Priority=100

[Route]
Destination=10.0.0.0/24
Table=100

[Route]
Destination=0.0.0.0/0
Gateway=10.0.0.1
Table=100
```

## Making Rules Persistent with /etc/network/interfaces

```bash
auto eth1
iface eth1 inet static
  address 10.0.0.10/24
  up ip rule add from 10.0.0.10 lookup 100
  up ip route add 10.0.0.0/24 dev eth1 table 100
  up ip route add default via 10.0.0.1 dev eth1 table 100
  down ip route del default via 10.0.0.1 dev eth1 table 100
  down ip route del 10.0.0.0/24 dev eth1 table 100
  down ip rule del from 10.0.0.10 lookup 100
```

## Key Takeaways

- Linux policy routing uses `ip rule` to select which routing table to use based on source IP, destination, TOS, or mark.
- Create a separate routing table (e.g., table 100) for each routing policy; add a full set of routes to it.
- Use `ip route get <dst> from <src>` to verify which gateway a specific source IP will use.
- In systemd-networkd, use `[RoutingPolicyRule]` and `[Route]` with `Table=` for persistent source-based routing.
