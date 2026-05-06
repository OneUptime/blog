# How to Configure BGP IPv6 Prefix Lists

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, IPv6, Prefix Lists, Filtering, Networking

Description: Learn how to create and apply IPv6 prefix lists in BGP to control which prefixes are accepted from peers and advertised to neighbors.

## Overview

IPv6 prefix lists are ordered permit/deny rules that match prefixes based on their address and prefix length. They are the simplest and most efficient way to filter BGP routes and are preferred over access lists for routing policy.

## Prefix List Syntax

```text
ipv6 prefix-list <name> seq <number> [permit|deny] <prefix>/<length> [ge <min-len>] [le <max-len>]

# ge = greater than or equal (minimum prefix length)

# le = less than or equal (maximum prefix length)
```

## Creating IPv6 Prefix Lists

```bash
# FRRouting

# Exact match: permit only /48
ipv6 prefix-list MY_NETS seq 10 permit 2001:db8:1::/48

# Match the prefix and any more specific up to /64
ipv6 prefix-list PEER_ROUTES seq 10 permit 2001:db8:100::/48 le 64

# Match any prefix from /48 to /64 within this block
ipv6 prefix-list AGGREGATE seq 10 permit 2001:db8::/32 ge 48 le 64

# Deny the default route explicitly
ipv6 prefix-list NO_DEFAULT seq 5 deny ::/0

# Deny any route more specific than /48
ipv6 prefix-list MAX_SPECIFICITY seq 5 deny ::/0 ge 49
ipv6 prefix-list MAX_SPECIFICITY seq 10 permit ::/0 le 48

# Permit everything (used as a catchall)
ipv6 prefix-list ALLOW_ALL seq 99 permit ::/0 le 128
```

## Applying Prefix Lists to BGP Neighbors

```bash
vtysh
configure terminal

router bgp 65001
 address-family ipv6 unicast
  neighbor 2001:db8:100::2 activate

  ! Apply inbound filter (what we accept from the peer)
  neighbor 2001:db8:100::2 prefix-list PEER_ROUTES in

  ! Apply outbound filter (what we send to the peer)
  neighbor 2001:db8:100::2 prefix-list MY_NETS out

 exit-address-family

end
write memory
```

## Cisco IPv6 Prefix Lists

```text
! Cisco IOS - Same syntax, same logic
Router(config)# ipv6 prefix-list PEER_ROUTES seq 10 permit 2001:db8:100::/48 le 64
Router(config)# ipv6 prefix-list PEER_ROUTES seq 99 deny ::/0 le 128

Router(config)# router bgp 65001
Router(config-router)# address-family ipv6 unicast
Router(config-router-af)# neighbor 2001:db8:100::2 activate
Router(config-router-af)# neighbor 2001:db8:100::2 prefix-list PEER_ROUTES in
```

## Testing Prefix Lists

```bash
# FRRouting: show all prefix lists
vtysh -c "show ip prefix-list"

# Show detail with hit counts
vtysh -c "show ip prefix-list detail"

# Test a specific prefix against a list
vtysh -c "debug prefix-list PEER_ROUTES match 2001:db8:100:1::/64"
# Returns success only when the prefix-list permits the tested prefix.
```

## Bogon Prefix List (Security Best Practice)

Create a prefix list to reject invalid IPv6 prefixes and, if needed, the default route from eBGP peers:

```bash
! Deny the default route plus well-known invalid/unroutable IPv6 prefixes
ipv6 prefix-list BOGONS seq 10  deny ::/0
ipv6 prefix-list BOGONS seq 20  deny ::/128             ! Unspecified
ipv6 prefix-list BOGONS seq 30  deny ::1/128            ! Loopback
ipv6 prefix-list BOGONS seq 40  deny fc00::/7 le 128    ! ULA (RFC 4193)
ipv6 prefix-list BOGONS seq 50  deny fe80::/10 le 128   ! Link-local
ipv6 prefix-list BOGONS seq 60  deny ff00::/8 le 128    ! Multicast
ipv6 prefix-list BOGONS seq 70  deny 2001:db8::/32 le 128  ! Documentation (RFC 3849)
ipv6 prefix-list BOGONS seq 80  deny 100::/64 le 128    ! Discard (RFC 6666)
ipv6 prefix-list BOGONS seq 99  permit ::/0 le 128      ! Allow everything else
```

## Refreshing BGP After Prefix List Changes

```bash
# Apply inbound policy change without resetting the session
clear bgp ipv6 unicast 2001:db8:100::2 soft in

# Apply outbound policy change
clear bgp ipv6 unicast 2001:db8:100::2 soft out
```

## Summary

IPv6 BGP prefix lists provide ordered permit/deny matching on prefix address and length. Use `le` and `ge` to match ranges of prefix lengths. Prefix lists end with an implicit deny, so add an explicit catchall permit when you want to allow everything else. Apply to BGP neighbors with `neighbor <peer> prefix-list <name> in|out` and refresh policy with `clear bgp ipv6 unicast <peer> soft in|out`.
