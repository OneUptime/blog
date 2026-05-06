# How to Configure BGP Origin Validation for IPv6 on Cisco

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, RPKI, IPv6, Cisco, Routing Security

Description: Configure RPKI-based BGP origin validation for IPv6 prefixes on Cisco IOS-XE and IOS-XR routers to reject invalid route announcements.

## Overview

Supported Cisco IOS-XE and IOS-XR releases can perform BGP origin validation via RPKI. Routers connect to an RPKI cache server using the RTR protocol and use ROA data to validate incoming IPv6 BGP prefixes.

## Prerequisites

- Cisco IOS-XE or IOS-XR with RPKI origin validation support
- An RPKI validator (for example, Routinator or FORT) accessible from the router
- IPv6 BGP sessions already configured

## Step 1: Configure the RPKI Cache Server

```text
! IOS-XE: Configure RPKI cache (RTR) server
router bgp 64496
 bgp rpki server tcp 192.0.2.100 port 3323 refresh 600
 !
 ! If validator is reachable via IPv6
 bgp rpki server tcp 2001:db8:100::1 port 3323 refresh 600
```

## Step 2: Verify RPKI Cache Connection

```text
! Check RPKI cache server status
show ip bgp rpki servers

! Expected output:
! Look for an established RTR session and received ROA data
```

## Step 3: Enable BGP Origin Validation

```text
! Origin validation starts once bgp rpki server is configured
! Optionally signal validation state to iBGP neighbors
router bgp 64496
 neighbor 2001:db8:300::1 remote-as 64496
 address-family ipv6 unicast
  neighbor 2001:db8:300::1 send-community extended
  neighbor 2001:db8:300::1 announce rpki state
 exit-address-family
```

## Step 4: Configure Route Maps to Act on Validation State

```text
! Define route-maps for each validation state
route-map RPKI-POLICY permit 10
 match rpki valid
 set local-preference 200
!
route-map RPKI-POLICY permit 20
 match rpki not-found
 set local-preference 100
!
! Deny INVALID routes (omit or add deny statement)
route-map RPKI-POLICY deny 30
 match rpki invalid
!
route-map RPKI-POLICY permit 40

! Apply to BGP neighbor
router bgp 64496
 neighbor 2001:db8:200::1 remote-as 65001
 address-family ipv6 unicast
  neighbor 2001:db8:200::1 route-map RPKI-POLICY in
 exit-address-family
```

## Step 5: Verify Origin Validation Status

```text
! Show BGP IPv6 table with OV (Origin Validation) status
show bgp ipv6 unicast

! Look for RPKI validation codes: 'V' (Valid), 'I' (Invalid), 'N' (Not found)

! Check a specific prefix
show bgp ipv6 unicast 2001:db8::/32

! Show IPv6 ROAs learned from the cache
show ip bgp ipv6 unicast rpki table
```

## Step 6: IOS-XR Configuration

On Cisco IOS-XR, the configuration syntax differs:

```text
! IOS-XR RPKI configuration
router bgp 64496
 rpki server 2001:db8:100::1
  transport tcp port 3323
  refresh-time 600
 !

 address-family ipv6 unicast
  bgp origin-as validation enable
 !

 ! Apply validation in routing policy
 route-policy RPKI-VALIDATION
   if validation-state is valid then
     set local-preference 200
   elseif validation-state is not-found then
     set local-preference 100
   else
     drop
   endif
 end-policy

 neighbor 2001:db8:200::1
  remote-as 65001
  address-family ipv6 unicast
   route-policy RPKI-VALIDATION in
  !
```

## Monitoring

Use [OneUptime](https://oneuptime.com) to monitor your Cisco routers' BGP sessions and RPKI validator connectivity. Set up SNMP or API-based monitors to alert on RPKI cache disconnections.

## Conclusion

BGP origin validation on Cisco involves connecting to an RPKI cache server, validating IPv6 routes against ROA data, and applying route-maps or route-policies to act on VALID/INVALID/NOT-FOUND states. Start with preferring valid routes before dropping invalid ones to minimize disruption.
