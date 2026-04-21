# How to Troubleshoot 6PE and 6VPE Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, 6PE, 6VPE, MPLS, Troubleshooting, BGP, VRF, Debugging

Description: Diagnose and resolve common 6PE and 6VPE issues including BGP session failures, missing IPv6 prefixes, label forwarding problems, and VRF routing inconsistencies.

---

6PE and 6VPE troubleshooting follows a systematic approach: verify BGP session establishment, check MP-BGP IPv6 prefix advertisement with labels, confirm MPLS label forwarding entries, and validate end-to-end connectivity. Most issues fall into BGP, label allocation, or routing policy categories.

## Step 1: Verify BGP Session State

```bash
# Cisco IOS - Check BGP sessions

show bgp ipv6 unicast summary        # 6PE
show bgp vpnv6 unicast all summary   # 6VPE

# Expected output:
# Neighbor    V   AS   MsgRcvd   MsgSent   TblVer   InQ  OutQ  Up/Down  State/PfxRcd
# 10.0.0.2    4  65000   100       100       50       0     0   01:00:00     10

# If state shows: Idle, Active, Connect
# → BGP session not established

# Debug BGP session establishment
debug ip bgp events
# Check for: Open message errors, capability negotiation failures

# Common issues:
# 1. No route to BGP peer loopback
show ip route 10.0.0.2
# Fix: Check OSPF/ISIS is carrying loopback routes

# 2. IPv6 AF not activated
show bgp ipv6 unicast summary | include 10.0.0.2
# Fix: Add "neighbor 10.0.0.2 activate" under address-family ipv6
```

## Step 2: Check IPv6 Prefix Advertisement

```bash
# 6PE - Verify IPv6 prefixes with labels are in BGP table
show bgp ipv6 unicast
# Look for: * = valid, > = best, i = iBGP
# *>i 2001:db8:2::/48  ::FFFF:10.0.0.2   0    100    0   65002 i

# If prefix is missing:
show bgp ipv6 unicast neighbors 10.0.0.2 received-routes
# Check if PE2 is sending the prefix

# Check if CE is advertising to PE
show bgp ipv6 unicast neighbors 2001:db8:100::2 received-routes
# Should show CE's prefix: 2001:db8:1::/48

# 6VPE - Check VPNv6 routes
show bgp vpnv6 unicast all
show bgp vpnv6 unicast rd 65000:100

# If VPNv6 routes missing:
# Check RT (Route Target) matches between PE1 and PE2
show bgp vpnv6 unicast all detail | include "Route Target\|65000:100"
# Import RT on PE1 must match Export RT on PE2
```

## Step 3: Verify MPLS Labels

```bash
# Check that IPv6 prefixes have MPLS labels
show bgp ipv6 unicast labels
# Network               Next Hop        In label/Out label
# 2001:db8:2::/48       ::FFFF:10.0.0.2 nolabel/16

# If labels missing:
# Ensure MP-BGP is configured to advertise labels with IPv6 routes
# Cisco IOS: "neighbor 10.0.0.2 send-label" under address-family ipv6
# Junos: "family inet6 labeled-unicast" instead of only "family inet6 unicast"

# On the PE, check MPLS forwarding table has IPv6 entries
show mpls forwarding-table | include IPv6

# Juniper: Check inet6.3 table
show route table inet6.3

# Verify LDP transport labels exist
show mpls ldp bindings | include 10.0.0.2
# Should show local and remote bindings for the PE loopback
# Label values may differ or be implicit-null

# If no transport label for peer IP:
# Check LDP is running on all backbone interfaces
show mpls ldp neighbor
show mpls interfaces
```

## Step 4: Diagnose VRF Issues (6VPE)

```bash
# Check VRF has IPv6 routes
show ipv6 route vrf CUSTOMER-A
# Should show: C - connected, B - BGP, O - OSPF

# If remote site prefix missing from VRF:
# 1. Check VRF RT configuration
show vrf CUSTOMER-A detail | include "Export\|Import"
# Export RT on PE1 must be imported on PE2

# 2. Check if routes are in global BGP but not VRF
show bgp vpnv6 unicast all | include 65000:100
show bgp vpnv6 unicast rd 65000:100

# 3. Verify the route is present under the expected RD
show bgp vpnv6 unicast all | include "2001:db8:2\|RD"

# Test VRF connectivity
ping vrf CUSTOMER-A ipv6 2001:db8:2::10
! If fails: check VRF routing and label forwarding

# Traceroute in VRF
traceroute vrf CUSTOMER-A ipv6 2001:db8:2::10
```

## Step 5: Check CEF/Forwarding Plane

```bash
# Verify IPv6 CEF entry exists
show ipv6 cef 2001:db8:2::/48
# Should show: nexthop with MPLS label

# If CEF not programmed:
# Check "ipv6 cef" is globally enabled
show ipv6 cef detail | include ipv6

# Check CEF for VPN
show ipv6 cef vrf CUSTOMER-A 2001:db8:2::/48

# Test with specific source
ping ipv6 2001:db8:2::10 source 2001:db8:1::1

# Extended ping for MPLS testing
ping ipv6 2001:db8:2::10 source 2001:db8:1::1 repeat 100 size 1500
! Watch for drops at large MTU - MTU/fragmentation issue

# Check MPLS MTU
show mpls interfaces detail | include MTU
! MPLS MTU must accommodate IPv6 (1500) + label stack (4 bytes per label)
```

## Step 6: Systematic End-to-End Test

```bash
# 6PE end-to-end test procedure:

# Step 1: Test IPv6 from CE to PE
ping ipv6 2001:db8:100::1

# Step 2: Test PE to PE (MPLS backbone)
ping 10.0.0.2  # IPv4 PE-PE reachability

# Step 3: Test IPv6 PE to PE via BGP next-hop
show bgp ipv6 unicast 2001:db8:2::/48
# Verify nexthop is reachable

# Step 4: LSP ping to the IPv4 BGP next-hop (verifies transport LSP)
ping mpls ipv4 10.0.0.2/32

# Step 5: Test end-to-end IPv6
ping ipv6 2001:db8:2::1 source 2001:db8:1::1

# Step 6: Traceroute transport LSP
traceroute mpls ipv4 10.0.0.2/32 verbose
```

## Common Error Messages and Fixes

```text
Error: "IPv6 routing not enabled"
Fix: ip routing + ipv6 unicast-routing

Error: "BGP: Can't update source address for neighbor X.X.X.X"
Fix: neighbor X.X.X.X update-source Loopback0

Error: "% Nexthop ::ffff:10.0.0.2 is not reachable"
Fix: Verify MPLS LDP has label for 10.0.0.2 in forwarding table

Error: "VPNv6 unicast: 0 routes" (no VPN routes)
Fix: Check RT import/export, verify the expected RD carries the advertised prefix

Error: "LSP ping failed, return code 4"
Fix: Replying router has no mapping for the FEC
    → Check the LDP/RSVP/SR transport LSP to the BGP next-hop
```

6PE/6VPE troubleshooting typically resolves to either BGP address-family configuration errors (missing `activate` or wrong address family), Route Target mismatch preventing VPNv6 route import, or missing MPLS transport labels when LDP is not running on backbone interfaces between PE routers.
