# How to Understand BGP Path Selection for IPv4 Prefixes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, Networking, Routing, IPv4, Path Selection, FRR

Description: Understand BGP's multi-step path selection algorithm and how attributes like weight, local preference, AS path length, and MED determine which route is chosen.

## Introduction

When FRR receives multiple BGP paths to the same IPv4 prefix from different peers, it applies a best-path selection process to choose the single path it installs in the routing table. Understanding this process lets you engineer traffic flows precisely using BGP attributes.

## The BGP Path Selection Algorithm

FRR evaluates these criteria in order - the first differentiating criterion wins:

```text
0. Administrative distance (lower wins when comparing redistributed vs. aggregated/received routes)
1. Weight (highest wins - local to router only)
2. Local Preference (highest wins - propagated within AS)
3. Local route / locally originated (prefer local static, aggregate, or redistributed routes over received routes)
4. AS Path length (shortest wins)
5. Origin code (IGP < EGP < Incomplete)
6. MED / Multi-Exit Discriminator (lowest wins for routes received from the same neighboring AS)
7. eBGP over iBGP (prefer externally learned)
8. IGP cost to next-hop (lowest wins)
9. Multipath equality check (if enabled, equally preferred paths can all be installed)
10. Already-selected eBGP path (prefer the route already selected)
11. Router ID (lowest wins)
12. Cluster-list length (shortest wins)
13. Peer address (highest transport address wins - final tiebreaker)
```

## Viewing BGP Path Selection in FRR

```bash
# Show all paths for a prefix and which FRR selected as best

vtysh -c "show bgp ipv4 unicast 10.10.0.0/24"

# Example output:
# BGP routing table entry for 10.10.0.0/24
# Paths: (2 available, best #1)
#   Advertised to non peer-group peers: 10.0.0.2
#   65100
#     10.0.0.1 from 10.0.0.1 (10.0.0.1)
#       Origin IGP, metric 0, localpref 200, weight 0, valid, external, best
#   65200 65300
#     10.0.0.2 from 10.0.0.2 (10.0.0.2)
#       Origin IGP, metric 0, localpref 100, weight 0, valid, external
```

## Influencing Path Selection

### Local Preference (prefer outbound path)

```bash
# Set higher local preference for routes from preferred upstream
route-map PREFER-ISP1 permit 10
  set local-preference 200

route-map PREFER-ISP2 permit 10
  set local-preference 100

router bgp 65001
  address-family ipv4 unicast
    neighbor 203.0.113.1 route-map PREFER-ISP1 in  # ISP1 preferred
    neighbor 198.51.100.1 route-map PREFER-ISP2 in
  exit-address-family
```

### AS Path Prepending (influence inbound traffic)

```bash
# Prepend own AS to make this path less attractive to remote peers
route-map DEPREF-OUTBOUND permit 10
  set as-path prepend 65001 65001 65001

router bgp 65001
  address-family ipv4 unicast
    neighbor 198.51.100.1 route-map DEPREF-OUTBOUND out
  exit-address-family
```

### MED (influence which entry point a neighboring AS uses)

```bash
# Advertise lower MED on the preferred link to the same neighboring AS
route-map SET-MED-LOW permit 10
  set metric 100

route-map SET-MED-HIGH permit 10
  set metric 500

router bgp 65001
  address-family ipv4 unicast
    neighbor 203.0.113.1 route-map SET-MED-LOW out
    neighbor 203.0.113.5 route-map SET-MED-HIGH out
  exit-address-family
```

## Verifying the Selected Path

```bash
# Re-display the prefix to confirm which path FRR marked as best
vtysh -c "show bgp ipv4 unicast 10.10.0.0/24"

# Show BGP summary - number of prefixes and neighbor status
vtysh -c "show bgp summary"

# Show the installed route in the kernel routing table
ip route show 10.10.0.0/24
```

## Conclusion

BGP path selection is deliberate and attribute-driven. Local preference controls outbound preferences within your AS, AS path prepending signals inbound preferences to remote networks, and MED fine-tunes which entry points a neighboring AS prefers. Knowing the selection order lets you predict which path FRR will choose and configure attributes to achieve your traffic engineering goals.
