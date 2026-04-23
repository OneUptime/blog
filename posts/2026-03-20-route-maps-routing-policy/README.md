# How to Configure Route Maps for Routing Policy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Routing, Route Maps, BGP, OSPF, Policy

Description: Use route maps to implement sophisticated routing policies - matching routes on multiple criteria and applying attribute modifications before redistribution or advertisement.

## Introduction

Route maps are policy tools that combine matching conditions with attribute-setting actions. They work like an ordered list of if-then-else rules: if a route matches all conditions in a clause, apply the clause's permit or deny action; permit clauses can also apply set actions before processing stops. Route maps are used for redistribution filtering, BGP policy, policy-based routing on platforms that support it, and traffic engineering.

## Route Map Structure

```text
route-map MAP-NAME (permit|deny) SEQUENCE-NUMBER
  match CONDITION
  set ATTRIBUTE
```

Multiple clauses with increasing sequence numbers form the complete policy. An implicit deny at the end rejects unmatched routes in route-policy and redistribution use cases.

## Matching Criteria

```bash
# Match by prefix list

route-map MY-MAP permit 10
  match ip address prefix-list MY-PREFIXES

# Match by AS path (BGP)
bgp as-path access-list 1 permit ^65100_
route-map BGP-FILTER permit 10
  match as-path 1

# Match by BGP community
bgp community-list standard COMM-65001-200 permit 65001:200
route-map COMMUNITY-MATCH permit 10
  match community COMM-65001-200

# Match by BGP peer interface
route-map PEER-MATCH permit 10
  match peer eth0

# Match by metric/tag
route-map METRIC-MATCH permit 10
  match metric 100
  match tag 50
```

## Setting Attributes

```bash
# Set BGP attributes
route-map SET-ATTRS permit 10
  match ip address prefix-list INTERNAL
  set local-preference 200       # prefer this path internally
  set metric 50                  # set MED for eBGP
  set community 65001:100 additive
  set as-path prepend 65001 65001  # make path longer (less preferred)

# Set next-hop for BGP policy
route-map NEXT-HOP-POLICY permit 10
  match ip address prefix-list WEB-ROUTES
  set ip next-hop 10.0.0.1       # set BGP next-hop for matching routes

# Set OSPF redistribution metric
route-map OSPF-REDIST permit 10
  match ip address prefix-list STATIC-ROUTES
  set metric 20

router ospf
  redistribute static metric-type 1 route-map OSPF-REDIST  # type 1 = accumulated metric
```

## Full BGP Policy Example

```bash
# Allow customer routes, set community, reject everything else
ip prefix-list CUSTOMER-ROUTES seq 10 permit 203.0.113.0/24
ip prefix-list CUSTOMER-ROUTES seq 20 permit 198.51.100.0/24

route-map CUSTOMER-IN permit 10
  match ip address prefix-list CUSTOMER-ROUTES
  set local-preference 150
  set community 65001:500 additive

route-map CUSTOMER-IN deny 20
  # explicit catch-all: block all other routes

router bgp 65001
  neighbor 203.0.113.1 remote-as 65002
  address-family ipv4 unicast
    neighbor 203.0.113.1 route-map CUSTOMER-IN in
  exit-address-family
```

## Applying Route Maps to Redistribution

```bash
# Redistribute OSPF into BGP with selective route map
router bgp 65001
  address-family ipv4 unicast
    redistribute ospf route-map OSPF-TO-BGP
  exit-address-family

route-map OSPF-TO-BGP permit 10
  match ip address prefix-list EXPORTABLE
  set metric 100

route-map OSPF-TO-BGP deny 20
```

## Verifying Route Maps

```bash
# Show all route maps
vtysh -c "show route-map"

# Show a specific route map
vtysh -c "show route-map MY-MAP"

# Check BGP routes after policy application
vtysh -c "show ip bgp neighbors 10.0.0.2 received-routes"
vtysh -c "show ip bgp neighbors 10.0.0.2 advertised-routes"
```

## Conclusion

Route maps are the Swiss Army knife of routing policy. They give you granular control over what routes are accepted, what attributes are modified, and where traffic flows. Always test route maps in a lab before deploying, as an incorrect sequence number or missing prefix can black-hole traffic.
