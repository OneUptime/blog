# How to Understand Recursive Routing Lookups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Routing, BGP, Recursive Lookup, IPv4, Troubleshooting

Description: Understand recursive routing lookups - where a route's next-hop requires another routing lookup - and how misconfigurations cause routes to become invalid.

## Introduction

A recursive routing lookup occurs when a route's next-hop is not directly connected and must itself be resolved through another routing lookup. BGP routes commonly require recursive lookups: the BGP next-hop might be a loopback address resolved via an IGP route. Understanding this chain is essential for diagnosing why routes become invalid.

## How Recursive Lookups Work

```text
BGP route: 10.20.0.0/24 next-hop 192.0.2.1
           |
           +--> Recursive lookup for 192.0.2.1
                |
                +--> OSPF route: 192.0.2.0/30 via 172.16.0.1 dev eth0
                     |
                     +--> Connected: 172.16.0.0/24 dev eth0  (resolved!)
```

The final resolved next-hop is 172.16.0.1 on eth0. If the OSPF route for 192.0.2.0/30 disappears, the BGP route for 10.20.0.0/24 becomes invalid.

## Viewing Recursive Resolution in FRR

```bash
# Show a BGP route with its next-hop information

vtysh -c "show bgp ipv4 unicast 10.20.0.0/24"

# Inspect the tracked next-hop directly
vtysh -c "show bgp nexthop 192.0.2.1 detail"
```

## Diagnosing a Failed Recursive Lookup

```bash
# Check if the BGP next-hop is resolvable
ip route get 192.0.2.1

# If the lookup fails, that's why the BGP route is invalid

# Check what IGP route covers the next-hop
ip route show | grep "192.0.2"

# Check FRR next-hop tracking state
vtysh -c "show ip nht 192.0.2.1"

# Check OSPF for the covering route
vtysh -c "show ip ospf route" | grep "192.0.2"
```

## Recursive Next-Hop Validation

Recursive lookups must eventually resolve to a non-recursive route. If the chain loops or the next-hop cannot be resolved, FRR keeps the path invalid:

```bash
# Check BGP next-hop recursion status
vtysh -c "show bgp nexthop 192.0.2.1 detail"

# Check zebra next-hop tracking state
vtysh -c "show ip nht 192.0.2.1"
```

## eBGP Connected Check vs. Recursive Resolution

Do not confuse recursive next-hop resolution with FRR's eBGP connected-route check. These commands affect whether a single-hop eBGP session can form to a loopback or otherwise non-directly connected peer address; they do not disable recursive resolution for learned routes:

```bash
# FRR BGP: disable the single-hop eBGP connected-route check globally
router bgp 65001
  bgp disable-ebgp-connected-route-check

# Or per neighbor
neighbor 10.0.0.2 disable-connected-check
```

## Static Route Recursive Lookup

```bash
# Static route with recursive next-hop
# 10.20.0.0/24 via 192.168.5.1
# 192.168.5.1 must be reachable via an existing route

ip route add 10.20.0.0/24 via 192.168.5.1

# The kernel only accepts this if 192.168.5.1 is reachable via an existing route,
# unless you explicitly force the nexthop to be treated as directly attached with "onlink".
```

## Conclusion

Recursive routing lookups form dependency chains between routes. A failure at any level in the chain invalidates all routes that depend on it. This is why IGP stability is critical in networks running BGP - if OSPF loses a route to a BGP next-hop, all BGP prefixes pointing to that next-hop become unreachable. Monitor your IGP health to protect BGP reachability.
