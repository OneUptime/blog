# How to Configure BGP Soft Reconfiguration for Policy Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, Routing, Networking, Soft Reconfiguration, Policy, FRR, Cisco

Description: Learn how to configure BGP soft reconfiguration to apply routing policy changes without resetting BGP sessions and disrupting traffic.

---

When you modify BGP routing policies (route maps, prefix lists, communities), you need to re-evaluate your BGP table against the new policy. Hard reset (`clear ip bgp neighbor` or session restart) tears down the session and can disrupt traffic during reconvergence. Soft reset methods apply policy changes without breaking the BGP session.

## Why Soft Reconfiguration?

| Method | Effect | Disruption |
|--------|--------|------------|
| Hard reset | Tears down the BGP session | Yes - routes are withdrawn during reconvergence |
| Soft-in reset | Re-applies inbound policy | No - just re-evaluates received routes |
| Soft-out reset | Re-announces routes with new policy | No - just re-sends advertised routes |
| Route Refresh (RFC 2918) | Peer re-sends its routes | No - modern standard approach |

## Method 1: Route Refresh (Preferred - No Config Required)

Modern BGP implementations commonly negotiate Route Refresh automatically. No stored table needed.

```bash
# FRR (Linux) - Trigger inbound policy re-evaluation via Route Refresh

vtysh -c "clear bgp 10.0.0.2 in"

# Trigger outbound re-announcement
vtysh -c "clear bgp 10.0.0.2 soft out"

# Both directions
vtysh -c "clear bgp 10.0.0.2 soft"

# Address-family-specific form
vtysh -c "clear bgp ipv4 unicast 10.0.0.2 in"
```

## Method 2: Inbound Soft Reconfiguration (Stores Received Routes)

For peers that don't support Route Refresh, enable inbound soft reconfiguration to store all received routes.

```text
# FRR configuration (vtysh)
router bgp 65001
  neighbor 10.0.0.2 soft-reconfiguration inbound
```

This stores every route received from the neighbor before applying any inbound policy, allowing policy re-evaluation without requesting a new route table from the peer.

## Applying an Updated Inbound Policy

```text
# FRR example: update an inbound route map, then re-apply using stored routes
router bgp 65001
  address-family ipv4 unicast
    neighbor 10.0.0.2 route-map FILTER-IN in   ! Apply new route map

! Re-evaluate inbound routes with the new policy
do clear bgp 10.0.0.2 soft in
```

## Applying an Updated Outbound Policy

```text
router bgp 65001
  address-family ipv4 unicast
    neighbor 10.0.0.2 route-map ADVERTISE-OUT out

! Re-announce routes with the updated outbound policy
do clear bgp 10.0.0.2 soft out
```

## Cisco IOS Equivalent

```text
! Enable inbound soft reconfiguration
router bgp 65001
  neighbor 10.0.0.2 soft-reconfiguration inbound

! Re-apply inbound policy
clear ip bgp 10.0.0.2 soft in

! Re-apply outbound policy
clear ip bgp 10.0.0.2 soft out
```

## Verifying After Soft Reset

```bash
# Check BGP summary - session should remain Established
vtysh -c "show bgp ipv4 unicast summary"

# Verify the new policy is taking effect on advertised routes
vtysh -c "show bgp ipv4 unicast neighbor 10.0.0.2 advertised-routes"

# If soft-reconfiguration inbound is enabled, inspect the pre-policy routes received from the neighbor
vtysh -c "show bgp ipv4 unicast neighbor 10.0.0.2 received-routes"

# Check the BGP table for the expected prefixes
vtysh -c "show bgp ipv4 unicast 192.168.0.0/24"
```

## Key Takeaways

- Prefer a soft reset over a hard reset when changing BGP policies in production.
- Route Refresh (commonly negotiated on modern BGP sessions) is more efficient than `soft-reconfiguration inbound` because it doesn't store a separate inbound copy of routes.
- `soft-reconfiguration inbound` is needed for peers that don't support Route Refresh (RFC 2918).
- Verify the session remains `Established` in `show bgp ipv4 unicast summary` after a soft reset.
