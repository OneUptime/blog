# How to Use ip route get to Trace Packet Path

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, ip command, iproute2, Routing, Networking, Diagnostic

Description: Use ip route get to trace which route and interface the kernel would use to send a packet to a specific destination, useful for routing troubleshooting.

## Introduction

`ip route get` performs a routing table lookup for a specific destination and shows exactly which route the kernel would use. Unlike `ip route show`, which displays the entire table, `ip route get` answers "which path would this specific packet take?"

## Basic Route Lookup

```bash
# Which route handles traffic to 8.8.8.8?

ip route get 8.8.8.8

# Sample output:
# 8.8.8.8 via 192.168.1.1 dev eth0 src 192.168.1.100 uid 0
#     cache
```

## Trace Path from a Specific Source

```bash
# Which route when source IP is 10.0.0.5?
ip route get 8.8.8.8 from 10.0.0.5

# Useful for policy routing - rules match source address
```

## Trace Path for a Local Destination

```bash
# Lookup for a host on the local subnet
ip route get 192.168.1.50

# Output:
# 192.168.1.50 dev eth0 src 192.168.1.100 uid 0
#     cache
# (no via - direct, same subnet)
```

## Trace Path via Specific Interface

```bash
# Simulate a packet from 10.0.0.5 arriving on eth1
ip route get 8.8.8.8 from 10.0.0.5 iif eth1

# Shows how the kernel would route a packet that arrived on eth1
```

## Trace Path with a Firewall Mark

```bash
# What route is used for packets with fwmark 1?
ip route get 8.8.8.8 mark 1

# Useful for policy routing with iptables marks
```

## Trace IPv4 Path Explicitly

```bash
ip -4 route get 8.8.8.8
```

## Understanding the Output

```text
8.8.8.8 via 192.168.1.1 dev eth0 src 192.168.1.100 uid 0
 ↑        ↑              ↑       ↑
 dest     gateway        iface   source IP chosen
```

- `via` - next hop gateway
- `dev` - outgoing interface
- `src` - source IP the kernel would use
- `uid` - user ID used for the lookup

## Use Cases

```bash
# Verify policy routing is working
ip route get 8.8.8.8 from 10.0.0.100
ip route get 8.8.8.8 from 10.0.1.100
# These should show different routes if policy routing is configured

# Check which interface handles subnet traffic
ip route get 172.16.50.1

# Debug asymmetric routing
ip route get 10.0.0.5 from 192.168.1.1
```

## Comparison with traceroute

```bash
# ip route get: shows kernel's routing decision (local only, no packets sent)
ip route get 8.8.8.8

# traceroute: sends actual packets and shows each hop
traceroute 8.8.8.8
```

## Conclusion

`ip route get <destination>` shows exactly which route, gateway, and interface the kernel would use for a specific packet. Add `from <source>` to simulate policy routing lookups. This command is purely informational - no packets are sent. It is indispensable for diagnosing routing issues without generating actual traffic.
