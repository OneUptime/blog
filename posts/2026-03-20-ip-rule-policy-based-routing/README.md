# How to Use ip rule for Policy-Based Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, ip command, iproute2, Policy Routing, Ip rule, Networking

Description: Configure policy-based routing on Linux using ip rule to direct traffic to specific routing tables based on source address, destination, mark, or ToS.

## Introduction

`ip rule` manages the policy routing database - a list of rules evaluated in priority order. Each rule specifies a match condition (source IP, fwmark, etc.) and which routing table to consult. The built-in `main` table rule is normally priority `32766`, so custom rules with lower priority numbers are consulted before it, enabling per-source routing, VPN split tunneling, and multi-homing.

## Show All Rules

```bash
# Display the policy routing database

ip rule list

# Default output (three built-in rules):
# 0:      from all lookup local
# 32766:  from all lookup main
# 32767:  from all lookup default
```

Lower priority number = evaluated first.

## Add a Rule by Source Address

```bash
# Route all traffic from 10.0.0.100 via table 100
ip rule add from 10.0.0.100/32 table 100 priority 100

# Route subnet traffic via table 200
ip rule add from 192.168.2.0/24 table 200 priority 200
```

## Add a Rule by Destination Address

```bash
# Traffic to 10.5.0.0/24 uses table 50
ip rule add to 10.5.0.0/24 table 50 priority 50
```

## Add a Rule by Firewall Mark

```bash
# Route marked packets (fwmark 1) via table 100
ip rule add fwmark 1 table 100 priority 100

# Mark packets with iptables
iptables -t mangle -A OUTPUT -p tcp --dport 80 -j MARK --set-mark 1
```

## Add a Rule by Incoming Interface

```bash
# Traffic arriving on eth1 uses table 200
ip rule add iif eth1 table 200
```

## Add Routes to the Custom Tables

```bash
# Table 100 routes (used for source 10.0.0.100)
ip route add 10.0.0.0/24 dev eth0 table 100
ip route add default via 10.0.0.1 dev eth0 table 100

# Table 200 routes
ip route add 10.0.1.0/24 dev eth1 table 200
ip route add default via 10.0.1.1 dev eth1 table 200
```

## Verify Rule and Route Are Working

```bash
# Show rules
ip rule list

# Show routes in custom table
ip route show table 100

# Test routing decision
ip route get 8.8.8.8 from 10.0.0.100
```

## Delete a Rule

```bash
# Delete by matching the exact rule
ip rule del from 10.0.0.100/32 table 100 priority 100
```

## Rule Priority

```bash
# Lower number = higher priority
# The built-in rules are typically 0 (local), 32766 (main), and 32767 (default)

# Insert high-priority rule
ip rule add from 10.0.0.100 table 100 priority 10

# Leave main table as fallback (default priority 32766)
```

## Make Rules Persistent

```bash
# Persist the equivalent configuration in startup or network config
# (for example, /etc/rc.local, Netplan, NetworkManager via nmcli, or systemd-networkd)
```

## Conclusion

`ip rule` defines the policy routing database. Rules evaluate conditions in priority order and direct packets to specific routing tables. Common match conditions are `from` (source IP), `to` (destination), `fwmark`, and `iif`. Combine with custom routing tables populated via `ip route add ... table <n>`.
