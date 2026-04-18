# How to View All Routes with ip route show

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, ip command, iproute2, Routing, Networking, Diagnostic

Description: View and filter routing table entries on Linux using ip route show, including filtering by destination, type, table, and protocol.

## Introduction

`ip route show` displays the routing table. It is the modern replacement for `route -n`. The routing table determines which interface and gateway to use for each destination. Understanding route output is fundamental to network troubleshooting.

## Show the Main Routing Table

```bash
# Show all routes in the main table

ip route show

# Sample output:
# default via 192.168.1.1 dev eth0 proto dhcp metric 100
# 192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.100
```

## Filter by Destination Network

```bash
# Show route to a specific network (exact prefix match)
ip route show 192.168.1.0/24

# Show routes that match (including broader/default routes)
ip route show match 192.168.1.0/24
```

## Show the Default Route

```bash
# Show only the default route
ip route show default

# Alternative
ip route show 0.0.0.0/0
```

## Show Routes via Specific Interface

```bash
# Routes using eth0 as outgoing interface
ip route show dev eth0
```

## Show Routes via Specific Gateway

```bash
# Routes using 10.0.0.1 as gateway
ip route show via 10.0.0.1
```

## Show Routes with Protocol Filter

```bash
# Kernel-installed routes (from connected subnets)
ip route show proto kernel

# Static routes
ip route show proto static

# Routes from routing daemon
ip route show proto bgp
ip route show proto ospf
```

## Show Routes from Specific Table

```bash
# Routes in the local table (local IPs and broadcast)
ip route show table local

# Routes in a custom table (by number)
ip route show table 100

# Routes in ALL tables
ip route show table all
```

## Show Route Type

```bash
# Unicast routes (normal routes)
ip route show type unicast

# Blackhole routes
ip route show type blackhole

# Unreachable routes
ip route show type unreachable
```

## Show Brief Output

```bash
# One line per route, less verbose
ip -brief route show
```

## Show Routes as JSON

```bash
ip -json route show | python3 -m json.tool
```

## ip route show vs route -n

```bash
# Modern (ip route)
ip route show

# Deprecated (route)
route -n

# ip route is preferred and more feature-rich
```

## Conclusion

`ip route show` is the primary tool for inspecting the Linux routing table. Filter with `via`, `dev`, `proto`, `type`, and `table` options to narrow results. Use `ip route show table all` to see routes across all tables. The `default` keyword shows only the default route.
