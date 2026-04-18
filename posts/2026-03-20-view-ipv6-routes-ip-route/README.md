# How to View IPv6 Routes with ip -6 route

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Linux, Routing, ip command, Network Diagnostics

Description: A guide to using `ip -6 route` to view, filter, and interpret IPv6 routing table entries on Linux systems.

## Basic IPv6 Route Display

```bash
# Show all IPv6 routes

ip -6 route show

# Short form
ip -6 route

# Show routes for a specific table
ip -6 route show table main
ip -6 route show table local
ip -6 route show table all
```

## Understanding ip -6 route Output

```bash
$ ip -6 route show

2001:db8::/64 dev eth0 proto kernel metric 256 pref medium
2001:db8:abcd::/48 via 2001:db8::1 dev eth0 proto static metric 1024 pref medium
default via 2001:db8::1 dev eth0 proto static metric 1024 pref medium
```

Output fields:
- **Destination**: Network prefix (e.g., `2001:db8::/64`) or `default` (`::/0`)
- **via**: Next-hop gateway address
- **dev**: Outgoing interface
- **proto**: How the route was learned (`kernel`, `static`, `ra`, `dhcp`, `bird`, `ospf`)
- **metric**: Route preference (lower = preferred)
- **pref**: Address preference (`high`, `medium`, `low`)

## Showing Default IPv6 Route

```bash
# Show only the default IPv6 route
ip -6 route show default
# or
ip -6 route show ::/0

# Expected output:
# default via 2001:db8::1 dev eth0 proto ra metric 1024 expires 1799sec pref medium
```

## Tracing the Route for a Destination

```bash
# Show which route will be used to reach a specific destination
ip -6 route get 2001:4860:4860::8888

# Output:
# 2001:4860:4860::8888 from :: via 2001:db8::1 dev eth0 src 2001:db8::10 uid 0
#     cache

# This tells you:
# - Next-hop: 2001:db8::1
# - Interface: eth0
# - Source address that will be used: 2001:db8::10
```

## Adding and Removing IPv6 Routes

```bash
# Add a static IPv6 default route
ip -6 route add default via 2001:db8::1 dev eth0

# Add a specific route
ip -6 route add 2001:db8:abcd::/48 via 2001:db8::1

# Add a route with metric (for multiple default routes)
ip -6 route add default via 2001:db8::1 dev eth0 metric 100
ip -6 route add default via 2001:db8::2 dev eth1 metric 200

# Remove a route
ip -6 route del 2001:db8:abcd::/48

# Remove the default route
ip -6 route del default via 2001:db8::1
```

## Filtering Routes

```bash
# Show routes learned from Router Advertisements
ip -6 route show proto ra

# Show statically configured routes
ip -6 route show proto static

# Show kernel-generated routes (connected routes)
ip -6 route show proto kernel

# Show routes through a specific interface
ip -6 route show dev eth0

# Show routes with specific destination scope
ip -6 route show scope global
ip -6 route show scope link
ip -6 route show scope host
```

## Multipath (ECMP) IPv6 Routes

```bash
# Show ECMP routes (multiple paths to same destination)
ip -6 route show | grep -A 3 'nexthop'

# Add a multipath route
ip -6 route add 2001:db8:abcd::/48 \
    nexthop via 2001:db8::a1 dev eth0 weight 1 \
    nexthop via 2001:db8::a2 dev eth1 weight 1

# Verify ECMP route
ip -6 route show 2001:db8:abcd::/48
```

## IPv6 Routing Table Debugging

```bash
# Verbose route lookup
ip -6 route get 2001:4860:4860::8888

# Check if a route exists for a specific destination
if ip -6 route get 2001:db8::cafe > /dev/null 2>&1; then
    echo "Route exists"
else
    echo "No route to 2001:db8::cafe"
fi

# Monitor route changes in real time
ip -6 monitor route

# Show routing table in JSON format
ip -j -6 route show | python3 -m json.tool
```

## Comparing IPv4 and IPv6 Routing Tables

```bash
# View both tables together
ip route show && echo '---' && ip -6 route show

# Count routes in each table
echo "IPv4 routes: $(ip route show | wc -l)"
echo "IPv6 routes: $(ip -6 route show | wc -l)"
```

## Summary

Use `ip -6 route show` to view all IPv6 routes, `ip -6 route show default` for the default route, and `ip -6 route get <dst>` to trace which route and source address will be used for a specific destination. Filter by protocol (`proto ra`, `proto static`, `proto kernel`), interface (`dev eth0`), or scope. Add routes with `ip -6 route add` and remove with `ip -6 route del`. Monitor live route changes with `ip -6 monitor route`.
