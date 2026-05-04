# How to Configure SRv6 on Juniper Junos - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SRv6, Juniper, Junos, Segment Routing, Configuration, Networking

Description: Configure Segment Routing over IPv6 on Juniper Junos routers by enabling SRv6, defining locators and SIDs, configuring IS-IS advertisement, and verifying forwarding.

## Introduction

Juniper Junos supports SRv6 from Junos 20.3R1 onward, with BGP-based Layer 3 services over SRv6 added in 20.4R1. Configuration uses the hierarchical `set` command syntax and integrates with IS-IS for locator advertisement and BGP for SID distribution.

## Step 1: Enable SRv6 and Define a Locator

```text
# Enable SRv6 globally and define the locator
# The block/node/function structure is implicit in the prefix length:
# the locator prefix occupies the high-order bits and the function
# occupies the remainder of the 128-bit SID.

set routing-options source-packet-routing srv6 locator LOC1 5f00:1:1::/48

# Set source address for encapsulated packets
set routing-options source-packet-routing srv6 source-address 5f00:1:1::1
```

## Step 2: Enable SRv6 in IS-IS

```text
# Advertise the SRv6 locator via IS-IS
set protocols isis interface ge-0/0/0.0 family inet6
set protocols isis interface lo0.0 family inet6
set protocols isis source-packet-routing srv6 locator LOC1 end-sid 5f00:1:1::1 flavor psp

# Configure IS-IS for SRv6 at the level
set protocols isis level 2 wide-metrics-only
set protocols isis source-packet-routing srv6
```

## Step 3: Configure SIDs for L3VPN Services

```text
# Create a VRF for customer traffic
set routing-instances CUSTOMER_A instance-type vrf
set routing-instances CUSTOMER_A interface ge-0/0/1.0
set routing-instances CUSTOMER_A route-distinguisher 65000:100
set routing-instances CUSTOMER_A vrf-target target:65000:100

# Enable SRv6 service advertisement on the BGP group toward the route reflector / peers
set protocols bgp group IBGP family inet-vpn unicast extended-nexthop
set protocols bgp group IBGP family inet-vpn unicast advertise-srv6-service
set protocols bgp group IBGP family inet-vpn unicast accept-srv6-service

# Enable SRv6 SID allocation for this VRF (End.DT4 for IPv4 customer routes)
set routing-instances CUSTOMER_A protocols bgp source-packet-routing srv6 locator LOC1 end-dt4-sid 5f00:1:1:0:e004::

# View auto-allocated SID for the VRF
# show bgp summary instance CUSTOMER_A
```

## Step 4: Configure SRv6 Traffic Engineering

```text
# Create a static SRv6 segment list
set routing-options source-packet-routing srv6 segment-list EXPLICT-PATH-1 \
  segment index 10 srv6-sid 5f00:1:2:0:e001::
set routing-options source-packet-routing srv6 segment-list EXPLICT-PATH-1 \
  segment index 20 srv6-sid 5f00:2:1:0:e001::

# Create an SRv6 TE policy
set routing-options source-packet-routing srv6 \
  policy POLICY-TO-R2 \
  endpoint 5f00:2:1::1 \
  color 100 \
  candidate-path preference 100 \
  segment-list EXPLICT-PATH-1
```

## Step 5: Verify SRv6 Configuration

```text
# Show SRv6 locators
show segment-routing srv6 locator detail

# Expected output:
# Locator: LOC1
# Prefix: 5f00:1:1::/48
# Active SIDs: 3
# Status: Active

# Show all SRv6 SIDs
show segment-routing srv6 sid detail

# Show IS-IS SRv6 advertisement
show isis database detail | grep "SRv6\|srv6"

# Verify forwarding
show route 5f00:2:1::/48 detail
ping inet6 5f00:2:1::1 routing-instance CORE count 5
traceroute inet6 5f00:2:1::1 routing-instance CORE
```

## Step 6: SRv6 Statistics and Monitoring

```text
# Show SRv6 packet statistics
show segment-routing srv6 statistics

# Show TE policy status
show segment-routing traffic-engineering policy detail

# Monitor SID usage
show segment-routing srv6 sid summary
```

## Junos SRv6 Operational Commands

```text
show segment-routing srv6 locator           - All configured locators
show segment-routing srv6 sid               - All SIDs and their functions
show segment-routing srv6 statistics        - Encap/decap packet counts
show route protocol segment-routing inet6   - SRv6 routes in RIB
show bgp summary                            - BGP sessions with SRv6 SID exchange
```

## Conclusion

Juniper Junos SRv6 configuration follows the hierarchical `routing-options source-packet-routing` hierarchy. IS-IS distributes locator prefixes, and BGP distributes VPN SIDs. Operational `show segment-routing` commands provide complete visibility. Monitor locator reachability from external probes using OneUptime.
