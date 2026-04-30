# How to Configure a Floating Static Route as a Backup Path

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Routing, Static Routes, Failover, Linux, IPv4

Description: Configure a floating static route with a higher metric to serve as an automatic backup path when the primary route becomes unavailable.

## Introduction

A floating static route is a static route configured with a higher metric than the primary path. On routing stacks that use administrative distance, the same idea is implemented with a higher administrative distance. Under normal conditions, the primary route is preferred and the floating route is not used. If the primary route disappears from the routing table, the floating route automatically activates.

## How Floating Routes Work

For identical destination prefixes in the same table, Linux prefers the route with the lower metric. By giving the backup route a higher metric, it stays dormant until the primary is gone:

```text
Primary:  10.20.0.0/24 via 192.168.1.1  metric 10   (active)
Backup:   10.20.0.0/24 via 192.168.2.1  metric 100  (floating, dormant)
```

When the 10.20.0.0/24 via 192.168.1.1 route is removed, Linux automatically uses the backup.

## Configuring the Primary and Floating Routes

```bash
# Primary route - lower metric, preferred path

ip route add 10.20.0.0/24 via 192.168.1.1 metric 10

# Floating/backup route - higher metric, only used if primary is gone
ip route add 10.20.0.0/24 via 192.168.2.1 metric 100

# Verify both routes are installed
ip route show 10.20.0.0/24
# 10.20.0.0/24 via 192.168.1.1 dev eth0 metric 10
# 10.20.0.0/24 via 192.168.2.1 dev eth1 metric 100
```

## Simulating Failover

```bash
# Simulate primary route withdrawal
ip route del 10.20.0.0/24 via 192.168.1.1

# The backup route becomes active
ip route show 10.20.0.0/24
# 10.20.0.0/24 via 192.168.2.1 dev eth1 metric 100

# Verify connectivity still works through backup
ping -c 4 10.20.0.5

# Restore the primary route
ip route add 10.20.0.0/24 via 192.168.1.1 metric 10
# Primary route returns and takes over automatically
```

## Making Floating Routes Persistent

With systemd-networkd:

```ini
# /etc/systemd/network/10-primary.network
[Match]
Name=eth0

[Network]
Address=192.168.1.2/24

[Route]
Destination=10.20.0.0/24
Gateway=192.168.1.1
Metric=10
```

```ini
# /etc/systemd/network/20-backup.network
[Match]
Name=eth1

[Network]
Address=192.168.2.2/24

[Route]
Destination=10.20.0.0/24
Gateway=192.168.2.1
Metric=100
```

## Combining with Dynamic Routing

When using OSPF in FRR, a floating static default route can serve as a backup to the OSPF-learned default:

```bash
# In FRR, use administrative distance rather than the Linux kernel metric
# OSPF routes have distance 110 by default, so set the static route higher
vtysh -c 'configure terminal' \
      -c 'ip route 0.0.0.0/0 203.0.113.1 200'

# FRR keeps the static default as a backup
# If the OSPF default disappears, the distance-200 static route takes over
```

## Monitoring Failover

```bash
# Watch the routing table for changes in real time
watch -n 2 "ip route show 10.20.0.0/24"

# Log route changes using iproute2 monitor
ip monitor route | grep "10.20.0.0/24"
```

## Conclusion

Floating static routes are a simple, zero-protocol-overhead method for route failover. They are ideal for dual-ISP setups, WAN backup links, and any scenario where you want a deterministic failover without running a full dynamic routing protocol. For more intelligent failover that can detect remote failures (not just local link failures), combine with BFD or a monitoring daemon.
