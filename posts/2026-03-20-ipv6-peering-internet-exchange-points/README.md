# How to Configure IPv6 Peering at Internet Exchange Points - Points

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IXP, BGP, Peering, Internet Exchange, Routing

Description: Configure IPv6 BGP peering at Internet Exchange Points (IXPs), including route server sessions, filtering, and community tagging.

## What is an IXP?

An Internet Exchange Point (IXP) is a physical infrastructure where ISPs and networks exchange internet traffic. At an IXP, networks peer with each other via BGP over a shared Layer 2 fabric.

Major IXPs with IPv6 support include DE-CIX, AMS-IX, LINX, Equinix, and BCIX.

## IXP IPv6 Address Assignment

IXPs assign IPv6 addresses from their own peering LAN prefix. Example:

```text
Example IXP Peering LAN: 2001:db8:100::/64

Your router port: 2001:db8:100::1234/64
IXP Route Server: 2001:db8:100::1 (RS1), 2001:db8:100::2 (RS2)
```

## BGP Configuration for IXP Peering

Configure your border router with IPv6 BGP sessions to peering partners and the route server:

```text
# Cisco IOS-XE - IPv6 BGP peering at an IXP

router bgp 64496

 ! Required for route-server sessions that preserve the original AS_PATH
 no bgp enforce-first-as

 ! Session to IXP Route Server 1
 neighbor 2001:db8:100::1 remote-as 64497
 neighbor 2001:db8:100::1 description IXP Route Server 1

 ! Session to a direct peer
 neighbor 2001:db8:100::5678 remote-as 64498
 neighbor 2001:db8:100::5678 description Example Direct Peer

 address-family ipv6 unicast
  ! Activate route server session
  neighbor 2001:db8:100::1 activate
  neighbor 2001:db8:100::1 soft-reconfiguration inbound

  ! Activate direct peer
  neighbor 2001:db8:100::5678 activate

  ! Advertise your prefixes
  network 2001:db8::/32
 exit-address-family
```

## Route Filtering at IXP

Always filter routes at IXP connections. At minimum, reject default routes and obviously invalid space:

```text
# IPv6 prefix-list to accept only valid prefixes from peers
ipv6 prefix-list PEER-IN-FILTER seq 5  deny ::/0                    le 7   ! Block too-short prefixes
ipv6 prefix-list PEER-IN-FILTER seq 10 deny ::/0                    ge 49  ! Block too-long prefixes
ipv6 prefix-list PEER-IN-FILTER seq 20 deny fc00::/7                le 128 ! Block ULA
ipv6 prefix-list PEER-IN-FILTER seq 30 deny 2001:db8::/32           le 128 ! Block documentation
ipv6 prefix-list PEER-IN-FILTER seq 100 permit ::/0                 le 48  ! Allow /8 through /48

# Apply to peer
router bgp 64496
 address-family ipv6 unicast
  neighbor 2001:db8:100::5678 prefix-list PEER-IN-FILTER in
```

## BGP Community Tagging

Tag routes received from the route server with a local community for traffic engineering:

```text
# Tag all routes received from the IXP route server with community 64496:200
route-map IXP-IN permit 10
 set community 64496:200 additive

router bgp 64496
 address-family ipv6 unicast
  neighbor 2001:db8:100::1 route-map IXP-IN in
```

## RPKI Validation at IXP

Enable RPKI route origin validation to reject routes with an invalid origin-validation state at the IXP:

```text
! Configure RPKI validator connection
router bgp 64496
 bgp rpki server tcp 2001:db8:200::10 port 3323 refresh 600

! Create route-map to reject INVALID routes
route-map RPKI-CHECK deny 10
 match rpki invalid
route-map RPKI-CHECK permit 20

! Apply to IXP session
router bgp 64496
 address-family ipv6 unicast
  neighbor 2001:db8:100::1 route-map RPKI-CHECK in
```

## Verifying Peering Sessions

```text
# Check BGP session status
show bgp ipv6 unicast summary

# View routes received from route server
show bgp ipv6 unicast neighbors 2001:db8:100::1 received-routes

# Verify your prefix is advertised
show bgp ipv6 unicast 2001:db8::/32
```

## Conclusion

IPv6 BGP peering at IXPs follows the same principles as IPv4 but uses the exchange's IPv6 peering LAN. Always apply prefix-length filters, tag routes with communities for traffic engineering, and enable RPKI validation to reject invalid route origins. Most IXPs provide route servers that aggregate peering sessions, simplifying the operational overhead of maintaining individual peer sessions.
