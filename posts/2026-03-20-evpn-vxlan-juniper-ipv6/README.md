# How to Configure EVPN VXLAN with IPv6 on Juniper

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Juniper, EVPN, VXLAN, IPv6, QFX, Data Center, BGP

Description: Configure BGP EVPN with VXLAN over an IPv6 underlay on Juniper QFX switches for scalable data center overlay networking.

## IPv6 Underlay Configuration (Junos)

```text
# Junos configuration on QFX Leaf

# Loopback for VTEP source
set interfaces lo0 unit 0 family inet6 address 2001:db8:1::1/128

# Fabric-facing interface
set interfaces xe-0/0/1 unit 0 family inet6 address 2001:db8:f:1::1/64

# OSPFv3 for IPv6 underlay reachability
set protocols ospf3 area 0.0.0.0 interface lo0.0 passive
set protocols ospf3 area 0.0.0.0 interface xe-0/0/1.0

# IPv6 underlays still require a 32-bit router ID
set routing-options router-id 192.0.2.11
```

## BGP EVPN Configuration

```text
# BGP with IPv6 underlay - sessions use IPv6 loopbacks
set protocols bgp group EVPN-OVERLAY type internal
set protocols bgp group EVPN-OVERLAY local-address 2001:db8:1::1
set protocols bgp group EVPN-OVERLAY family evpn signaling
set protocols bgp group EVPN-OVERLAY neighbor 2001:db8:0:1::1
set protocols bgp group EVPN-OVERLAY neighbor 2001:db8:0:2::1

# Autonomous system
set routing-options autonomous-system 65001
```

## VXLAN Tunnel (VTEP) Definition

```text
# On QFX, IPv6 underlays use MAC-VRF EVPN instances
set routing-instances tenant1-macvrf instance-type mac-vrf
set routing-instances tenant1-macvrf protocols evpn encapsulation vxlan
set routing-instances tenant1-macvrf protocols evpn default-gateway no-gateway-community
set routing-instances tenant1-macvrf vtep-source-interface lo0.0 inet6
set routing-instances tenant1-macvrf service-type vlan-aware
set routing-instances tenant1-macvrf route-distinguisher 65001:100
set routing-instances tenant1-macvrf vrf-target target:65001:100
set routing-instances tenant1-macvrf vrf-target auto

# Bind VNIs inside the MAC-VRF
set routing-instances tenant1-macvrf vlans vlan100 vlan-id 100
set routing-instances tenant1-macvrf vlans vlan100 vxlan vni 10100
set routing-instances tenant1-macvrf vlans vlan200 vlan-id 200
set routing-instances tenant1-macvrf vlans vlan200 vxlan vni 10200
```

## IRB for Distributed Anycast Gateway

```text
# Integrated Routing and Bridging (IRB) interface
set interfaces irb unit 100 virtual-gateway-accept-data
set interfaces irb unit 100 family inet address 10.100.0.1/24 preferred
set interfaces irb unit 100 family inet address 10.100.0.1/24 virtual-gateway-address 10.100.0.254
set interfaces irb unit 100 family inet6 address 2001:db8:100::1/64 preferred
set interfaces irb unit 100 family inet6 address 2001:db8:100::1/64 virtual-gateway-address 2001:db8:100::ffff
set interfaces irb unit 200 virtual-gateway-accept-data
set interfaces irb unit 200 family inet address 10.200.0.1/24 preferred
set interfaces irb unit 200 family inet address 10.200.0.1/24 virtual-gateway-address 10.200.0.254
set interfaces irb unit 200 family inet6 address 2001:db8:200::1/64 preferred
set interfaces irb unit 200 family inet6 address 2001:db8:200::1/64 virtual-gateway-address 2001:db8:200::ffff

# Associate VLANs and IRBs inside the MAC-VRF
set routing-instances tenant1-macvrf vlans vlan100 l3-interface irb.100
set routing-instances tenant1-macvrf vlans vlan200 l3-interface irb.200

# Tenant routing instance
set routing-instances tenant1 instance-type vrf
set routing-instances tenant1 interface irb.100
set routing-instances tenant1 interface irb.200
```

## Route-Target and RD Policy

```text
# Route distinguisher and route-target for the L3 tenant VRF
set routing-instances tenant1 route-distinguisher 65001:50100
set routing-instances tenant1 vrf-target target:65001:50100

# Advertise EVPN Type 5 prefixes for inter-subnet routing
set routing-instances tenant1 protocols evpn ip-prefix-routes advertise direct-nexthop
set routing-instances tenant1 protocols evpn ip-prefix-routes encapsulation vxlan
set routing-instances tenant1 protocols evpn ip-prefix-routes vni 50100
```

## Verification Commands

```text
# Show BGP EVPN peers
show bgp summary | match EVPN

# Show EVPN database (MAC/IP routes)
show evpn database
show evpn database extensive

# Show VXLAN tunnel information
show evpn instance
show mac-vrf forwarding vxlan-tunnel-end-point source
show mac-vrf forwarding vxlan-tunnel-end-point remote

# Show MAC table
show ethernet-switching table

# Show ARP/NDP in VRF
show arp vpn tenant1
show ipv6 neighbors vpn tenant1

# Ping over overlay
ping routing-instance tenant1 10.100.0.2
ping routing-instance tenant1 2001:db8:100::2
```

## Spine Route Reflector Configuration

```text
# Junos spine as BGP Route Reflector
set routing-options router-id 192.0.2.10
set protocols bgp group LEAF-OVERLAY type internal
set protocols bgp group LEAF-OVERLAY local-address 2001:db8:0:1::1
set protocols bgp group LEAF-OVERLAY cluster 192.0.2.10
set protocols bgp group LEAF-OVERLAY family evpn signaling
set protocols bgp group LEAF-OVERLAY neighbor 2001:db8:1::1 description Leaf-1
set protocols bgp group LEAF-OVERLAY neighbor 2001:db8:1::1 route-reflector-client
set protocols bgp group LEAF-OVERLAY neighbor 2001:db8:2::1 description Leaf-2
set protocols bgp group LEAF-OVERLAY neighbor 2001:db8:2::1 route-reflector-client
set protocols bgp group LEAF-OVERLAY neighbor 2001:db8:3::1 description Leaf-3
set protocols bgp group LEAF-OVERLAY neighbor 2001:db8:3::1 route-reflector-client
```

## Conclusion

Juniper QFX EVPN VXLAN with IPv6 underlay uses OSPFv3 for underlay reachability and BGP sessions between IPv6 loopbacks. On QFX platforms, the IPv6-underlay overlay is configured with MAC-VRF EVPN instances and an IPv6 VTEP source on the loopback interface. IRB interfaces with virtual gateway addresses implement the distributed anycast gateway for optimal L3 forwarding, while a separate tenant VRF advertises Type 5 routes for inter-subnet reachability. Route targets control tenant isolation across the fabric, and spine nodes act as BGP route reflectors so the leafs do not need a full-mesh overlay.
