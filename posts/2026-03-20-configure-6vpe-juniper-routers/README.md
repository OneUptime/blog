# How to Configure 6VPE on Juniper Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, 6VPE, Juniper, Junos, MPLS, BGP, VRF, L3VPN, Routing Instance

Description: Configure 6VPE (IPv6 VPN Provider Edge) on Juniper JunOS routers using routing instances, VPNv6 address family in MP-BGP, and route distinguisher/target policies for enterprise IPv6 VPN services.

---

Juniper JunOS implements 6VPE using routing instances (similar to Cisco VRFs) with the `vrf` type and IPv6 on the PE-CE side. MP-BGP uses the `inet6-vpn unicast` address family to exchange VPNv6 routes, carrying the route distinguisher in the VPNv6 NLRI and route targets as BGP extended communities. On the PE routers, 6VPE also requires `protocols mpls ipv6-tunneling` so IPv6 VPN traffic can traverse the IPv4 MPLS core.

## JunOS Routing Instance (VRF) for 6VPE

```text
# Create routing instance for Customer A IPv6 VPN

set routing-instances CUSTOMER-A instance-type vrf
set routing-instances CUSTOMER-A route-distinguisher 65000:100
set routing-instances CUSTOMER-A vrf-target target:65000:100

# Add CE-facing interface to routing instance
set routing-instances CUSTOMER-A interface ge-0/0/1.0

# Configure interface
set interfaces ge-0/0/1 unit 0 family inet6 address 2001:db8:pe1-cea::1/64

# Customer B
set routing-instances CUSTOMER-B instance-type vrf
set routing-instances CUSTOMER-B route-distinguisher 65000:200
set routing-instances CUSTOMER-B vrf-target target:65000:200
set routing-instances CUSTOMER-B interface ge-0/0/2.0
```

## JunOS MP-BGP VPNv6 Address Family

```bash
# PE1 - Enable VPNv6 (inet6-vpn) in iBGP group
set protocols bgp group PE-IBGP type internal
set protocols bgp group PE-IBGP local-address 10.0.0.1

# inet6-vpn unicast = VPNv6 address family
set protocols bgp group PE-IBGP family inet6-vpn unicast

# iBGP neighbor (PE2)
set protocols bgp group PE-IBGP neighbor 10.0.0.2

# CE-facing BGP in routing instance (per-VRF peering)
set routing-instances CUSTOMER-A protocols bgp group CE-A-BGP type external
set routing-instances CUSTOMER-A protocols bgp group CE-A-BGP peer-as 65001
set routing-instances CUSTOMER-A protocols bgp group CE-A-BGP family inet6 unicast
set routing-instances CUSTOMER-A protocols bgp group CE-A-BGP neighbor 2001:db8:pe1-cea::2
```

## Complete PE1 6VPE Configuration

```text
# PE1 Full Configuration

# MPLS backbone
set interfaces ge-0/0/0 unit 0 description "MPLS Core"
set interfaces ge-0/0/0 unit 0 family inet address 10.1.1.1/30
set interfaces ge-0/0/0 unit 0 family mpls

# OSPF + LDP for backbone
set protocols ospf area 0 interface ge-0/0/0.0
set protocols ospf area 0 interface lo0.0 passive
set protocols ldp interface ge-0/0/0.0
set protocols mpls ipv6-tunneling
set protocols mpls interface ge-0/0/0.0

# Loopback
set interfaces lo0 unit 0 family inet address 10.0.0.1/32

# Global BGP with VPNv6 AF
set protocols bgp group IBGP type internal
set protocols bgp group IBGP local-address 10.0.0.1
set protocols bgp group IBGP family inet-vpn unicast
set protocols bgp group IBGP family inet6-vpn unicast
set protocols bgp group IBGP neighbor 10.0.0.2

# Customer A VRF
set interfaces ge-0/0/1 unit 0 family inet6 address 2001:db8:pe1-cea::1/64
set routing-instances CUSTOMER-A instance-type vrf
set routing-instances CUSTOMER-A route-distinguisher 65000:100
set routing-instances CUSTOMER-A vrf-target target:65000:100
set routing-instances CUSTOMER-A interface ge-0/0/1.0
set routing-instances CUSTOMER-A protocols bgp group CE type external
set routing-instances CUSTOMER-A protocols bgp group CE peer-as 65001
set routing-instances CUSTOMER-A protocols bgp group CE family inet6 unicast
set routing-instances CUSTOMER-A protocols bgp group CE neighbor 2001:db8:pe1-cea::2

# Customer B VRF
set interfaces ge-0/0/2 unit 0 family inet6 address 2001:db8:pe1-ceb::1/64
set routing-instances CUSTOMER-B instance-type vrf
set routing-instances CUSTOMER-B route-distinguisher 65000:200
set routing-instances CUSTOMER-B vrf-target target:65000:200
set routing-instances CUSTOMER-B interface ge-0/0/2.0
set routing-instances CUSTOMER-B protocols bgp group CE type external
set routing-instances CUSTOMER-B protocols bgp group CE peer-as 65002
set routing-instances CUSTOMER-B protocols bgp group CE family inet6 unicast
set routing-instances CUSTOMER-B protocols bgp group CE neighbor 2001:db8:pe1-ceb::2
```

## JunOS 6VPE Verification

```bash
# Show VPNv6 BGP summary
show bgp summary | match "bgp.l3vpn-inet6.0|Establ"

# View VPNv6 routes in BGP
show route table bgp.l3vpn-inet6.0 extensive
# Shows: RD:prefix, label, RT attributes

# Check per-routing-instance IPv6 routes
show route table CUSTOMER-A.inet6.0
# Should show remote site IPv6 prefixes

# Verify VPN labels
show route table CUSTOMER-A.inet6.0 detail | match "Push|Nexthop|Communities"

# Check MPLS forwarding for VPN
show route forwarding-table family inet6 table CUSTOMER-A

# Test connectivity
ping 2001:db8:cust-a-site2::10 routing-instance CUSTOMER-A inet6

# Traceroute through VPN
traceroute 2001:db8:cust-a-site2::10 routing-instance CUSTOMER-A inet6

# Verify isolation (Customer A cannot reach B)
ping 2001:db8:cust-b-site1::10 routing-instance CUSTOMER-A inet6
# Should fail: No route to host
```

## Hub-and-Spoke 6VPE (Shared Services)

```text
# Hub site (data center) with shared services reachable by all VPNs
# Use one shared RT from the hub to all spokes, and one common spoke RT back to the hub

set policy-options community CUSTOMER-A-RT members target:65000:100
set policy-options community HUB-RT members target:65000:900
set policy-options community SPOKE-RT members target:65000:901

# Hub VRF: import spoke routes and export shared-services routes
set routing-instances HUB-SITE vrf-import HUB-IMPORT
set routing-instances HUB-SITE vrf-export HUB-EXPORT
set policy-options policy-statement HUB-IMPORT term import-spokes from protocol bgp
set policy-options policy-statement HUB-IMPORT term import-spokes from community SPOKE-RT
set policy-options policy-statement HUB-IMPORT term import-spokes then accept
set policy-options policy-statement HUB-EXPORT term export-shared from protocol bgp
set policy-options policy-statement HUB-EXPORT term export-shared then community add HUB-RT
set policy-options policy-statement HUB-EXPORT term export-shared then accept

# Spoke VRF: import hub shared-services routes, keep its own RT, and export local CE routes toward the hub
set routing-instances CUSTOMER-A vrf-import SPOKE-IMPORT
set routing-instances CUSTOMER-A vrf-export SPOKE-EXPORT
set policy-options policy-statement SPOKE-IMPORT term import-own from protocol bgp
set policy-options policy-statement SPOKE-IMPORT term import-own from community CUSTOMER-A-RT
set policy-options policy-statement SPOKE-IMPORT term import-own then accept
set policy-options policy-statement SPOKE-IMPORT term import-hub from protocol bgp
set policy-options policy-statement SPOKE-IMPORT term import-hub from community HUB-RT
set policy-options policy-statement SPOKE-IMPORT term import-hub then accept
set policy-options policy-statement SPOKE-EXPORT term export-customer-a from protocol bgp
set policy-options policy-statement SPOKE-EXPORT term export-customer-a then community add CUSTOMER-A-RT
set policy-options policy-statement SPOKE-EXPORT term export-customer-a then community add SPOKE-RT
set policy-options policy-statement SPOKE-EXPORT term export-customer-a then accept
```

JunOS 6VPE uses routing instances of type `vrf`, `inet6-vpn unicast` in the iBGP group for VPNv6 route exchange, separate `route-distinguisher` and `vrf-target` settings for VPN identification and route-target matching, and `protocols mpls ipv6-tunneling` to carry IPv6 VPN traffic across the IPv4 MPLS backbone.
