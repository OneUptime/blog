# How to Configure SRv6 with BGP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SRv6, BGP, IPv6, Segment Routing, EVPN, L3VPN

Description: Configure BGP to distribute SRv6 SIDs and locators for L3VPN, EVPN, and traffic engineering, including FRR configuration examples.

## Introduction

BGP is the control plane for distributing SRv6 SIDs across domains. BGP Prefix-SID attributes (RFC 9252) carry SRv6 information in EVPN, L3VPN, and global routing tables. FRRouting (FRR) provides a full-featured open-source implementation.

## FRR BGP with SRv6 Locator

```text
# /etc/frr/frr.conf - Leaf node with SRv6

frr defaults traditional
hostname leaf1

! SRv6 locator
segment-routing
  srv6
    locators
      locator MAIN
        prefix 5f00:1::/48
      !
    !
  !
!

! BGP configuration
router bgp 65001
  bgp router-id 1.1.1.1
  no bgp ebgp-requires-policy

  ! iBGP to spine (route reflector)
  neighbor 5f00:spine:: remote-as 65001
  neighbor 5f00:spine:: update-source lo
  neighbor 5f00:spine:: capability extended-nexthop

  ! Global IPv6 unicast - advertise locator
  address-family ipv6 unicast
    network 5f00:1::/48
    neighbor 5f00:spine:: activate
    neighbor 5f00:spine:: next-hop-self
  !

  ! EVPN for tenant routing
  address-family l2vpn evpn
    neighbor 5f00:spine:: activate
    advertise-all-vni
  !
!
```

## BGP SRv6 L3VPN (VPNv6 with SRv6 SIDs)

```bash
! Leaf 1 VRF configuration
router bgp 65001
  address-family ipv6 vpn
    neighbor 5f00:spine:: activate
  !
  !
  vrf RED
    sid vpn per-vrf export locator MAIN
    address-family ipv6 unicast
      rd 65001:100
      rt both 65001:100
      redistribute connected
      export vpn
      import vpn
    !
  !
!
```

## BGP Prefix-SID Attribute (RFC 9252)

```python
# BGP UPDATE with SRv6 SID attribute

# The SRv6 L3 Service TLV carries the SID in NLRI

# Example UPDATE structure (conceptual):
bgp_update = {
    "prefix": "fd00:red::/48",
    "path_attributes": {
        "MP_REACH_NLRI": {
            "afi": 2,      # IPv6
            "safi": 128,   # VPN
            "next_hop": "::ffff:0:0",  # Using SRv6 - no traditional next-hop
        },
        "PREFIX_SID": {
            "srv6_l3_service_tlv": {
                "sub_tlv_information": {
                    "endpoint_behavior": 0x0012,  # End.DT6
                    "sid": "5f00:1:0:e100::",     # VRF Red SID on Leaf1
                }
            }
        }
    }
}
```

## Verifying BGP SRv6 Routes

```bash
# FRR vtysh commands
vtysh -c "show bgp ipv6 unicast 5f00:2::/48 detail"
# Shows: SRv6 locator, SID type, endpoint behavior

vtysh -c "show bgp l2vpn evpn route type prefix detail"
# Shows EVPN Type-5 routes with SRv6 SID

vtysh -c "show bgp vrf RED ipv6 unicast detail"
# Shows VRF routes with SRv6 SID in PREFIX_SID attribute

# Check installed forwarding entries
ip -6 route show | grep "encap seg6"
# Should see routes with SRv6 encapsulation installed from BGP
```

## BGP Route Reflector for SRv6

```text
! Spine as BGP route reflector
router bgp 65001
  bgp router-id 100.100.100.100
  no bgp ebgp-requires-policy

  neighbor LEAF-GROUP peer-group
  neighbor LEAF-GROUP remote-as 65001
  neighbor LEAF-GROUP route-reflector-client
  neighbor LEAF-GROUP update-source lo

  neighbor 5f00:1:: peer-group LEAF-GROUP
  neighbor 5f00:2:: peer-group LEAF-GROUP
  neighbor 5f00:3:: peer-group LEAF-GROUP

  address-family ipv6 unicast
    neighbor LEAF-GROUP activate
    neighbor LEAF-GROUP route-reflector-client
  !
  address-family l2vpn evpn
    neighbor LEAF-GROUP activate
    neighbor LEAF-GROUP route-reflector-client
  !
!
```

## Conclusion

BGP is essential for distributing SRv6 SIDs in production networks. The PREFIX_SID attribute carries SRv6 service information, while VPNv6 and EVPN carry per-VRF SIDs. FRR provides a full open-source SRv6+BGP stack suitable for both lab and production deployments. Monitor BGP session health and SID advertisement with OneUptime.
