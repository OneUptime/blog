# How to Display the Routing Table with ip route show on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, Routing, ip command, IPv4, Network Diagnostics

Description: Display and interpret the Linux IPv4 routing table using ip route show, filter by destination, and understand the fields including metric, scope, and nexthop.

## Introduction

The routing table determines how the kernel forwards packets. `ip route show` is the modern command to display it. Understanding the output is essential for diagnosing routing issues and verifying that static routes are in place.

## Basic Routing Table Display

```bash
# Show the main routing table

ip route show

# Equivalent short form
ip route
ip r
```

Sample output:

```text
default via 192.168.1.1 dev eth0 proto dhcp src 192.168.1.100 metric 100
192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.100
10.0.0.0/8 via 192.168.1.254 dev eth0 proto static metric 200
```

## Field Explanation

| Field | Meaning |
|---|---|
| `default` | Default route (0.0.0.0/0) |
| `via 192.168.1.1` | Next-hop gateway |
| `dev eth0` | Outbound interface |
| `proto dhcp` | Route source: DHCP |
| `proto kernel` | Added by kernel for connected network |
| `proto static` | Added manually |
| `scope link` | Destination is directly reachable (no gateway) |
| `metric 100` | Route preference (lower = preferred) |
| `src 192.168.1.100` | Preferred source address for this route |

## Filtering by Destination

```bash
# Show only routes matching a specific prefix
ip route show 10.0.0.0/8

# Show the route that would be used to reach a host
ip route get 8.8.8.8
```

`ip route get` is invaluable for debugging - it shows exactly which route the kernel would use and what source address would be selected:

```text
8.8.8.8 via 192.168.1.1 dev eth0 src 192.168.1.100 uid 1000
```

## Show All Routing Tables

Linux maintains multiple routing tables (main, local, default):

```bash
# Show all routing tables
ip route show table all

# Show the local table (includes broadcast/loopback routes)
ip route show table local

# Show table by number or name
ip route show table 254   # main table
```

## IPv4-Only Output

```bash
# Suppress IPv6 routes
ip -4 route show
```

## Verbose Output

```bash
# Show more detailed route entries
ip -details route show
```

## Checking Route Counts

```bash
# Count the number of routes in the main table
ip route show | wc -l
```

## Conclusion

`ip route show` and `ip route get <destination>` are the two most useful routing diagnostic commands. The former shows the full table; the latter shows the specific route chosen for a destination, which is faster than scanning the entire table manually.
