# How to Configure IPv6 Peering at Internet Exchange Points

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IXP, Peering, BGP, Internet Exchange, Routing

Description: Configure IPv6 BGP peering at Internet Exchange Points (IXPs) with route policies, community tagging, and peering best practices.

## IXP IPv6 Overview

Internet Exchange Points provide a shared switching fabric where multiple ISPs peer directly. IPv6 peering at an IXP:
- Uses an IXP-assigned IPv6 address on the peering LAN, typically from the exchange's shared /64
- eBGP sessions over IPv6 link-local or IXP-assigned addresses
- Avoids sending traffic for peered routes through a transit provider
- Can reduce path length and latency compared to indirect transit paths

## IXP Peering LAN Configuration

```bash
# Connect to IXP switch and configure interface

# IXP assigns you: 2001:db8:100::42/64

ip -6 addr add 2001:db8:100::42/64 dev eth-ixp

# Configure BGP peering with other IXP members
# Peer A has: 2001:db8:100::10 (AS65002)
# Peer B has: 2001:db8:100::20 (AS65003)
```

## FRR BGP Configuration for IXP

```bash
# /etc/frr/frr.conf - IPv6 BGP peering at IXP

router bgp 65001
  bgp router-id 1.1.1.1

  # Peer with AS65002 at IXP
  neighbor 2001:db8:100::10 remote-as 65002
  neighbor 2001:db8:100::10 description IXP_PEER_A
  neighbor 2001:db8:100::10 password peeringpassword

  # Peer with AS65003 at IXP
  neighbor 2001:db8:100::20 remote-as 65003
  neighbor 2001:db8:100::20 description IXP_PEER_B

  address-family ipv6 unicast
    # Activate peers for IPv6
    neighbor 2001:db8:100::10 activate
    neighbor 2001:db8:100::10 soft-reconfiguration inbound
    neighbor 2001:db8:100::10 route-map IXP_IMPORT in
    neighbor 2001:db8:100::10 route-map IXP_EXPORT out

    neighbor 2001:db8:100::20 activate
    neighbor 2001:db8:100::20 route-map IXP_IMPORT in
    neighbor 2001:db8:100::20 route-map IXP_EXPORT out

    # Advertise our prefix
    network 2001:db8:1000::/48
```

## Route Filtering for IXP Peering

```bash
# Best practice: filter what you accept and advertise at IXP

# Accept only legitimate prefixes (not default route, not bogons)
ipv6 prefix-list IXP_ACCEPT_IPV6 deny ::/0             # No default route
ipv6 prefix-list IXP_ACCEPT_IPV6 deny ::ffff:0:0/96    # No IPv4-mapped
ipv6 prefix-list IXP_ACCEPT_IPV6 deny fc00::/7         # No ULA
ipv6 prefix-list IXP_ACCEPT_IPV6 deny fe80::/10        # No link-local
ipv6 prefix-list IXP_ACCEPT_IPV6 permit 2000::/3 le 48 # Global unicast up to /48

# Only advertise our own prefix
ipv6 prefix-list IXP_ADVERTISE_IPV6 permit 2001:db8:1000::/48

route-map IXP_IMPORT permit 10
  match ipv6 address prefix-list IXP_ACCEPT_IPV6
  set local-preference 200  # Prefer IXP paths

route-map IXP_EXPORT permit 10
  match ipv6 address prefix-list IXP_ADVERTISE_IPV6
```

## IXP Route Server Peering

```bash
# Most IXPs provide a route server
# Peering with the route server enables multilateral peering with participating members, subject to policy

# Route Server AS: 65500 (IXP RS)
# Route Server IPv6: 2001:db8:100::1

neighbor 2001:db8:100::1 remote-as 65500
neighbor 2001:db8:100::1 description IXP_Route_Server

address-family ipv6 unicast
  neighbor 2001:db8:100::1 activate
  neighbor 2001:db8:100::1 soft-reconfiguration inbound
  neighbor 2001:db8:100::1 route-map IXP_IMPORT in
  neighbor 2001:db8:100::1 route-map IXP_EXPORT out
  # Route server typically does not prepend its own AS to AS_PATH
```

## Verifying IXP Peering

```bash
# Check BGP sessions
vtysh -c "show bgp ipv6 unicast summary"

# Inspect routes received from an IXP peer
vtysh -c "show bgp ipv6 unicast neighbors 2001:db8:100::10 received-routes"

# Check which routes use IXP paths
ip -6 route show | grep -c "via 2001:db8:100::"

# Traceroute to a host in a peer prefix to verify the IXP path is used
traceroute -6 2001:db8:2000::1
# Should show IXP hop instead of transit provider
```

## Conclusion

IPv6 peering at IXPs can reduce transit costs and improve latency by routing traffic directly between networks. Configure eBGP sessions to IXP peers using their IXP-assigned IPv6 addresses. Always implement strict route filtering: reject default routes, bogons, ULA, and prefixes longer than /48. Peer with the IXP route server for efficient multilateral peering with participating members. Set `local-preference 200` for IXP-learned routes to prefer them over transit (typically local-preference 100). Monitor BGP session state and route visibility with FRR's `show bgp ipv6 unicast summary`.
