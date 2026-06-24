# How to Configure 6PE on Juniper Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, 6PE, Juniper, Junos, MPLS, BGP, LDP

Description: Configure 6PE (IPv6 Provider Edge) on Juniper routers running JunOS, including MPLS LDP configuration, MP-BGP inet6 address family, and verification commands.

---

Juniper Junos OS supports 6PE by combining `protocols mpls ipv6-tunneling` with MP-BGP `family inet6 labeled-unicast`. PE routers advertise IPv6 prefixes as labeled routes via MP-BGP, allowing IPv6 transit across an IPv4-signaled MPLS backbone.

## Junos OS MPLS and LDP Configuration

```text
# PE1 Junos OS - Configure MPLS and LDP on backbone interfaces

set protocols mpls ipv6-tunneling

set protocols mpls interface ge-0/0/0.0
set protocols ldp interface ge-0/0/0.0

# Configure OSPF for IPv4 backbone routing
set protocols ospf area 0.0.0.0 interface ge-0/0/0.0
set protocols ospf area 0.0.0.0 interface lo0.0 passive

# Enable MPLS and IPv6 processing on the backbone interface
set interfaces ge-0/0/0 unit 0 family inet6
set interfaces ge-0/0/0 unit 0 family mpls

# Verify MPLS and LDP are configured
show mpls interface
show ldp session
```

## Junos OS BGP IPv6 for 6PE

```text
# PE1 - Configure BGP group for PE-PE 6PE sessions
set protocols bgp group PE-iBGP type internal
set protocols bgp group PE-iBGP local-address 10.0.0.1
set protocols bgp group PE-iBGP family inet6 labeled-unicast explicit-null
set protocols bgp group PE-iBGP export NEXT-HOP-SELF
set protocols bgp group PE-iBGP export SEND-6PE
set protocols bgp group PE-iBGP neighbor 10.0.0.2

# For 6PE, use inet6 labeled-unicast on the PE-PE session
# This causes BGP to advertise IPv6 prefixes with MPLS labels

# CE-PE peering (eBGP, IPv6)
set protocols bgp group CE-IPv6 type external
set protocols bgp group CE-IPv6 family inet6 unicast
set protocols bgp group CE-IPv6 peer-as 65001
set protocols bgp group CE-IPv6 export SEND-BGP6
set protocols bgp group CE-IPv6 neighbor 2001:db8:pe1-ce1::2

# Configure local PE IPv6 address for CE peering
set interfaces ge-0/0/1 unit 0 family inet6 address 2001:db8:pe1-ce1::1/64

# Export policies for moving IPv6 routes between inet6 unicast and inet6 labeled-unicast
set policy-options policy-statement NEXT-HOP-SELF then next-hop self
set policy-options policy-statement SEND-6PE term 1 from family inet6
set policy-options policy-statement SEND-6PE term 1 from protocol bgp
set policy-options policy-statement SEND-6PE term 1 from protocol direct
set policy-options policy-statement SEND-6PE term 1 then accept
set policy-options policy-statement SEND-BGP6 term 1 from family inet6
set policy-options policy-statement SEND-BGP6 term 1 from protocol bgp
set policy-options policy-statement SEND-BGP6 term 1 then accept
```

## Junos OS PE Router Full Configuration

```text
# Equivalent set commands for PE1

# Routing options
set routing-options router-id 10.0.0.1
set routing-options autonomous-system 65000

# Interfaces
set interfaces lo0 unit 0 family inet address 10.0.0.1/32
set interfaces lo0 unit 0 family inet6 address 2001:db8:pe1::1/128

set interfaces ge-0/0/0 unit 0 description "To MPLS Core"
set interfaces ge-0/0/0 unit 0 family inet address 10.1.1.1/30
set interfaces ge-0/0/0 unit 0 family inet6
set interfaces ge-0/0/0 unit 0 family mpls

set interfaces ge-0/0/1 unit 0 description "To CE1 IPv6"
set interfaces ge-0/0/1 unit 0 family inet6 address 2001:db8:pe1-ce1::1/64

# MPLS
set protocols mpls ipv6-tunneling
set protocols mpls interface ge-0/0/0.0

# LDP
set protocols ldp interface ge-0/0/0.0

# OSPF (backbone IGP)
set protocols ospf area 0.0.0.0 interface ge-0/0/0.0
set protocols ospf area 0.0.0.0 interface lo0.0 passive

# BGP
set protocols bgp group IBGP type internal
set protocols bgp group IBGP local-address 10.0.0.1
set protocols bgp group IBGP family inet6 labeled-unicast explicit-null
set protocols bgp group IBGP export NEXT-HOP-SELF
set protocols bgp group IBGP export SEND-6PE
set protocols bgp group IBGP neighbor 10.0.0.2

set protocols bgp group CE-PEERING type external
set protocols bgp group CE-PEERING peer-as 65001
set protocols bgp group CE-PEERING family inet6 unicast
set protocols bgp group CE-PEERING export SEND-BGP6
set protocols bgp group CE-PEERING neighbor 2001:db8:pe1-ce1::2

# Policies
set policy-options policy-statement NEXT-HOP-SELF then next-hop self
set policy-options policy-statement SEND-6PE term 1 from family inet6
set policy-options policy-statement SEND-6PE term 1 from protocol bgp
set policy-options policy-statement SEND-6PE term 1 from protocol direct
set policy-options policy-statement SEND-6PE term 1 then accept
set policy-options policy-statement SEND-BGP6 term 1 from family inet6
set policy-options policy-statement SEND-BGP6 term 1 from protocol bgp
set policy-options policy-statement SEND-BGP6 term 1 then accept
```

## CE Router Junos OS Configuration

```bash
# Customer Edge Router
set routing-options router-id 10.0.0.11
set routing-options autonomous-system 65001

set interfaces ge-0/0/0 unit 0 family inet6 address 2001:db8:pe1-ce1::2/64

# Add customer prefix route for BGP advertisement
set routing-options rib inet6.0 static route 2001:db8:site1::/48 discard

# BGP to PE
set protocols bgp group PE-PEERING type external
set protocols bgp group PE-PEERING peer-as 65000
set protocols bgp group PE-PEERING family inet6 unicast
set protocols bgp group PE-PEERING neighbor 2001:db8:pe1-ce1::1 local-address 2001:db8:pe1-ce1::2
set protocols bgp group PE-PEERING export EXPORT-SITE1

# Export policy: advertise customer prefix
set policy-options policy-statement EXPORT-SITE1 term 1 from protocol static
set policy-options policy-statement EXPORT-SITE1 term 1 from route-filter 2001:db8:site1::/48 exact
set policy-options policy-statement EXPORT-SITE1 term 1 then accept
set policy-options policy-statement EXPORT-SITE1 term default then reject
```

## Junos OS 6PE Verification

```bash
# Check BGP sessions
show bgp summary
# Should show: PE2 iBGP established, CE1 eBGP established

# View IPv6 BGP table with labels
show route 2001:db8:site2::/48 detail
# Look for: a BGP-learned IPv6 route with a resolved MPLS next hop

# Alternatively:
show route receive-protocol bgp 10.0.0.2 table inet6.0 detail
# Shows IPv6 routes received from PE2

# Check MPLS labeled routes
show route table inet6.3
# Junos OS uses inet6.3 for labeled IPv6 routes created by ipv6-tunneling

# Verify forwarding
show route forwarding-table family inet6 destination 2001:db8:site2::10

# Check MPLS forwarding
show route table mpls.0
show ldp path

# Test end-to-end
ping inet6 2001:db8:site2::10 source 2001:db8:site1::1
traceroute inet6 2001:db8:site2::10 source 2001:db8:site1::1
# Transit P routers appear in 6PE traceroute only if allow-v4mapped-packets
# and allow-6pe-traceroute are enabled under [edit system]
```

## Policy for 6PE Next-Hop

```bash
# Junos OS - next-hop self policy for the PE-PE 6PE session
# Junos automatically encodes the 6PE BGP next hop as IPv4-mapped IPv6

set policy-options policy-statement NEXT-HOP-SELF then next-hop self

set protocols bgp group IBGP export NEXT-HOP-SELF
set protocols bgp group IBGP export SEND-6PE

# Verify the advertised next hop and label
show route advertising-protocol bgp 10.0.0.2 table inet6.0 detail
# Look for: an advertised label and an IPv4-mapped IPv6 next hop
```

Juniper Junos OS 6PE requires `protocols mpls ipv6-tunneling` plus `family inet6 labeled-unicast` on the PE-PE BGP session. In practice, PE routers also need export policy to advertise IPv6 routes between `inet6 unicast` and `inet6 labeled-unicast`, core-facing interfaces must carry both `family inet6` and `family mpls`, and labeled IPv6 routes appear in the `inet6.3` table for forwarding resolution across the IPv4 MPLS backbone.
