# How to Configure Policy-Based Routing with systemd-networkd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Policy-Based Routing, systemd-networkd, Linux, Ip rule, Routing Table, IPv4, Multi-homing

Description: Learn how to configure policy-based routing using systemd-networkd .network files with RoutingPolicyRule sections to route traffic based on source IP, destination, or interface.

---

Policy-based routing (PBR) uses routing rules to select different routing tables based on packet attributes. systemd-networkd supports PBR through `[RoutingPolicyRule]` sections in `.network` files.

## Basic Policy-Based Routing Scenario

```text
eth0: 192.168.1.10/24 (Office LAN, ISP1)
eth1: 10.0.0.10/24 (Secondary, ISP2)

Goal: Traffic from 192.168.1.10 uses ISP1; traffic from 10.0.0.10 uses ISP2
```

## Configuration Files

### eth0 (Primary ISP1)

```ini
# /etc/systemd/network/10-eth0.network

[Match]
Name=eth0

[Network]
Address=192.168.1.10/24
Gateway=192.168.1.1

# Default route for ISP1 goes in main table (no Table= means main)
```

### eth1 (Secondary ISP2)

```ini
# /etc/systemd/network/20-eth1.network
[Match]
Name=eth1

[Network]
Address=10.0.0.10/24
# No Gateway here - we'll add it to a custom table

[Route]
Destination=0.0.0.0/0
Gateway=10.0.0.1
Table=200             # Add default route to table 200

[Route]
Destination=10.0.0.0/24
Table=200             # Add connected route to table 200

[RoutingPolicyRule]
From=10.0.0.10/32     # Match traffic from eth1's IP
Table=200             # Use table 200 for routing
Priority=100          # Evaluate before main table (lower = higher priority)
```

## Applying and Verifying

```bash
networkctl reload

# Verify routing rules
ip rule show
# 0: from all lookup local
# 100: from 10.0.0.10 lookup 200
# 32766: from all lookup main
# 32767: from all lookup default

# Verify table 200 routes
ip route show table 200
# default via 10.0.0.1 dev eth1
# 10.0.0.0/24 dev eth1 proto static scope link

# Test: traffic from eth1's IP uses ISP2
ip route get 8.8.8.8 from 10.0.0.10
# 8.8.8.8 from 10.0.0.10 via 10.0.0.1 dev eth1
```

## Advanced: Route by Destination

```ini
[RoutingPolicyRule]
To=10.50.0.0/24       # Match traffic to specific destination
Table=300
Priority=200
```

## Advanced: Route by DS Field

```ini
[RoutingPolicyRule]
TypeOfService=184     # DS field value for DSCP EF (46) with ECN 0
Table=400
Priority=50
```

## Full Policy with Multiple Tables

```ini
# /etc/systemd/network/20-eth1.network
[Match]
Name=eth1

[Network]
Address=10.0.0.10/24

[Route]
Destination=0.0.0.0/0
Gateway=10.0.0.1
Table=200

[Route]
Destination=10.0.0.0/24
Scope=link
Table=200

[RoutingPolicyRule]
From=10.0.0.10/32
Table=200
Priority=100

[RoutingPolicyRule]
IncomingInterface=eth1  # Match packets arriving on eth1
Table=200
Priority=101
```

## Key Takeaways

- Use `[RoutingPolicyRule]` in `.network` files to create `ip rule` entries managed by systemd-networkd.
- Pair `[RoutingPolicyRule]` with `[Route]` sections that use `Table=` to populate the custom routing table.
- Lower `Priority=` values are evaluated first; ensure your custom rules have lower priority numbers than 32766 (main table).
- `networkctl reload` applies changes; verify with `ip rule show` and `ip route show table <N>`.
