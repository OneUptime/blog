# How to Configure BGP for IPv4 on MikroTik

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MikroTik, RouterOS, BGP, IPv4, Routing, ISP, AS Number

Description: Configure BGP on MikroTik RouterOS for IPv4 peering with an upstream ISP or iBGP between internal routers, including prefix advertisement and route filtering.

## Introduction

BGP (Border Gateway Protocol) is the routing protocol of the internet. MikroTik supports BGP for connecting to ISPs, exchanging routes between AS boundaries, and for route reflector configurations in larger networks.

## Basic eBGP Configuration (RouterOS v7)

```mikrotik
# Create BGP instance (your ASN)

/routing bgp template add \
  name=default \
  as=65001 \
  router-id=203.0.113.1

# Add eBGP peer (upstream ISP)
/routing bgp connection add \
  name=ISP-PEER \
  connect=yes \
  listen=yes \
  remote.address=203.0.113.2 \
  remote.as=65000 \
  local.role=ebgp \
  template=default \
  comment="ISP upstream peer"
```

## RouterOS v6 BGP Syntax

```mikrotik
# v6 syntax
/routing bgp instance set default \
  as=65001 \
  router-id=10.0.0.1

/routing bgp peer add \
  name=ISP-PEER \
  address=203.0.113.2 \
  remote-as=65000 \
  ttl=1 \
  comment="ISP upstream"
```

## Advertise Specific Prefixes

```mikrotik
# RouterOS v6 - add network to advertise via BGP
/routing bgp network add \
  network=203.0.113.0/24 \
  comment="Advertise our prefix"

# RouterOS v7 - use address-list and reference it from the connection
/ip firewall address-list add list=BGP-PREFIXES address=203.0.113.0/24
/routing bgp connection set ISP-PEER output.network=BGP-PREFIXES
```

## iBGP Between Internal Routers

```mikrotik
# iBGP peer (same ASN)
/routing bgp connection add \
  name=IBGP-PEER \
  remote.address=10.255.0.2 \
  remote.as=65001 \
  local.role=ibgp \
  template=default
```

## Route Filtering with Prefix Lists

```mikrotik
# Create prefix filter to accept only specific routes
/routing filter rule add \
  chain=BGP-IN \
  rule="if (dst in 10.0.0.0/8) { accept } else { reject }"

/routing bgp connection set ISP-PEER \
  input.filter=BGP-IN
```

## Verify BGP

```mikrotik
# Show BGP peers and state
/routing bgp peer print  (v6)
/routing bgp connection print  (v7)

# Show outbound routes advertised to peers
/routing bgp advertisements print

# Show BGP routes in routing table (received and installed)
/ip route print where bgp

# Show BGP session state (v7)
/routing bgp session print

# Show detailed BGP session info (v7)
/routing bgp session print detail
```

## Conclusion

MikroTik BGP configuration defines your AS number, adds peer connections with the remote AS and IP, and specifies which prefixes to advertise. Use prefix filters to control what you accept from peers, and configure route-reflector role for iBGP in larger networks. Always verify session state with `/routing bgp connection print` (v7) or `/routing bgp peer print` (v6).
