# How to View the IPv6 Routing Table on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Linux, Routing Table, ip command, Networking

Description: Learn how to view and interpret the IPv6 routing table on Linux using the ip command and other tools.

## Overview

Linux provides multiple tools to view the IPv6 routing table. The modern approach uses the `ip` command from the `iproute2` package, but legacy tools like `netstat` and `route` may still be available on systems with the `net-tools` package installed.

## Using the ip Command (Recommended)

```bash
# Show the main IPv6 routing table

ip -6 route show

# Sample output:
# 2001:db8::/64 dev eth0 proto kernel scope link src 2001:db8::1 metric 256
# fe80::/64 dev eth0 proto kernel scope link metric 256
# default via fe80::1 dev eth0 proto ra metric 1024 expires 1799sec

# Show routes for a specific interface
ip -6 route show dev eth0

# Show only the default route
ip -6 route show default

# Show routes for a specific prefix
ip -6 route show 2001:db8::/32
```

## Getting the Route for a Specific Destination

```bash
# Look up which route would be used to reach a specific host
ip -6 route get 2001:db8::100

# Output shows the exact path including interface and next hop:
# 2001:db8::100 via fe80::1 dev eth0 src 2001:db8::2 metric 1024
```

## Showing All Routing Tables

Linux supports policy-based routing with multiple tables:

```bash
# Show routes from all tables
ip -6 route show table all

# Show the local table managed by the kernel
ip -6 route show table local

# Show table 100 (if you use a custom policy routing table)
ip -6 route show table 100
```

## Detailed Route Information

```bash
# Show routes with full details
ip -d -6 route show

# Show cached IPv6 route entries, if any
ip -6 route show cache

# Show routes with protocol info
ip -6 route show proto static   # Only static routes
ip -6 route show proto ra       # Only Router Advertisement routes
ip -6 route show proto kernel   # Only kernel-added routes
```

## Using netstat (Legacy)

```bash
# Show IPv6 routing table with netstat
netstat -6rn

# Output format:
# Kernel IPv6 routing table
# Destination                    Next Hop                   Flag Met Ref  Use If
# ::/0                           fe80::1                    UG   1024 0      0 eth0
# ::1/128                        ::                         Un   0   0      0 lo
# 2001:db8::/64                  ::                         U    256 0      0 eth0
```

## Using route (Very Legacy)

```bash
# Show IPv6 routes (old-style)
route -6 -n

# Flags:
# U = Up (route is active)
# G = Gateway (requires next hop)
# H = Host (single host route, not a network)
```

## Filtering with grep

```bash
# Find only routes learned from OSPF
ip -6 route show | grep "proto ospf"

# Find routes going through a specific gateway
ip -6 route show | grep "via fe80::1"

# Find all /64 routes
ip -6 route show | grep "/64"
```

## Watching Route Changes in Real Time

```bash
# Monitor IPv6 routing table changes live
ip -6 monitor route

# Output shows routes as they are added or deleted:
# 2001:db8:1::/64 dev eth0 proto ra
# Deleted 2001:db8:2::/64 dev eth1 proto ra
```

## Summary

The `ip -6 route show` command is the primary way to view the IPv6 routing table on modern Linux systems. Use `ip -6 route get <address>` to simulate a route lookup, `show table all` to see all routing tables, and `ip -6 monitor route` to observe live changes. Legacy tools like `netstat -6rn` and `route -6 -n` may still be available on systems with `net-tools` installed.
