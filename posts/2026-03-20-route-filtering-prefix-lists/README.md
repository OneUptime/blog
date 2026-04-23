# How to Configure Route Filtering with Prefix Lists

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Routing, Prefix Lists, OSPF, BGP, FRR

Description: Use prefix lists to filter specific routes from being advertised or accepted by routing protocols, giving you precise control over routing policy.

## Introduction

Prefix lists are ordered access control lists for IP prefixes. They match routes based on network address and prefix length, and are used to filter routing information in BGP and other protocols. In OSPF, prefix lists are commonly used on ABRs to filter Type-3 summary LSAs between areas. Prefix lists are preferred over access lists for route filtering because they can match on prefix length ranges - for example, all /24s within a /16.

## Prefix List Syntax

```text
ip prefix-list NAME [seq NUMBER] permit|deny PREFIX [le LENGTH] [ge LENGTH]

# le = less than or equal (prefix length must be <= this)

# ge = greater than or equal (prefix length must be >= this)
```

## Basic Prefix List Examples (FRR)

```bash
# Permit only 10.1.0.0/24 exactly
ip prefix-list EXACT-MATCH seq 10 permit 10.1.0.0/24
ip prefix-list EXACT-MATCH seq 20 deny 0.0.0.0/0 le 32

# Permit all prefixes within 10.0.0.0/8 with length /24 or shorter
ip prefix-list AGGREGATE-FILTER seq 10 permit 10.0.0.0/8 le 24

# Permit all /24 and /25 prefixes inside 192.168.0.0/16
ip prefix-list SPECIFIC seq 10 permit 192.168.0.0/16 ge 24 le 25

# Deny the default route
ip prefix-list NO-DEFAULT seq 10 deny 0.0.0.0/0
ip prefix-list NO-DEFAULT seq 20 permit 0.0.0.0/0 le 32
```

## Applying Prefix Lists to OSPF

```bash
# Filter routes redistributed INTO OSPF from static
route-map STATIC-TO-OSPF permit 10
  match ip address prefix-list EXACT-MATCH

router ospf
  redistribute static route-map STATIC-TO-OSPF

# Filter Type-3 summary LSAs entering an area on an ABR
router ospf
  area 0.0.0.1 filter-list prefix NO-DEFAULT in
```

## Applying Prefix Lists to BGP

```bash
router bgp 65001
  address-family ipv4 unicast
    # Filter outbound BGP advertisements to a neighbor
    neighbor 10.0.0.2 prefix-list OUTBOUND-FILTER out

    # Filter inbound BGP routes received from a neighbor
    neighbor 10.0.0.2 prefix-list INBOUND-FILTER in
```

## Applying Prefix Lists Inside a Route Map

For more complex filtering with set operations, use prefix lists inside route maps:

```bash
# Define the prefix list
ip prefix-list INTERNAL-ONLY seq 10 permit 10.0.0.0/8 le 24
ip prefix-list INTERNAL-ONLY seq 20 deny 0.0.0.0/0 le 32

# Reference in route map
route-map EXPORT-MAP permit 10
  match ip address prefix-list INTERNAL-ONLY
  set community 65001:100

route-map EXPORT-MAP deny 20

# Apply to BGP neighbor
router bgp 65001
  address-family ipv4 unicast
    neighbor 10.0.0.2 route-map EXPORT-MAP out
```

## Verifying Prefix Lists

```bash
# Show all configured prefix lists
vtysh -c "show ip prefix-list"

# Show a specific prefix list
vtysh -c "show ip prefix-list EXACT-MATCH"

# Test a prefix against a list
vtysh -c "debug prefix-list EXACT-MATCH match 10.1.0.0/24"

# Show match counts for each entry
vtysh -c "show ip prefix-list detail"
```

## Conclusion

Prefix lists are a readable and efficient way to filter routing updates. They support prefix-length range matching with `ge` and `le`, making it easy to block overly specific routes (deaggregated /32s) or permit only aggregates. FRR applies a default deny when a defined prefix list has no match; adding an explicit deny or permit for the remaining prefixes makes that behavior visible in configuration.
