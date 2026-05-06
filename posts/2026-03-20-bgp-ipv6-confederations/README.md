# How to Configure BGP IPv6 with Confederations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, IPv6, Confederations, IBGP, Routing

Description: Learn how to configure BGP IPv6 confederations as an alternative to route reflectors for scaling iBGP within large autonomous systems.

## Overview

BGP confederations divide a large AS into multiple sub-ASes. Within each sub-AS, a full iBGP mesh (or route reflectors) is used. Between sub-ASes, a special form of eBGP called eBGP-confederation is used. Externally, the confederation appears as a single AS.

## Confederation Architecture

```mermaid
graph TD
    ExtPeer[External Peer - AS 12345] <-->|eBGP - sees AS 65001| ConfBorder[Confederation Border Router]
    ConfBorder --> SubAS1[Sub-AS 65010]
    ConfBorder --> SubAS2[65020]
    SubAS1 --- R1[Router 1]
    SubAS1 --- R2[Router 2]
    SubAS2 --- R3[Router 3]
    SubAS2 --- R4[Router 4]
    SubAS1 <-->|eBGP-Confederation| SubAS2
```

External peers see confederation AS 65001. Internal sub-ASes are 65010 and 65020.

## Configuring Confederations on FRRouting

```bash
vtysh
configure terminal

! Sub-AS 65010 configuration
router bgp 65010
 no bgp default ipv4-unicast

 ! Declare the confederation identifier (visible to external peers)
 bgp confederation identifier 65001

 ! Declare the other sub-ASes in the confederation
 bgp confederation peers 65020

 bgp router-id 1.1.1.1

 ! iBGP within Sub-AS 65010 (full mesh or RR)
 neighbor 2001:db8:10::2 remote-as 65010
 neighbor 2001:db8:10::2 update-source lo

 ! eBGP-confederation to Sub-AS 65020
 neighbor 2001:db8:12::2 remote-as 65020

 ! External eBGP to AS 12345
 neighbor 2001:db8:ff::1 remote-as 12345

 address-family ipv6 unicast
  neighbor 2001:db8:10::2 activate
  neighbor 2001:db8:12::2 activate
  neighbor 2001:db8:ff::1 activate
  network 2001:db8:100::/48
 exit-address-family

end
write memory
```

## Configuring the Second Sub-AS

```bash
vtysh
configure terminal

! Sub-AS 65020 configuration
router bgp 65020
 no bgp default ipv4-unicast

 bgp confederation identifier 65001
 bgp confederation peers 65010

 bgp router-id 2.2.2.2

 ! iBGP within Sub-AS 65020
 neighbor 2001:db8:20::2 remote-as 65020
 neighbor 2001:db8:20::2 update-source lo

 ! eBGP-confederation to Sub-AS 65010
 neighbor 2001:db8:12::1 remote-as 65010

 address-family ipv6 unicast
  neighbor 2001:db8:20::2 activate
  neighbor 2001:db8:12::1 activate
 exit-address-family

end
write memory
```

## Cisco Confederation Configuration

```text
Router(config)# router bgp 65010
Router(config-router)# no bgp default ipv4-unicast
Router(config-router)# bgp confederation identifier 65001
Router(config-router)# bgp confederation peers 65020
Router(config-router)# bgp router-id 1.1.1.1

Router(config-router)# neighbor 2001:DB8:12::2 remote-as 65020    ! Confederation peer

Router(config-router)# address-family ipv6 unicast
Router(config-router-af)# neighbor 2001:DB8:12::2 activate
```

## AS_CONFED_SEQUENCE and AS_CONFED_SET

Confederation routers use two special AS-path segment types:
- **AS_CONFED_SEQUENCE** - internal confederation hops (shown in parentheses)
- **AS_CONFED_SET** - like AS_SET but for confederation

External peers see the confederation identifier without the internal sub-AS details.

## Verifying Confederation Configuration

```bash
# Show BGP IPv6 routes and AS paths

vtysh -c "show bgp ipv6 unicast"
# Routes learned across confederation member-ASes can show AS path segments such as (65020)

# Verify peer state for the IPv6 AFI/SAFI
vtysh -c "show bgp ipv6 unicast summary wide"
# Should show the local AS and established peer state for the IPv6 address family

# Check that external routes don't show sub-AS numbers
vtysh -c "show bgp ipv6 unicast neighbors 2001:db8:ff::1 advertised-routes"
# AS path should show only 65001, not the internal member-AS numbers
```

## Confederations vs Route Reflectors

| Feature | Confederations | Route Reflectors |
|---------|---------------|-----------------|
| Complexity | Higher | Lower |
| Loop prevention | AS_CONFED attributes | ORIGINATOR_ID, CLUSTER_LIST |
| Next-hop behavior | Usually unchanged between member-ASes; policy may still be needed | May need next-hop-self |
| Deployment | Large enterprise/ISP | Most environments |

## Summary

BGP IPv6 confederations divide a large AS into sub-ASes for iBGP scaling. Each router's local AS is a sub-AS; `bgp confederation identifier` sets the visible AS. `bgp confederation peers` lists the other member-ASes in the confederation. Sessions between member-ASes use those internal AS numbers, while external peers see only the confederation identifier. Verify that external advertisements show only the confederation identifier, not sub-AS numbers.
